const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const fs = require('fs');
const path = require('path');

// Get record page
router.get('/', async (req, res) => {
    try {
        // Set default subscription value if not available
        const subscription = req.session.subscription || { active: true };
        
        res.render('record', { 
            title: 'Record Your Vocals',
            subscription: subscription
        });
    } catch (error) {
        console.error('Error loading record page:', error);
        res.status(500).render('error', { error });
    }
});

// Upload audio file
router.post('/upload', recordController.uploadAudio);

// Generate music with parameters
router.post('/generate', recordController.generateMusic);

// Get user's music history
router.get('/history', recordController.getMusicHistory);

module.exports = router;
