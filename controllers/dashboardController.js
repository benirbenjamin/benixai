const Subscription = require('../models/Subscription');
const MusicGeneration = require('../models/MusicGeneration');
const AdminConfig = require('../models/AdminConfig');

/**
 * Get dashboard page with user info and recent music
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDashboard = async (req, res) => {
    try {
        // Get user's subscription status
        const subscription = await Subscription.getUserStatus(req.session.user.id);
        
        // Get user's recent music generations
        const recentMusic = await MusicGeneration.getByUser(req.session.user.id, 5);
        
        // Get admin system messages (if any)
        const config = await AdminConfig.getAll();
        const systemMessages = config.messages || {};
        
        // Render dashboard
        res.render('dashboard', {
            pageTitle: 'Dashboard',
            subscription,
            recentMusic,
            systemMessages
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', {
            pageTitle: 'Dashboard',
            messages: { error: 'Error loading dashboard data' },
            subscription: {
                active: false,
                plan: 'None',
                features: { vocal: false, instrumental: false, chorus: false },
                songsRemaining: 0
            },
            recentMusic: []
        });
    }
};
