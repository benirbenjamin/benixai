const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser } = require('../controllers/authController');

/**
 * @route   GET /login
 * @desc    Show login page
 * @access  Public
 */
router.get('/login', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { pageTitle: 'Login' });
});

/**
 * @route   POST /login
 * @desc    Login a user
 * @access  Public
 */
router.post('/login', loginUser);

/**
 * @route   GET /register
 * @desc    Show registration page
 * @access  Public
 */
router.get('/register', (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', { pageTitle: 'Register' });
});

/**
 * @route   POST /register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerUser);

/**
 * @route   GET /logout
 * @desc    Logout a user
 * @access  Private
 */
router.get('/logout', logoutUser);

module.exports = router;
