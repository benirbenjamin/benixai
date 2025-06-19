/**
 * Stability AI Audio Generation Service
 * Handles communication with Stability AI's Audio API for beat generation
 * This is a JavaScript-friendly AI music generation service
 * that doesn't require Python
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class StabilityAudioService {
    constructor() {
        this.apiKey = process.env.STABILITY_API_KEY;
        this.baseUrl = process.env.STABILITY_API_URL || 'https://api.stability.ai/v2beta';
        
        if (!this.apiKey) {
            console.warn('STABILITY_API_KEY not set. Music generation will fall back to sample audio.');
        }
    }
    
    /**
     * Create a detailed prompt for music generation based on user parameters
     * @param {Object} params - Music generation parameters
     * @returns {string} - Optimized prompt for audio generation
     */
    createPrompt(params) {
        const { genre, mood, tempo, duration } = params;
        
        // Build detailed prompt based on parameters
        let prompt = `${genre || 'pop'} music`;
        
        if (mood) {
            prompt += ` with a ${mood} mood`;
        }
        
        if (tempo) {
            prompt += ` at ${tempo} BPM`;
        }
        
        // Add details about instrumentation based on genre
        switch (genre?.toLowerCase()) {
            case 'rock':
                prompt += ' with electric guitars, bass, and drums';
                break;
            case 'jazz':
                prompt += ' with piano, saxophone, and upright bass';
                break;
            case 'electronic':
                prompt += ' with synthesizers, electronic beats, and digital effects';
                break;
            case 'hip hop':
            case 'rap':
                prompt += ' with strong beat, 808 bass, and trap hi-hats';
                break;
            case 'trap':
                prompt += ' with heavy 808s, crisp hi-hats, and punchy snares';
                break;
            case 'rnb':
                prompt += ' with smooth drum patterns, deep bass, and atmospheric elements';
                break;
            // Default case for other genres or if genre isn't specified
            default:
                prompt += ' with balanced instrumentation';
        }
        
        // Make it high quality
        prompt += '. The music should be professionally composed with clear structure, high audio quality, and dynamic range.';
        
        return prompt;
    }
    
    /**
     * Generate music using Stability AI's audio generation API
     * This is a pure JavaScript implementation that doesn't require Python
     * @param {Object} params - Music generation parameters
     * @param {string} referenceAudioPath - Optional path to input audio for reference
     * @returns {Promise<Object>} - Generated music details
     */
    async generateMusic(params, referenceAudioPath = null) {
        try {
            // Create a detailed prompt based on parameters
            const prompt = this.createPrompt(params);
            
            console.log(`Requesting music generation with prompt: ${prompt}`);
            
            // Create unique IDs for output files
            const outputId = uuidv4();
            const beatPath = `/uploads/beats/${outputId}.mp3`;
            const finalPath = `/uploads/songs/${outputId}.mp3`;
            
            // Ensure directories exist
            const beatDir = path.join(process.cwd(), 'public', '/uploads/beats');
            const songDir = path.join(process.cwd(), 'public', '/uploads/songs');
            
            if (!fs.existsSync(beatDir)) {
                fs.mkdirSync(beatDir, { recursive: true });
            }
            
            if (!fs.existsSync(songDir)) {
                fs.mkdirSync(songDir, { recursive: true });
            }
            
            let audioData;
            
            // Check if we have API key for Stability AI
            if (this.apiKey) {
                try {
                    // Using the Stability AI Audio Generation API
                    const response = await axios.post(
                        `${this.baseUrl}/audio/generation`,
                        {
                            text_prompts: [
                                {
                                    text: prompt,
                                    weight: 1.0
                                }
                            ],
                            generation_type: "music",
                            duration_in_seconds: params.duration || 8,
                            style_preset: params.genre?.toLowerCase() || "electronic",
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.apiKey}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            responseType: 'json'
                        }
                    );
                    
                    // The response includes generated audio artifacts
                    if (response.data && response.data.artifacts && response.data.artifacts.length > 0) {
                        // Get the audio binary from the first artifact
                        const audioArtifact = response.data.artifacts[0];
                        audioData = Buffer.from(audioArtifact.audio, 'base64');
                    }
                } catch (apiError) {
                    console.error('API error during music generation:', apiError);
                    // Will fall back to sample audio
                }
            }
            
            // If we don't have audio data yet (no API key or API error), use sample audio
            if (!audioData) {
                console.log('Using sample audio fallback');
                
                const sampleAudioPath = path.join(__dirname, '..', 'public', 'assets', 'sample-beat.mp3');
                if (fs.existsSync(sampleAudioPath)) {
                    audioData = fs.readFileSync(sampleAudioPath);
                } else {
                    // Create empty data if sample doesn't exist
                    audioData = Buffer.from('');
                }
            }
            
            // Save the audio data to files
            const beatFullPath = path.join(process.cwd(), 'public', beatPath);
            const finalFullPath = path.join(process.cwd(), 'public', finalPath);
            
            fs.writeFileSync(beatFullPath, audioData);
            fs.writeFileSync(finalFullPath, audioData);
            
            return {
                beatPath: beatPath,
                finalPath: finalPath,
                instrumentalPath: beatPath, // For backward compatibility
                prompt: prompt,
                parameters: params
            };
        } catch (error) {
            console.error('Error generating music:', error);
            throw error;
        }
    }
    
    /**
     * Poll the API for results (useful if implementing a different API)
     * @param {string} predictionId - The ID of the prediction to poll
     * @returns {Promise<Object>} - The prediction result
     */
    async pollForResult(predictionId) {
        const maxAttempts = 30; // Maximum number of polling attempts
        const delayMs = 2000; // Time to wait between polling attempts (2 seconds)
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await axios.get(
                    `${this.baseUrl}/${predictionId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                const prediction = response.data;
                
                if (prediction.status === 'succeeded') {
                    return prediction;
                } else if (prediction.status === 'failed') {
                    throw new Error(`Music generation failed: ${prediction.error}`);
                }
                
                // Wait before the next polling attempt
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } catch (error) {
                console.error(`Error polling for result (attempt ${attempt + 1}):`, error);
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        throw new Error('Music generation timed out');
    }
}

module.exports = new StabilityAudioService();
