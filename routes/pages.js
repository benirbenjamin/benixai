const express = require('express');
const router = express.Router();

// Legal Pages
router.get('/terms', (req, res) => {
    res.render('terms', { title: 'Terms of Service' });
});

router.get('/privacy', (req, res) => {
    res.render('privacy', { title: 'Privacy Policy' });
});

router.get('/refund', (req, res) => {
    res.render('refund', { title: 'Refund Policy' });
});

router.get('/copyright', (req, res) => {
    res.render('copyright', { title: 'Copyright Policy' });
});

// Support Pages
router.get('/contact', (req, res) => {
    res.render('contact', { title: 'Contact Us' });
});

router.post('/contact', (req, res) => {
    // Here you would normally process the contact form submission
    // For now, just redirect back with a success message
    res.redirect('/contact?success=true');
});

router.get('/faq', (req, res) => {
    res.render('faq', { title: 'Frequently Asked Questions' });
});

router.get('/help', (req, res) => {
    res.render('help', { title: 'Help Center' });
});

router.get('/feedback', (req, res) => {
    res.render('feedback', { title: 'Feedback' });
});

router.post('/feedback', (req, res) => {
    // Here you would normally process the feedback submission
    // For now, just redirect back with a success message
    res.redirect('/feedback?success=true');
});

module.exports = router;
