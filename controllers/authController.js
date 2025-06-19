const User = require('../models/User');
const Subscription = require('../models/Subscription');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.registerUser = async (req, res) => {
    try {
        const { 
            email, 
            password, 
            confirmPassword, 
            firstName, 
            lastName, 
            phoneNumber 
        } = req.body;
        
        // Validate inputs
        if (!email || !password) {
            return res.render('register', { 
                pageTitle: 'Register',
                messages: { error: 'Please provide email and password' }
            });
        }
        
        // Check if passwords match
        if (password !== confirmPassword) {
            return res.render('register', { 
                pageTitle: 'Register',
                messages: { error: 'Passwords do not match' }
            });
        }
        
        // Check if user already exists
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.render('register', { 
                pageTitle: 'Register',
                messages: { error: 'Email already registered' }
            });
        }
          // Create user with additional fields
        const user = await User.create({ 
            email, 
            password,
            firstName,
            lastName,
            phoneNumber
        });
        
        // Create free trial subscription
        await Subscription.create({
            userId: user.id,
            plan: 'trial'
        });
        
        // Set user session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        
        // Redirect to dashboard
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', { 
            pageTitle: 'Register',
            messages: { error: 'Registration failed. Please try again.' }
        });
    }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validate inputs
        if (!email || !password) {
            return res.render('login', { 
                pageTitle: 'Login',
                messages: { error: 'Please provide email and password' }
            });
        }
        
        // Find user
        const user = await User.findByEmail(email);
        if (!user) {
            return res.render('login', { 
                pageTitle: 'Login',
                messages: { error: 'Invalid credentials' }
            });
        }
        
        // Compare passwords
        const isMatch = await User.comparePassword(password, user.password);
        if (!isMatch) {
            return res.render('login', { 
                pageTitle: 'Login',
                messages: { error: 'Invalid credentials' }
            });
        }
        
        // Set user session
        req.session.user = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        
        // Redirect to dashboard
        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', { 
            pageTitle: 'Login',
            messages: { error: 'Login failed. Please try again.' }
        });
    }
};

/**
 * Logout a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logoutUser = (req, res) => {
    // Clear the session
    req.session.destroy(() => {
        res.redirect('/login');
    });
};
