const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const { 
    getSubscriptionPage, 
    startFreeTrial, 
    subscribe, 
    verifyPayment,
    confirmPayment,
    cancelSubscription,
    choosePlan
} = require('../controllers/subscriptionController');

/**
 * @route   GET /subscription
 * @desc    Show subscription page
 * @access  Private
 */
router.get('/', checkAuth, getSubscriptionPage);

/**
 * @route   POST /subscription/trial
 * @desc    Start free trial
 * @access  Private
 */
router.post('/trial', checkAuth, startFreeTrial);

/**
 * @route   POST /subscription/subscribe
 * @desc    Subscribe to a plan (initiates Flutterwave payment)
 * @access  Private
 */
router.post('/subscribe', checkAuth, subscribe);

/**
 * @route   GET /subscription/verify-payment
 * @desc    Verify Flutterwave payment callback
 * @access  Private
 */
router.get('/verify-payment', checkAuth, verifyPayment);

/**
 * @route   POST /subscription/confirm
 * @desc    Confirm subscription payment
 * @access  Private
 */
router.post('/confirm', checkAuth, confirmPayment);

/**
 * @route   GET /subscription/choose/:plan
 * @desc    Choose a specific subscription plan
 * @access  Private
 */
router.get('/choose/:plan', checkAuth, choosePlan);

/**
 * @route   DELETE /subscription/:id
 * @desc    Cancel subscription
 * @access  Private
 */
router.delete('/:id', checkAuth, cancelSubscription);

module.exports = router;
