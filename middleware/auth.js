/**
 * Authentication middleware
 * Check if user is logged in, and redirect to login if not
 */
exports.checkAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
};

/**
 * Admin middleware
 * Check if logged in user is an admin, and redirect to dashboard if not
 */
exports.checkAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/dashboard');
    }
    next();
};

/**
 * API authentication middleware
 * Check if user is authenticated for API requests
 * Responds with JSON error if not authenticated
 */
exports.apiAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    next();
};
