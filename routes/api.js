const express = require('express');
const router = express.Router();
const multer = require('multer');
const apiController = require('../controllers/apiController');
const { apiAuth, checkAuth } = require('../middleware/auth');

// Configure multer for memory storage (we'll process the files in the controller)
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        // Accept audio files only
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    }
});

// Public API endpoints
router.post('/auth/login', apiController.login);
router.post('/auth/register', apiController.register);

// Protected API endpoints - require authentication
router.use(apiAuth);

// User-related endpoints
router.get('/user', apiController.getUserProfile);
router.get('/user/subscription', apiController.getUserSubscription);

// Music generation endpoints
router.post('/music/generate', upload.single('audio'), apiController.generateMusic);
router.post('/music/generate/:type', upload.single('audio'), apiController.generateMusic);
router.post('/upload/audio', upload.single('audio'), apiController.uploadAudio);
router.get('/music/history', apiController.getMusicHistory);
router.get('/music/:id', apiController.getMusicDetails);

// Payment endpoints (Flutterwave integration)
router.post('/payments/initiate', apiController.initiatePayment);
router.post('/payments/verify', apiController.verifyPayment);
router.get('/payments/history', apiController.getPaymentHistory);

// Add route to generate AI music
router.post('/generate-music', checkAuth, async (req, res) => {
    try {
        // Get parameters from request
        const { genre, mood, complexity } = req.body;
        
        // Process any uploaded audio files (they will be in req.files if using multer array)
        
        // In a real implementation, you'd call your AI service here
        // For now, we'll simulate a response with a valid audio file
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Return a path to a real audio file that exists in your public directory
        res.json({
            success: true,
            trackUrl: '/demo-tracks/generated-track.mp3',
            trackId: `track-${Date.now()}`,
            details: {
                genre,
                mood,
                complexity,
                duration: 180, // 3 minutes in seconds
                format: 'mp3',
                bitrate: '320kbps'
            }
        });
    } catch (error) {
        console.error('Music generation error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate music',
            details: error.message
        });
    }
});

module.exports = router;
module.exports = router;
