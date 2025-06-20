const express = require('express');
const router = express.Router();
const recordController = require('../controllers/recordController');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept only audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(null, false);
            cb(new Error('Only audio files are allowed'));
        }
    }
});

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

// Upload audio file - supports both direct recording and file upload
router.post('/upload', upload.single('audioFile'), recordController.uploadAudio);

// Generate music with parameters
router.post('/generate', recordController.generateMusic);

// Get user's music history
router.get('/history', recordController.getMusicHistory);

// Get user's saved voice recordings
router.get('/saved-recordings', recordController.getSavedRecordings);

module.exports = router;
