const User = require('../models/User');
const Subscription = require('../models/Subscription');
const MusicGeneration = require('../models/MusicGeneration');
const AdminConfig = require('../models/AdminConfig');
const plans = require('../config/plans');

const adminController = {
    // Get admin dashboard
    getAdminDashboard: async (req, res) => {
        try {
            // Get counts for dashboard stats
            const userCount = await User.count();
            const activePremiumCount = await Subscription.countByType('premium');
            const activeStandardCount = await Subscription.countByType('standard');
            const activeBasicCount = await Subscription.countByType('basic');
            const freeTrialCount = await Subscription.countByType('free_trial');
            
            // Get today's generation count
            const today = new Date().toISOString().split('T')[0];
            const generationsToday = await MusicGeneration.countByDate(today);
            
            // Get system configuration
            const configData = await AdminConfig.getAll();
            
            // Transform config to match template expectations
            const config = {
                prices: configData.plan_prices || {
                    basic: 5,
                    standard: 10,
                    premium: 20
                },
                limits: configData.song_limits || {
                    basic: 2,
                    standard: 5,
                    premium: 999 // Infinity doesn't display well in inputs
                },
                features: {
                    basic: { vocal: true, instrumental: true, chorus: true },
                    standard: { vocal: true, instrumental: true, chorus: true },
                    premium: { vocal: true, instrumental: true, chorus: true }
                },
                freeTrialDays: configData.free_trial_days || 14,
                maintenanceMode: configData.maintenance_mode === 'true',
                // API configuration defaults
                api: {
                    vocal: {
                        enabled: configData.api_vocal_enabled === 'true',
                        url: configData.api_vocal_url || '',
                        key: configData.api_vocal_key || ''
                    },
                    instrumental: {
                        enabled: configData.api_instrumental_enabled === 'true',
                        url: configData.api_instrumental_url || '',
                        key: configData.api_instrumental_key || ''
                    },
                    chorus: {
                        enabled: configData.api_chorus_enabled === 'true',
                        url: configData.api_chorus_url || '',
                        key: configData.api_chorus_key || ''
                    },
                    maintenanceMode: configData.api_maintenance_mode === 'true',
                    timeout: configData.api_timeout || 60
                }
            };
            
            // Calculate stats for the admin dashboard
            const totalActiveSubscriptions = activePremiumCount + activeStandardCount + activeBasicCount + freeTrialCount;
            
            // Calculate subscription distribution percentages
            let planDistribution = {
                basic: 0,
                standard: 0,
                premium: 0,
                free_trial: 0
            };
            
            if (totalActiveSubscriptions > 0) {
                planDistribution = {
                    basic: Math.round((activeBasicCount / totalActiveSubscriptions) * 100),
                    standard: Math.round((activeStandardCount / totalActiveSubscriptions) * 100),
                    premium: Math.round((activePremiumCount / totalActiveSubscriptions) * 100),
                    free_trial: Math.round((freeTrialCount / totalActiveSubscriptions) * 100)
                };
            }
            
            // Estimated revenue (simplified calculation)
            // In a real app, you'd get this from your payment processor reports
            const estimatedRevenue = (activePremiumCount * config.prices.premium) + 
                                   (activeStandardCount * config.prices.standard) + 
                                   (activeBasicCount * config.prices.basic);
            
            res.render('admin', {
                stats: {
                    userCount,
                    activePremiumCount,
                    activeStandardCount,
                    activeBasicCount,
                    freeTrialCount,
                    generationsToday,
                    totalUsers: userCount,
                    activeSubscriptions: totalActiveSubscriptions,
                    songsToday: generationsToday,
                    totalRevenue: estimatedRevenue,
                    planDistribution,
                    planCounts: {
                        basic: activeBasicCount,
                        standard: activeStandardCount,
                        premium: activePremiumCount,
                        free_trial: freeTrialCount
                    }
                },
                config,
                plans: plans.getAllPlans(),
                title: 'Admin Dashboard'
            });
            
        } catch (error) {
            console.error('Error loading admin dashboard:', error);
            res.status(500).render('error', { error });
        }
    },

    // Get all users
    getUsers: async (req, res) => {
        try {
            const users = await User.findAll();
            
            // Format users with subscription data
            const usersWithSubscriptions = await Promise.all(users.map(async (user) => {
                const subscription = await Subscription.findByUserId(user.id);
                return {
                    ...user,
                    subscription
                };
            }));
            
            res.json({
                success: true,
                users: usersWithSubscriptions
            });
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get user details
    getUserDetails: async (req, res) => {
        try {
            const userId = req.params.id;
            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Get user's subscription
            const subscription = await Subscription.findByUserId(userId);
            
            // Get user's music generations
            const generations = await MusicGeneration.findByUserId(userId);
            
            res.json({
                success: true,
                user,
                subscription,
                generations
            });
        } catch (error) {
            console.error('Error fetching user details:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update user subscription (admin action)
    updateUserSubscription: async (req, res) => {
        try {
            const userId = req.params.id;
            const { planType, expiryDate } = req.body;
            
            // Check if user exists
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Update subscription
            await Subscription.update(userId, {
                planType,
                expiryDate: new Date(expiryDate),
                updatedAt: new Date()
            });
            
            res.json({
                success: true,
                message: 'Subscription updated successfully'
            });
        } catch (error) {
            console.error('Error updating user subscription:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get plans
    getPlans: async (req, res) => {
        try {
            const allPlans = plans.getAllPlans();
            res.json({
                success: true,
                plans: allPlans
            });
        } catch (error) {
            console.error('Error fetching plans:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update plan
    updatePlan: async (req, res) => {
        try {
            const { planId, name, price, dailyLimit, features } = req.body;
            
            plans.updatePlan(planId, {
                name,
                price,
                dailyLimit,
                features
            });
            
            res.json({
                success: true,
                message: 'Plan updated successfully'
            });
        } catch (error) {
            console.error('Error updating plan:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Create new plan
    createPlan: async (req, res) => {
        try {
            const { name, price, dailyLimit, features } = req.body;
            
            const newPlan = plans.createPlan({
                name,
                price,
                dailyLimit,
                features
            });
            
            res.json({
                success: true,
                message: 'Plan created successfully',
                plan: newPlan
            });
        } catch (error) {
            console.error('Error creating plan:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Delete plan
    deletePlan: async (req, res) => {
        try {
            const planId = req.params.id;
            
            plans.deletePlan(planId);
            
            res.json({
                success: true,
                message: 'Plan deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting plan:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get system configuration
    getSystemConfig: async (req, res) => {
        try {
            const config = await AdminConfig.getAll();
            
            res.json({
                success: true,
                config
            });
        } catch (error) {
            console.error('Error fetching system config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Update system configuration
    updateSystemConfig: async (req, res) => {
        try {
            const { configKey, configValue } = req.body;
            
            await AdminConfig.set(configKey, configValue);
            
            res.json({
                success: true,
                message: 'Configuration updated successfully'
            });
        } catch (error) {
            console.error('Error updating system config:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get music generations report
    getMusicGenerations: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            
            let generations;
            if (startDate && endDate) {
                generations = await MusicGeneration.findByDateRange(startDate, endDate);
            } else {
                // Default to last 7 days if no range specified
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - 7);
                
                generations = await MusicGeneration.findByDateRange(
                    startDate.toISOString().split('T')[0],
                    endDate.toISOString().split('T')[0]
                );
            }
            
            // Group by date for chart data
            const generationsByDate = generations.reduce((acc, gen) => {
                const date = gen.createdAt.split('T')[0];
                if (!acc[date]) acc[date] = 0;
                acc[date]++;
                return acc;
            }, {});
            
            res.json({
                success: true,
                generations,
                generationsByDate
            });
        } catch (error) {
            console.error('Error fetching generations report:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Admin users page (UI)
    getUsersPage: async (req, res) => {
        try {
            const users = await User.getAll();
            
            // Format users with subscription data
            const usersWithSubscriptions = await Promise.all(users.map(async (user) => {
                const subscription = await Subscription.findByUserId(user.id);
                return {
                    ...user,
                    subscription
                };
            }));
            
            res.render('admin-users', {
                users: usersWithSubscriptions,
                title: 'User Management'
            });
        } catch (error) {
            console.error('Error fetching users page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Admin reports page
    getReportsPage: async (req, res) => {
        try {
            // Get report data for the last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Get generation data by date
            const generations = await MusicGeneration.findByDateRange(startDateStr, endDateStr);
            
            // Group by date for chart data
            const generationsByDate = generations.reduce((acc, gen) => {
                const date = new Date(gen.created_at).toISOString().split('T')[0];
                if (!acc[date]) acc[date] = 0;
                acc[date]++;
                return acc;
            }, {});
            
            // Format for chart display
            const chartLabels = [];
            const chartData = [];
            
            // Fill in all dates in range
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                chartLabels.push(dateStr);
                chartData.push(generationsByDate[dateStr] || 0);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            res.render('admin-reports', {
                chartLabels: JSON.stringify(chartLabels),
                chartData: JSON.stringify(chartData),
                totalGenerations: generations.length,
                title: 'System Reports'
            });
        } catch (error) {
            console.error('Error fetching reports page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Admin logs page
    getLogsPage: async (req, res) => {
        try {
            // This would typically fetch logs from a database or log files
            // For now we'll just show placeholder data
            const logs = [
                { timestamp: new Date(), level: 'INFO', message: 'System started', source: 'app.js' },
                { timestamp: new Date(), level: 'INFO', message: 'User login', source: 'authController.js' },
                { timestamp: new Date(), level: 'WARNING', message: 'Failed login attempt', source: 'authController.js' },
                { timestamp: new Date(), level: 'ERROR', message: 'API connection failed', source: 'apiController.js' }
            ];
            
            res.render('admin-logs', {
                logs,
                title: 'System Logs'
            });
        } catch (error) {
            console.error('Error fetching logs page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Admin messages page
    getMessagesPage: async (req, res) => {
        try {
            // This would typically fetch user messages/communications from a database
            // For now we'll just show placeholder data
            const messages = [
                { id: 1, userId: 1, email: 'user@example.com', subject: 'Account Question', status: 'Unread', date: new Date() },
                { id: 2, userId: 2, email: 'another@example.com', subject: 'Payment Issue', status: 'Read', date: new Date() },
                { id: 3, userId: 3, email: 'third@example.com', subject: 'Feature Request', status: 'Replied', date: new Date() }
            ];
            
            res.render('admin-messages', {
                messages,
                title: 'User Messages'
            });
        } catch (error) {
            console.error('Error fetching messages page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Admin plans config page
    getPlansConfigPage: async (req, res) => {
        try {
            const allPlans = plans.getAllPlans();
            const config = await AdminConfig.getAll();
            
            res.render('admin-plans', {
                plans: allPlans,
                config,
                title: 'Subscription Plans Configuration'
            });
        } catch (error) {
            console.error('Error fetching plans config page:', error);
            res.status(500).render('error', { error });
        }
    },
      // Admin API config page
    getApiConfigPage: async (req, res) => {
        try {
            const config = await AdminConfig.getAll();
            
            // Transform config to match template expectations
            const transformedConfig = {
                api: {
                    vocal: {
                        enabled: process.env.OPENAI_API_KEY ? true : (config.api_vocal_enabled === 'true'),
                        url: config.api_vocal_url || '',
                        key: process.env.OPENAI_API_KEY ? 'Configured in .env' : (config.api_vocal_key || '')
                    },
                    instrumental: {
                        enabled: process.env.STABILITY_API_KEY ? true : (config.api_instrumental_enabled === 'true'),
                        url: process.env.STABILITY_API_URL || config.api_instrumental_url || '',
                        key: process.env.STABILITY_API_KEY ? 'Configured in .env' : (config.api_instrumental_key || '')
                    },
                    chorus: {
                        enabled: config.api_chorus_enabled === 'true',
                        url: config.api_chorus_url || '',
                        key: config.api_chorus_key || ''
                    },
                    maintenanceMode: config.api_maintenance_mode === 'true',
                    timeout: parseInt(config.api_timeout || '60')
                },
                // Include environment variables status to show admin what's configured
                env: {
                    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured',
                    STABILITY_API_KEY: process.env.STABILITY_API_KEY ? 'Configured' : 'Not configured',
                    STABILITY_API_URL: process.env.STABILITY_API_URL || 'Not configured'
                }
            };
            
            res.render('admin-api', {
                config: transformedConfig,
                title: 'API Configuration',
                envConfigured: !!(process.env.OPENAI_API_KEY || process.env.STABILITY_API_KEY)
            });
        } catch (error) {
            console.error('Error fetching API config page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Admin payments page
    getPaymentsPage: async (req, res) => {
        try {
            // This would typically fetch payment data from your payment processor or database
            // For now we'll just show placeholder data
            const payments = [
                { id: 'txn_001', userId: 1, email: 'user@example.com', plan: 'premium', amount: 20.00, status: 'completed', date: new Date() },
                { id: 'txn_002', userId: 2, email: 'another@example.com', plan: 'standard', amount: 10.00, status: 'completed', date: new Date() },
                { id: 'txn_003', userId: 3, email: 'third@example.com', plan: 'basic', amount: 5.00, status: 'failed', date: new Date() }
            ];
            
            res.render('admin-payments', {
                payments,
                title: 'Payment History'
            });
        } catch (error) {
            console.error('Error fetching payments page:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Update API configuration
    updateApiConfig: async (req, res) => {
        try {
            const {
                api_vocal_enabled,
                api_vocal_url,
                api_vocal_key,
                api_instrumental_enabled,
                api_instrumental_url,
                api_instrumental_key,
                api_chorus_enabled,
                api_chorus_url,
                api_chorus_key,
                api_maintenance_mode,
                api_timeout
            } = req.body;
            
            // Update the configurations
            await AdminConfig.set('api_vocal_enabled', api_vocal_enabled === 'on' ? 'true' : 'false');
            await AdminConfig.set('api_vocal_url', api_vocal_url);
            await AdminConfig.set('api_vocal_key', api_vocal_key);
            
            await AdminConfig.set('api_instrumental_enabled', api_instrumental_enabled === 'on' ? 'true' : 'false');
            await AdminConfig.set('api_instrumental_url', api_instrumental_url);
            await AdminConfig.set('api_instrumental_key', api_instrumental_key);
            
            await AdminConfig.set('api_chorus_enabled', api_chorus_enabled === 'on' ? 'true' : 'false');
            await AdminConfig.set('api_chorus_url', api_chorus_url);
            await AdminConfig.set('api_chorus_key', api_chorus_key);
            
            await AdminConfig.set('api_maintenance_mode', api_maintenance_mode === 'on' ? 'true' : 'false');
            await AdminConfig.set('api_timeout', api_timeout);
            
            req.flash('success', 'API configuration updated successfully');
            res.redirect('/admin/config/api');
        } catch (error) {
            console.error('Error updating API config:', error);
            req.flash('error', error.message);
            res.redirect('/admin/config/api');
        }
    },
    
    // Update plans configuration
    updatePlansConfig: async (req, res) => {
        try {
            const {
                basic_price, basic_limit,
                standard_price, standard_limit,
                premium_price, premium_limit
            } = req.body;
            
            // Update the plan prices
            const planPrices = {
                basic: parseFloat(basic_price) || 5.00,
                standard: parseFloat(standard_price) || 10.00,
                premium: parseFloat(premium_price) || 20.00
            };
            
            // Update the song limits
            const songLimits = {
                basic: parseInt(basic_limit) || 2,
                standard: parseInt(standard_limit) || 5,
                premium: parseInt(premium_limit) || 999
            };
            
            await AdminConfig.set('plan_prices', planPrices);
            await AdminConfig.set('song_limits', songLimits);
            
            req.flash('success', 'Plan configuration updated successfully');
            res.redirect('/admin/config/plans');
        } catch (error) {
            console.error('Error updating plans config:', error);
            req.flash('error', error.message);
            res.redirect('/admin/config/plans');
        }
    }
};

module.exports = adminController;
