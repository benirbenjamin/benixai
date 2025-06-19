const express = require('express');
const router = express.Router();
const { getDashboard } = require('../controllers/dashboardController');
const { checkAuth } = require('../middleware/auth');

/**
 * @route   GET /dashboard
 * @desc    Show user dashboard
 * @access  Private
 */
router.get('/', checkAuth, getDashboard);

module.exports = router;
