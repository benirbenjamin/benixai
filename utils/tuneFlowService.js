/**
 * TuneFlow AI Music Generation Service
 * Provides beat generation functionality using the TuneFlow API
 * This is a pure JavaScript implementation that doesn't require Python
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TuneFlowService {
    constructor() {
        this.apiKey = process.env.TUNEFLOW_API_KEY;
        this.baseUrl = 'https://api.tuneflow.ai/v1';
        
        if (!this.apiKey) {
            console.warn('TUNEFLOW_API_KEY not set. Music generation will fall back to sample audio.');
        }
    }
    
    /**
     * Create a structured prompt for TuneFlow based on user parameters
     * @param {Object} params - Music generation parameters
     * @returns {Object} - TuneFlow API parameters
     */
    createPrompt(params) {
        const { genre, mood, tempo, duration } = params;
        
        // Base parameters
        const tuneflowParams = {
            style: genre?.toLowerCase() || 'electronic',
            mood: mood?.toLowerCase() || 'energetic',
            tempo: parseInt(tempo) || 120,
            duration: parseInt(duration) || 30,
        };
        
        // Style presets based on genre
        switch (genre?.toLowerCase()) {
            case 'rock':
                tuneflowParams.instruments = ['electric_guitar', 'bass', 'drums'];
                break;
            case 'jazz':
                tuneflowParams.instruments = ['piano', 'saxophone', 'upright_bass', 'drums'];
                break;
            case 'electronic':
                tuneflowParams.instruments = ['synth', 'drums', 'bass_synth'];
                break;
            case 'hip hop':
            case 'rap':
            case 'trap':
                tuneflowParams.instruments = ['808', 'drums', 'synth'];
                break;
            case 'rnb':
                tuneflowParams.instruments = ['piano', 'bass', 'drums', 'electric_guitar'];
                break;
        }
        
        return tuneflowParams;
    }
    
    /**
     * Generate music using TuneFlow API
     * @param {Object} params - Music generation parameters
     * @param {string} referenceAudioPath - Optional reference audio
     * @returns {Promise<Object>} - Generated music paths
     */
    async generateMusic(params, referenceAudioPath = null) {
        try {
            // Format parameters for TuneFlow API
            const tuneflowParams = this.createPrompt(params);
            
            console.log(`Starting TuneFlow generation with parameters:`, tuneflowParams);
            
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
            
            // Check if we have API key for TuneFlow
            if (this.apiKey) {
                try {
                    // Request music generation
                    const response = await axios.post(
                        `${this.baseUrl}/generate`,
                        {
                            style: tuneflowParams.style,
                            mood: tuneflowParams.mood,
                            tempo: tuneflowParams.tempo,
                            duration: tuneflowParams.duration,
                            instruments: tuneflowParams.instruments || undefined,
                            format: 'mp3'
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${this.apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    
                    // Check if we got a generation ID
                    if (response.data && response.data.generationId) {
                        // Poll for the result
                        const result = await this.pollForResult(response.data.generationId);
                        
                        // Download the audio file
                        if (result.audioUrl) {
                            const audioResponse = await axios.get(result.audioUrl, {
                                responseType: 'arraybuffer'
                            });
                            
                            audioData = audioResponse.data;
                        }
                    }
                } catch (apiError) {
                    console.error('TuneFlow API error:', apiError);
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
                instrumentalPath: beatPath,
                prompt: JSON.stringify(tuneflowParams),
                parameters: params
            };
        } catch (error) {
            console.error('Error generating music with TuneFlow:', error);
            throw error;
        }
    }
    
    /**
     * Poll for TuneFlow generation result
     * @param {string} generationId - The generation ID from TuneFlow
     * @returns {Promise<Object>} - Generation result with audio URL
     */
    async pollForResult(generationId) {
        const maxAttempts = 30;
        const delayMs = 3000;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await axios.get(
                    `${this.baseUrl}/generation/${generationId}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${this.apiKey}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                const status = response.data.status;
                
                if (status === 'completed') {
                    return {
                        audioUrl: response.data.audioUrl,
                        midiUrl: response.data.midiUrl || null
                    };
                } else if (status === 'failed') {
                    throw new Error('TuneFlow generation failed');
                }
                
                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } catch (error) {
                console.error(`Error polling TuneFlow (attempt ${attempt + 1}):`, error);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
        throw new Error('TuneFlow generation timed out');
    }
}

module.exports = new TuneFlowService();
