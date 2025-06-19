const User = require('../models/User');
const Subscription = require('../models/Subscription');
const MusicGeneration = require('../models/MusicGeneration');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const musicGenService = require('../utils/metaMusicGenService');
const openaiService = require('../utils/openaiService'); // Keep for voice capabilities

// Flutterwave configuration (in a real project, use env variables)
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY || 'FLUTTERWAVE_PUBLIC_KEY';
const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY || 'FLUTTERWAVE_SECRET_KEY';
const FLUTTERWAVE_API_URL = 'https://api.flutterwave.com/v3';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir, { recursive: true });
} else {
    console.log(`Uploads directory exists: ${uploadsDir}`);
}

// Ensure voice upload directory exists
const voiceUploadDir = path.join(uploadsDir, 'voice');
if (!fs.existsSync(voiceUploadDir)) {
    console.log(`Creating voice uploads directory: ${voiceUploadDir}`);
    fs.mkdirSync(voiceUploadDir, { recursive: true });
} else {
    console.log(`Voice uploads directory exists: ${voiceUploadDir}`);
}

const apiController = {
    // User authentication
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            
            // Find the user
            const user = await User.findByEmail(email);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            
            // Compare passwords
            const isPasswordValid = await bcrypt.compare(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }
            
            // Set user session
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            };
            
            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
            
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    register: async (req, res) => {
        try {
            const { name, email, password } = req.body;
            
            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create new user
            const userId = await User.create({
                name,
                email,
                password: hashedPassword,
                role: 'user',
                createdAt: new Date()
            });
            
            // Create free trial subscription
            const trialDays = 7;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + trialDays);
            
            await Subscription.create({
                userId,
                planType: 'free_trial',
                startDate: new Date(),
                expiryDate,
                status: 'active',
                dailyLimit: 3, // Free trial daily limit
                createdAt: new Date()
            });
            
            // Set user session
            req.session.user = {
                id: userId,
                name,
                email,
                role: 'user'
            };
            
            res.status(201).json({
                success: true,
                message: 'Registration successful',
                user: {
                    id: userId,
                    name,
                    email,
                    role: 'user'
                }
            });
            
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // User profile
    getUserProfile: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const user = await User.findById(userId);
            
            // Remove sensitive information
            delete user.password;
            
            res.json({
                success: true,
                user
            });
        } catch (error) {
            console.error('Error fetching user profile:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // User subscription
    getUserSubscription: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const subscription = await Subscription.findByUserId(userId);
            
            // Get today's generation count
            const today = new Date().toISOString().split('T')[0];
            const generationsToday = await MusicGeneration.countByUserAndDate(userId, today);
            
            res.json({
                success: true,
                subscription,
                generationsToday,
                remainingGenerations: subscription.dailyLimit - generationsToday
            });
        } catch (error) {
            console.error('Error fetching user subscription:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },    // Music generation
    generateMusic: async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // Get subscription status from the Subscription model
            const subscriptionStatus = await Subscription.getUserStatus(userId);
            
            // Check if subscription is active
            if (!subscriptionStatus.active) {
                return res.status(403).json({
                    success: false,
                    message: 'No active subscription. Please subscribe to use music generation features.'
                });
            }
            
            // Check if user has reached daily limit
            if (subscriptionStatus.songsRemaining <= 0) {
                return res.status(403).json({
                    success: false,
                    message: `Daily song limit reached (${subscriptionStatus.songsLimit} songs). Please try again tomorrow or upgrade your plan.`
                });
            }
            
            // Get the type parameter from URL if present
            const type = req.params.type || req.body.type || 'instrumental';
              // Parse generation parameters
            let { audioData, audioFormat, genre, tempo, mood, duration } = req.body;
              // Handle audio file upload
            let audioPath = null;
            let uploadDir = null;
            
            // Different upload directories based on type
            if (type === 'vocals') {
                uploadDir = path.join(__dirname, '../uploads/voice');
            } else if (type === 'instrumental') {
                uploadDir = path.join(__dirname, '../uploads/instrumental');
            } else {
                uploadDir = path.join(__dirname, '../uploads/chorus');
            }
            
            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            console.log(`Processing audio for type: ${type}`);
            console.log(`Request body keys: ${Object.keys(req.body)}`);
            console.log(`Request has file: ${!!req.file}`);
            
            // Check if we're getting a file from multer
            if (req.file) {
                // Handle file upload from multer
                const fileId = uuidv4();
                const originalName = req.file.originalname || 'audio.wav';
                const fileExt = path.extname(originalName) || '.wav';
                const fileName = `${fileId}${fileExt}`;
                const fileDest = path.join(uploadDir, fileName);
                
                // Write the file
                try {
                    fs.writeFileSync(fileDest, req.file.buffer);
                    audioPath = `/uploads/${type}/${fileName}`;
                    console.log(`File uploaded to ${audioPath}`);
                } catch (fileError) {
                    console.error('Error saving audio file:', fileError);
                    return res.status(500).json({
                        success: false,
                        message: 'Server error: Could not save the uploaded file'
                    });
                }
            }
            // Handle base64 audio data
            else if (req.body.audioData) {
                const audioData = req.body.audioData;
                const fileId = uuidv4();
                const fileName = `${fileId}.${req.body.audioFormat || 'wav'}`;
                const fileDest = path.join(uploadDir, fileName);
                
                // Extract base64 data if needed
                let base64Data = audioData;
                if (audioData.includes('base64,')) {
                    base64Data = audioData.split('base64,')[1];
                }
                
                try {
                    fs.writeFileSync(fileDest, Buffer.from(base64Data, 'base64'));
                    audioPath = `/uploads/${type}/${fileName}`;
                    console.log(`Base64 data written to ${audioPath}`);
                } catch (fileError) {
                    console.error('Error saving audio file:', fileError);
                    return res.status(400).json({
                        success: false,
                        message: 'Could not process the audio data'
                    });
                }
            } else {
                console.log('No audio data provided in the request');
                return res.status(400).json({
                    success: false,
                    message: 'No audio data provided. Please upload an audio file or record your voice.'
                });
            }
            
            // Call OpenAI API to generate music
            // We're using a Promise-based approach to avoid blocking
            try {
                // Start a timer to track the process
                console.log(`Starting music generation process for user ${userId}`);
                const startTime = Date.now();                // Generate the music using Meta MusicGen
                const generatedMusic = await musicGenService.generateMusic(
                    { 
                        genre, 
                        tempo, 
                        mood, 
                        duration: parseInt(duration) || 8,
                        structure: req.body.structure || "verse-chorus"
                    },
                    audioPath  // For reference audio if needed
                );
                
                // If vocals are requested and we have a voice recording, use OpenAI for vocal generation
                let vocalsPath = null;
                if (req.body.includeVocals && audioPath) {
                    try {
                        vocalsPath = await openaiService.generateVocals(generatedMusic.beatPath, {
                            genre,
                            mood,
                            voiceType: req.body.voiceType || "nova",
                            referenceVoicePath: audioPath,
                            verses: req.body.verses || 1,
                            choruses: req.body.choruses || 1
                        });
                        
                        // Add vocals path to the generated music object
                        generatedMusic.vocalsPath = vocalsPath;
                    } catch (vocalError) {
                        console.error('Error generating vocals:', vocalError);
                        // Continue without vocals if there's an error
                    }
                }
                
                console.log(`Music generation completed in ${(Date.now() - startTime)/1000}s`);
                  // Log the generation in the database
                const generation = await MusicGeneration.create({
                    userId,
                    originalVoicePath: audioPath,
                    instrumentalPath: generatedMusic.instrumentalPath,
                    beatPath: generatedMusic.beatPath,
                    vocalsPath: generatedMusic.vocalsPath,
                    finalPath: generatedMusic.finalPath,
                    songStructure: req.body.structure || "verse-chorus",
                    numVerses: req.body.verses || 1,
                    hasChorus: req.body.choruses > 0,
                    bpm: tempo || 90,
                    parameters: { genre, tempo, mood, duration, voiceType: req.body.voiceType },
                    createdAt: new Date()
                });
                  res.json({
                    success: true,
                    message: 'Music generated successfully',
                    generation: {
                        id: generation.id,
                        beatPath: generatedMusic.beatPath,
                        vocalsPath: generatedMusic.vocalsPath,
                        finalPath: generatedMusic.finalPath,
                        musicPath: generatedMusic.finalPath, // For backward compatibility
                        parameters: { 
                            genre, 
                            tempo, 
                            mood, 
                            duration,
                            voiceType: req.body.voiceType,
                            structure: req.body.structure
                        }
                    }
                });
            } catch (apiError) {
                console.error('API Error generating music:', apiError);
                res.status(500).json({
                    success: false, 
                    message: 'Error generating music',
                    error: apiError.message
                });            }
        } catch (error) {
            console.error('Error generating music:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    // Get music history
    getMusicHistory: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const history = await MusicGeneration.findByUserId(userId);
            
            res.json({
                success: true,
                history
            });
        } catch (error) {
            console.error('Error fetching music history:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    // Get music details
    getMusicDetails: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const musicId = req.params.id;
            
            const music = await MusicGeneration.findById(musicId);
            
            if (!music || music.userId !== userId) {
                return res.status(404).json({
                    success: false,
                    message: 'Music not found'
                });
            }
            
            res.json({
                success: true,
                music
            });
        } catch (error) {
            console.error('Error fetching music details:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    // Payment integration with Flutterwave
    initiatePayment: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const { planType } = req.body;
            
            // Get user details
            const user = await User.findById(userId);
            
            // Get plan details from config
            const plans = require('../config/plans');
            const plan = plans.getPlanByType(planType);
            
            if (!plan) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan selected'
                });
            }
            
            // Create a transaction reference
            const txRef = `BENIX_${Date.now()}_${userId}`;
            
            // Create payment payload for Flutterwave
            const payload = {
                tx_ref: txRef,
                amount: plan.price,
                currency: 'USD',
                redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/verify`,
                payment_options: 'card',
                customer: {
                    email: user.email,
                    name: user.name
                },
                customizations: {
                    title: 'BenixSpace Music Subscription',
                    description: `Subscription to ${plan.name} plan`,
                    logo: `${process.env.APP_URL || 'http://localhost:3000'}/assets/logo.png`
                },
                meta: {
                    userId: userId,
                    planType: planType
                }
            };
            
            // In a real app, make an actual API request to Flutterwave
            // const response = await axios.post(`${FLUTTERWAVE_API_URL}/payments`, payload, {
            //     headers: {
            //         'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            //         'Content-Type': 'application/json'
            //     }
            // });
            
            // For demo purposes, simulate a successful response
            const simulatedResponse = {
                data: {
                    status: 'success',
                    message: 'Payment link created',
                    data: {
                        link: `${process.env.APP_URL || 'http://localhost:3000'}/api/payments/verify?tx_ref=${txRef}`
                    }
                }
            };
            
            res.json({
                success: true,
                message: 'Payment initiated',
                paymentUrl: simulatedResponse.data.data.link,
                txRef
            });
            
        } catch (error) {
            console.error('Error initiating payment:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },
    
    // Verify payment (webhook or redirect)
    verifyPayment: async (req, res) => {
        try {
            const { transaction_id, tx_ref } = req.query;
            
            // In a real app, verify the transaction with Flutterwave
            // const response = await axios.get(`${FLUTTERWAVE_API_URL}/transactions/${transaction_id}/verify`, {
            //     headers: {
            //         'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            //         'Content-Type': 'application/json'
            //     }
            // });
            
            // For demo purposes, simulate a successful response
            const userId = tx_ref.split('_')[2]; // Extract userId from tx_ref
            const planType = 'premium'; // This would come from the metadata in the real response
            
            // Update user subscription
            const plans = require('../config/plans');
            const plan = plans.getPlanByType(planType);
            
            // Calculate expiry date (1 month from now)
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            
            // Update or create subscription
            await Subscription.update(userId, {
                planType: planType,
                startDate: new Date(),
                expiryDate: expiryDate,
                status: 'active',
                dailyLimit: plan.dailyLimit,
                updatedAt: new Date()
            });
            
            // For API callbacks, return JSON
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.json({
                    success: true,
                    message: 'Payment verified successfully'
                });
            }
            
            // For browser redirects, redirect to dashboard
            res.redirect('/dashboard?payment=success');
            
        } catch (error) {
            console.error('Error verifying payment:', error);
            
            // For API callbacks, return JSON error
            if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                return res.status(500).json({ success: false, message: error.message });
            }
            
            // For browser redirects, redirect with error
            res.redirect('/dashboard?payment=failed');
        }
    },
    
    // Get payment history
    getPaymentHistory: async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // In a real app, you would query your payments table
            // For now, return a mock empty array
            res.json({
                success: true,
                history: []
            });
        } catch (error) {
            console.error('Error fetching payment history:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Upload audio file directly (new dedicated endpoint for file uploads)
     */
    uploadAudio: async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not authenticated'
                });
            }

            const userId = req.session.user.id;
            
            // Check if a file was uploaded
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No audio file provided'
                });
            }
            
            // Generate a unique filename
            const fileId = uuidv4();
            const fileExtension = req.file.originalname.split('.').pop() || 'wav';
            const filename = `${fileId}.${fileExtension}`;
            
            // Ensure the uploads directories exist
            const publicVoiceDir = path.join(uploadsDir, 'voice');
            const privateVoiceDir = path.join(__dirname, '../uploads/voice');
            
            if (!fs.existsSync(publicVoiceDir)) {
                fs.mkdirSync(publicVoiceDir, { recursive: true });
            }
            
            if (!fs.existsSync(privateVoiceDir)) {
                fs.mkdirSync(privateVoiceDir, { recursive: true });
            }
            
            // Save file to both public (for playback) and private (for processing) directories
            const publicFilePath = path.join(publicVoiceDir, filename);
            const privateFilePath = path.join(privateVoiceDir, filename);
            
            fs.writeFileSync(publicFilePath, req.file.buffer);
            fs.writeFileSync(privateFilePath, req.file.buffer);
            
            // Log the file paths
            console.log(`Audio file uploaded to public: ${publicFilePath}`);
            console.log(`Audio file uploaded to private: ${privateFilePath}`);
            
            // Generate response with relative paths
            const publicPath = `/uploads/voice/${filename}`;
            const privatePath = `/uploads/voice/${filename}`;
            
            res.json({
                success: true,
                message: 'Audio file uploaded successfully',
                filePath: publicPath, // Public path for playback
                processingPath: privatePath, // Path for backend processing
                filename: filename
            });
        } catch (error) {
            console.error('Error uploading audio file:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error uploading audio file: ' + error.message
            });
        }
    },
};

module.exports = apiController;
