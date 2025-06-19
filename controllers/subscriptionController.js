const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { plans, freeTrial } = require('../config/plans');
const Flutterwave = require('flutterwave-node-v3');

// Initialize Flutterwave
const flw = new Flutterwave(
    process.env.FLW_PUBLIC_KEY, 
    process.env.FLW_SECRET_KEY
);

/**
 * Subscription Controller
 */
const subscriptionController = {
    /**
     * Get subscription page
     */
    getSubscriptionPage: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const user = await User.findById(userId);
            const subscription = await Subscription.getActiveByUserId(userId);
              // Get admin config for plan prices (if customized)
            const AdminConfig = require('../models/AdminConfig');
            const planPricesConfig = await AdminConfig.get('plan_prices');
            
            // Use admin configured prices if available, otherwise use default prices
            let planPrices = {};
            if (planPricesConfig) {
                try {
                    planPrices = JSON.parse(planPricesConfig.config_value);
                } catch (e) {
                    console.error('Error parsing plan prices config:', e);
                }
            }
            
            // Combine plans with custom prices
            const plansWithPrices = Object.entries(plans).map(([id, plan]) => {
                return {
                    ...plan,
                    price: planPrices[id] || plan.price
                };
            });
              res.render('subscription', {
                user,
                subscription: subscription || { active: false },
                plans: plansWithPrices,
                freeTrial,
                req: {
                    query: req.query
                }
            });
        } catch (error) {
            console.error('Error loading subscription page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    /**
     * Start free trial
     */
    startFreeTrial: async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // Check if user already has an active subscription
            const activeSubscription = await Subscription.getActiveByUserId(userId);
            if (activeSubscription) {
                return res.redirect('/subscription?error=already_subscribed');
            }
            
            // Check if user has already used their free trial
            const hasUsedTrial = await Subscription.hasUserUsedTrial(userId);
            if (hasUsedTrial) {
                return res.redirect('/subscription?error=trial_used');
            }
            
            // Create free trial subscription
            await Subscription.create({
                userId,
                plan: 'trial',
                amount: 0,
                transactionId: null
            });
            
            res.redirect('/dashboard?success=trial_started');
        } catch (error) {
            console.error('Error starting free trial:', error);
            res.status(500).render('error', { error });
        }
    },
      /**
     * Generate Flutterwave payment link
     */
    subscribe: async (req, res) => {
        try {
            const { plan, duration } = req.body;
            const userId = req.session.user.id;
            const user = await User.findById(userId);
            
            // Validate plan and duration
            if (!plans[plan]) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan selected'
                });
            }
            
            if (!['1', '3', '6', '9', '12'].includes(duration)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid subscription duration'
                });
            }
            
            // Get price from admin config or default
            const AdminConfig = require('../models/AdminConfig');
            const planPricesConfig = await AdminConfig.get('plan_prices');
            let basePrice = plans[plan].price;
            
            if (planPricesConfig) {
                try {
                    const planPrices = JSON.parse(planPricesConfig.config_value);
                    basePrice = planPrices[plan] || basePrice;
                } catch (e) {
                    console.error('Error parsing plan prices:', e);
                }
            }
            
            // Calculate price based on duration and apply discount
            let months = parseInt(duration);
            let totalPrice = basePrice * months;
            let discount = 0;
            
            // Apply discounts based on subscription length
            if (months === 12) {
                discount = 0.2; // 20% discount for 12 months
                totalPrice = totalPrice * 0.8;
            } else if (months === 9) {
                discount = 0.15; // 15% discount for 9 months
                totalPrice = totalPrice * 0.85;
            } else if (months === 6) {
                discount = 0.1; // 10% discount for 6 months
                totalPrice = totalPrice * 0.9;
            } else if (months === 3) {
                discount = 0.05; // 5% discount for 3 months
                totalPrice = totalPrice * 0.95;
            }
            
            // Generate transaction reference
            const txRef = 'BenixSpace-' + Date.now() + '-' + userId;

            // Store transaction in session to verify later
            req.session.pendingSubscription = {
                plan,
                duration: months,
                amount: totalPrice,
                txRef,
                timestamp: Date.now()
            };
            
            // Create Flutterwave payment payload
            const payload = {
                tx_ref: txRef,
                amount: totalPrice.toFixed(2),
                currency: "USD",
                redirect_url: `${req.protocol}://${req.get('host')}/subscription/verify-payment`,
                customer: {
                    email: user.email,
                    name: user.first_name + ' ' + (user.last_name || '')
                },
                customizations: {
                    title: "BenixSpace Subscription",
                    description: `${plans[plan].name} Plan - ${months} Month${months > 1 ? 's' : ''} Subscription`,
                    logo: `${req.protocol}://${req.get('host')}/assets/logo.png`
                },
                meta: {
                    plan_id: plan,
                    duration: months,
                    user_id: userId
                }
            };

            try {
                // Create payment link using Flutterwave SDK
                const response = await flw.Charge.initialize(payload);
                
                if (response.status === 'success') {
                    // Return payment link to client
                    return res.status(200).json({
                        success: true,
                        paymentLink: response.data.link,
                        message: `Redirecting to payment for ${plans[plan].name} plan for ${months} month${months > 1 ? 's' : ''}`
                    });
                } else {
                    throw new Error('Failed to generate payment link');
                }
            } catch (flwError) {
                console.error('Flutterwave Error:', flwError);
                return res.status(500).json({
                    success: false,
                    message: 'Payment gateway error. Please try again later.'
                });
            }
        } catch (error) {
            console.error('Error processing subscription:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Verify payment from Flutterwave
     */
    verifyPayment: async (req, res) => {
        try {
            const { status, tx_ref, transaction_id } = req.query;
            
            // Check if there's a pending subscription in the session
            if (!req.session.pendingSubscription || req.session.pendingSubscription.txRef !== tx_ref) {
                return res.redirect('/subscription?error=invalid_transaction');
            }
            
            // Verify the transaction with Flutterwave
            try {
                const response = await flw.Transaction.verify({ id: transaction_id });
                
                if (
                    response.status === 'success' && 
                    response.data.status === 'successful' && 
                    response.data.tx_ref === tx_ref &&
                    response.data.amount >= req.session.pendingSubscription.amount
                ) {
                    // Payment was successful, create subscription
                    const { plan, duration, amount } = req.session.pendingSubscription;
                    const userId = req.session.user.id;
                    
                    // Create subscription with the correct duration
                    const now = new Date();
                    const expiry = new Date(now);
                    expiry.setMonth(expiry.getMonth() + duration);
                    
                    await Subscription.createWithDuration({
                        userId,
                        plan,
                        amount,
                        duration,
                        transactionId: transaction_id,
                        startedAt: now,
                        expiresAt: expiry
                    });
                    
                    // Clear pending subscription from session
                    delete req.session.pendingSubscription;
                    
                    // Redirect to dashboard with success message
                    return res.redirect('/dashboard?success=subscribed');
                } else {
                    // Payment verification failed
                    console.error('Payment verification failed:', response);
                    return res.redirect('/subscription?error=payment_verification_failed');
                }
            } catch (flwError) {
                console.error('Flutterwave verification error:', flwError);
                return res.redirect('/subscription?error=payment_verification_error');
            }
        } catch (error) {
            console.error('Error verifying payment:', error);
            return res.redirect('/subscription?error=server_error');
        }
    },
    
    /**
     * Confirm subscription payment (for backward compatibility)
     */
    confirmPayment: async (req, res) => {
        try {
            const { txRef, status } = req.body;
            
            if (!req.session.pendingSubscription || req.session.pendingSubscription.txRef !== txRef) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid transaction reference'
                });
            }
            
            if (status !== 'successful') {
                return res.status(400).json({
                    success: false,
                    message: 'Payment was not successful'
                });
            }
            
            const { plan, duration, amount } = req.session.pendingSubscription;
            const userId = req.session.user.id;
            
            // Create subscription with the correct duration
            const now = new Date();
            const expiry = new Date(now);
            expiry.setMonth(expiry.getMonth() + duration);
            
            const subscription = await Subscription.createWithDuration({
                userId,
                plan,
                amount,
                duration,
                transactionId: txRef,
                startedAt: now,
                expiresAt: expiry
            });
            
            // Clear pending subscription from session
            delete req.session.pendingSubscription;
            
            res.status(200).json({
                success: true,
                subscription,
                message: `Successfully subscribed to ${plans[plan].name} plan for ${duration} month${duration > 1 ? 's' : ''}!`
            });
        } catch (error) {
            console.error('Error confirming payment:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },
    
    /**
     * Cancel subscription
     */
    cancelSubscription: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { id } = req.params;
            
            // Get the subscription
            const subscription = await Subscription.getById(id);
            
            // Check if subscription exists and belongs to the user
            if (!subscription || subscription.user_id !== userId) {
                return res.status(404).json({
                    success: false,
                    message: 'Subscription not found'
                });
            }
            
            // Cancel the subscription
            await Subscription.cancel(id);
            
            res.status(200).json({
                success: true,
                message: 'Subscription cancelled successfully'
            });
        } catch (error) {
            console.error('Error cancelling subscription:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    },

    /**
     * Choose a specific plan directly from URL
     */
    choosePlan: async (req, res) => {
        try {
            const { plan } = req.params;
            
            if (!plans[plan]) {
                return res.redirect('/subscription?error=invalid_plan');
            }
            
            // Redirect to subscription page with plan preselected
            res.redirect(`/subscription?plan=${plan}`);
        } catch (error) {
            console.error('Error choosing plan:', error);
            res.status(500).render('error', { error });
        }
    }
};

module.exports = subscriptionController;
