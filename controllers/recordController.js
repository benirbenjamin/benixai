const User = require('../models/User');
const Subscription = require('../models/Subscription');
const MusicGeneration = require('../models/MusicGeneration');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const musicServiceManager = require('../utils/musicServiceManager');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const recordController = {
    // Get record page
    getRecordPage: async (req, res) => {
        try {
            const userId = req.session.user.id;
            // Get user subscription details
            const subscription = await Subscription.getActiveByUserId(userId);
            const user = await User.findById(userId);
            
            // Get today's generation count
            const today = new Date().toISOString().split('T')[0];
            const generationsToday = await MusicGeneration.countByUserAndDate(userId, today);
            // Get subscription plan details
            const { plans, freeTrial } = require('../config/plans');
              // Get daily limit based on subscription plan and set subscription features
            let dailyLimit = 0;
            let subscriptionData = {
                active: false,
                plan: 'none',
                features: {
                    vocal: false,
                    instrumental: false,
                    chorus: false
                },
                songsLimit: 0,
                songsRemaining: 0
            };
            
            if (subscription) {
                subscriptionData.active = true;
                subscriptionData.plan = subscription.plan;
                
                if (subscription.plan === 'trial') {
                    dailyLimit = freeTrial.dailySongLimit;
                    // Set trial features
                    subscriptionData.features = {
                        vocal: true,
                        instrumental: false,
                        chorus: false
                    };
                } else {
                    const planConfig = plans[subscription.plan];
                    if (planConfig) {
                        dailyLimit = planConfig.dailySongLimit;
                        subscriptionData.features = planConfig.features;
                    }
                }
                
                subscriptionData.songsLimit = dailyLimit;
                subscriptionData.songsRemaining = Math.max(0, dailyLimit - generationsToday);
            } else {
                // Set free plan limits (no active subscription)
                dailyLimit = 0;
                subscriptionData.songsLimit = 0;
                subscriptionData.songsRemaining = 0;
            }

            res.render('record', {
                user,
                subscription: subscriptionData,
                generationsToday,
                remainingGenerations: Math.max(0, dailyLimit - generationsToday)
            });
        } catch (error) {
            console.error('Error loading record page:', error);
            res.status(500).render('error', { error });
        }
    },    // Upload audio file
    uploadAudio: async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // Check if we're receiving base64 data or a file upload
            if (req.body.audioData) {
                // Handle base64 audio data
                const audioData = req.body.audioData.split(';base64,').pop();
                const fileId = uuidv4();
                
                // Ensure directory exists
                const voiceDir = path.join(__dirname, '../uploads/voice');
                if (!fs.existsSync(voiceDir)) {
                    fs.mkdirSync(voiceDir, { recursive: true });
                }
                
                // Save to uploads/voice directory for actual processing
                const voiceFilePath = path.join(voiceDir, `${fileId}.wav`);
                fs.writeFileSync(voiceFilePath, Buffer.from(audioData, 'base64'));
                
                // Also save a copy to public/uploads for preview
                const publicFilePath = path.join(uploadsDir, `${fileId}.wav`);
                fs.writeFileSync(publicFilePath, Buffer.from(audioData, 'base64'));
                
                console.log(`Audio saved to: ${voiceFilePath} and ${publicFilePath}`);
                
                return res.json({
                    success: true,
                    message: 'Audio uploaded successfully',
                    filePath: `/uploads/${fileId}.wav`,
                    processingPath: `/uploads/voice/${fileId}.wav`
                });
            } else {
                // Handle file upload (would need multer middleware configured)
                return res.status(400).json({
                    success: false,
                    message: 'No audio data provided'
                });
            }
        } catch (error) {
            console.error('Error uploading audio:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Generate music
    generateMusic: async (req, res) => {
        try {
            const userId = req.session.user.id;
            
            // Get subscription status
            const subscription = await Subscription.findByUserId(userId);
            
            // Check if user has reached daily limit
            const today = new Date().toISOString().split('T')[0];
            const generationsToday = await MusicGeneration.countByUserAndDate(userId, today);
            
            if (generationsToday >= subscription.dailyLimit) {
                return res.status(403).json({
                    success: false,
                    message: 'Daily generation limit reached'
                });
            }
            
            // Get generation parameters
            const { audioPath, genre, tempo, mood, duration } = req.body;
              try {                // Start a timer to track the process
                console.log(`Starting music generation process for user ${userId}`);
                const startTime = Date.now();
                
                // Get the preferred service from the request if specified
                const preferredService = req.body.service || null;
                
                // Generate the music using the music service manager
                const generatedMusic = await musicServiceManager.generateMusic(
                    { 
                        genre, 
                        tempo, 
                        mood, 
                        duration: parseInt(duration) || 8,
                        structure: req.body.structure || "verse-chorus"
                    },
                    audioPath,  // For reference audio if needed
                    preferredService
                );
                
                // If vocals are requested and we have a voice recording, generate vocals
                let vocalsPath = null;
                if (req.body.includeVocals !== false && audioPath) {
                    try {
                        vocalsPath = await musicServiceManager.generateVocals(generatedMusic.beatPath, {
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
                    parameters: { 
                        genre, 
                        tempo, 
                        mood, 
                        duration, 
                        voiceType: req.body.voiceType 
                    },
                    createdAt: new Date()
                });
                  res.json({
                    success: true,
                    message: 'Music generated successfully',
                    beatPath: generatedMusic.beatPath,
                    vocalsPath: generatedMusic.vocalsPath,
                    finalPath: generatedMusic.finalPath,
                    musicPath: generatedMusic.finalPath, // For backward compatibility
                    generationId: generation.id,
                    components: {
                        beat: generatedMusic.beatPath,
                        vocals: generatedMusic.vocalsPath,
                        full: generatedMusic.finalPath
                    }
                });
            } catch (apiError) {
                console.error('API Error generating music:', apiError);
                res.status(500).json({
                    success: false, 
                    message: 'Error generating music',
                    error: apiError.message
                });
            }
            
        } catch (error) {
            console.error('Error generating music:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Get user's music history
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
    
    // Get user's music library page
    getMusicLibrary: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const songs = await MusicGeneration.getByUser(userId, 50); // Get up to 50 recent songs
            
            res.render('music-library', {
                user: req.session.user,
                songs
            });
        } catch (error) {
            console.error('Error loading music library:', error);
            res.status(500).render('error', { error });
        }
    },
    
    // Delete a song
    deleteSong: async (req, res) => {
        try {
            const userId = req.session.user.id;
            const songId = req.params.id;
            
            // Get the song to check ownership and file paths
            const song = await MusicGeneration.getById(songId);
            
            if (!song) {
                return res.status(404).json({
                    success: false,
                    message: 'Song not found'
                });
            }
            
            if (song.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to delete this song'
                });
            }
            
            // Delete associated files
            const filesToDelete = [
                song.original_voice_path,
                song.instrumental_path,
                song.vocals_path, 
                song.chorus_path,
                song.final_song_path
            ].filter(Boolean); // Remove nulls
            
            for (const filePath of filesToDelete) {
                const fullPath = path.join(__dirname, '..', filePath);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            
            // Delete from database
            await MusicGeneration.deleteById(songId);
            
            res.json({
                success: true,
                message: 'Song deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting song:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
};

module.exports = recordController;
