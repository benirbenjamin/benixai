/**
 * OpenAI API Service
 * Handles communication with OpenAI's API for music generation, beat creation,
 * and voice cloning capabilities
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.baseUrl = 'https://api.openai.com/v1';
        
        // Define voice models for cloning
        this.voices = {
            alloy: "alloy",      // Neutral voice
            echo: "echo",        // Soft and warm voice
            fable: "fable",      // British voice
            onyx: "onyx",        // Deep and powerful voice
            nova: "nova",        // Female voice
            shimmer: "shimmer"   // Light and upbeat voice
        };
        
        if (!this.apiKey) {
            console.warn('OPENAI_API_KEY not set. Music generation will not work.');
        }
    }
    
    /**
     * Generate a text prompt for music creation based on user parameters
     * @param {Object} params - Music generation parameters
     * @returns {string} - Optimized prompt for the OpenAI model
     */
    createPrompt(params) {
        const { genre, mood, tempo, duration } = params;
        
        // Build detailed prompt based on parameters
        let prompt = `Create a ${duration || '1-minute'} ${genre || 'pop'} music piece`;
        
        if (mood) {
            prompt += ` with a ${mood} mood`;
        }
        
        if (tempo) {
            prompt += ` at ${tempo} BPM`;
        }
        
        // Add details about instrumentation based on genre
        switch (genre?.toLowerCase()) {
            case 'rock':
                prompt += ' featuring electric guitars, bass, and drums';
                break;
            case 'jazz':
                prompt += ' with piano, saxophone, and upright bass';
                break;
            case 'electronic':
                prompt += ' using synthesizers, electronic beats, and digital effects';
                break;
            case 'classical':
                prompt += ' with orchestral instruments like strings, woodwinds, and brass';
                break;
            case 'hip hop':
                prompt += ' with strong beat, bass, and rhythmic elements';
                break;
            // Default case for other genres or if genre isn't specified
            default:
                prompt += ' with balanced instrumentation';
        }
        
        // Make it high quality
        prompt += '. The music should be professionally composed with clear structure, high audio quality, and dynamic range.';
        
        return prompt;
    }    /**
     * Generate a beat based on parameters
     * @param {Object} params - Beat parameters
     * @returns {Promise<string>} - Path to the generated beat file
     */
    async generateBeat(params) {
        try {
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured');
            }
            
            const { genre, bpm, mood, structure } = params;
            
            // Create a detailed prompt for beat generation
            let prompt = `Create a ${bpm || 90} BPM ${genre || 'trap'} beat`;
            
            if (mood) {
                prompt += ` with a ${mood} feel`;
            }
            
            if (structure) {
                prompt += ` using a ${structure} structure`;
            }
            
            // Add specific details based on genre
            switch (genre?.toLowerCase()) {
                case 'trap':
                    prompt += ' with heavy 808s, crisp hi-hats, and punchy snares';
                    break;
                case 'hip hop':
                    prompt += ' with boom-bap drum patterns and sampled elements';
                    break;
                case 'rnb':
                    prompt += ' with smooth drum patterns, deep bass, and atmospheric elements';
                    break;
                case 'drill':
                    prompt += ' with sliding 808s, punchy kicks, and aggressive patterns';
                    break;
                case 'pop':
                    prompt += ' with catchy drum patterns, bright percussion, and radio-friendly elements';
                    break;
                default:
                    prompt += ' with professional sound design and mixing';
            }
            
            console.log(`Generated beat prompt: ${prompt}`);
            
            // For now, we simulate this with a placeholder since OpenAI doesn't have a dedicated beat generation endpoint
            // In a production app, you'd use a more specialized API
            
            // Create a unique ID for the generated file
            const outputId = uuidv4();
            const beatPath = `/uploads/beats/${outputId}.mp3`;
            const fullPath = path.join(process.cwd(), 'public', beatPath);
            
            // Make sure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            // Copy a sample file (if available) for demonstration purposes
            const sampleBeatPath = path.join(__dirname, '..', 'public', 'assets', 'sample-beat.mp3');
            if (fs.existsSync(sampleBeatPath)) {
                fs.copyFileSync(sampleBeatPath, fullPath);
            } else {
                // Create an empty file as a placeholder
                fs.writeFileSync(fullPath, '');            }
            
            return beatPath;
        } catch (error) {
            console.error('Error generating beat:', error);
            throw error;
        }
    }
    
    /**
     * Clone a voice using OpenAI's text-to-speech with style matching
     * @param {string} originalVoicePath - Path to the original voice recording
     * @param {string} text - The text to convert to speech in the cloned voice
     * @param {Object} params - Additional parameters
     * @returns {Promise<string>} - Path to the generated cloned voice file
     */
    async cloneVoice(originalVoicePath, text, params = {}) {
        try {
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured');
            }
            
            // In production, you'd use a more specialized voice cloning API
            // For now, we'll use OpenAI's TTS with style matching based on the provided params
            
            // Choose a voice model that best matches the original voice characteristics
            const voice = params.voiceType || this.voices.nova; // Default to 'nova' voice
            
            // Create a request to OpenAI's TTS API
            const response = await axios.post(
                `${this.baseUrl}/audio/speech`,
                {
                    model: "tts-1-hd",  // Use the high-definition model for better quality
                    input: text,
                    voice: voice,
                    response_format: "mp3",
                    speed: params.speed || 1.0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );
            
            // Save the generated audio file
            const outputId = uuidv4();
            const outputPath = `/uploads/vocals/${outputId}.mp3`;
            const fullPath = path.join(process.cwd(), 'public', outputPath);
            
            // Make sure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(fullPath, response.data);
            
            return outputPath;
        } catch (error) {            console.error('Error cloning voice:', error);
            throw error;
        }
    }
    
    /**
     * Generate vocals for an instrumental using a specific voice style or cloning
     * @param {string} instrumentalPath - Path to instrumental file
     * @param {Object} params - Additional parameters
     * @returns {Promise<string>} - Path to the generated vocal file
     */
    async generateVocals(instrumentalPath, params) {
        try {
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured');
            }
            
            // Generate lyrics based on genre and mood
            const lyricsPrompt = `Write ${params.verses || 1} verse(s) and ${params.choruses || 1} chorus(es) of song lyrics for a ${params.genre || 'pop'} song with a ${params.mood || 'energetic'} mood about ${params.topic || 'life and relationships'}.`;
            
            // In production, you'd use the ChatGPT API to generate lyrics
            // For now, we'll use some sample lyrics for demonstration
            const sampleLyrics = "This is where your song lyrics would be\nGenerated by AI based on the genre and mood\nWe're making music with technology\nCreating sounds that feel so good";
            
            // Now use the TTS API to convert these lyrics to vocals with the specified voice
            const voiceType = params.voiceType || this.voices.nova;
            
            // If there's a reference voice recording, use voice cloning
            if (params.referenceVoicePath) {
                return await this.cloneVoice(params.referenceVoicePath, sampleLyrics, {
                    voiceType,
                    speed: params.speed || 1.0
                });
            }
            
            // Otherwise use standard TTS
            const response = await axios.post(
                `${this.baseUrl}/audio/speech`,
                {
                    model: "tts-1",
                    input: sampleLyrics,
                    voice: voiceType,
                    response_format: "mp3",
                    speed: params.speed || 1.0
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer'
                }
            );
            
            // Save the generated audio file
            const outputId = uuidv4();
            const outputPath = `/uploads/vocals/${outputId}.mp3`;
            const fullPath = path.join(process.cwd(), 'public', outputPath);
            
            // Make sure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(fullPath, response.data);
            
            return outputPath;
        } catch (error) {
            console.error('Error generating vocals:', error);
            throw error;        }
    }
    
    /**
     * Generate music using OpenAI's API, combining beat generation and vocals
     * @param {Object} params - Music generation parameters
     * @param {string} inputAudioPath - Optional path to input audio for reference (for voice cloning)
     * @returns {Promise<Object>} - Generated music details with paths to all components
     */
    async generateMusic(params, inputAudioPath = null) {
        try {
            if (!this.apiKey) {
                throw new Error('OpenAI API key not configured');
            }
            
            console.log(`Starting music generation with parameters:`, params);
            
            // Step 1: Generate the beat/instrumental
            console.log("Generating beat...");
            const beatPath = await this.generateBeat({
                genre: params.genre,
                bpm: params.tempo,
                mood: params.mood,
                structure: params.structure || "verse-chorus"
            });
            
            // Step 2: Generate vocals (optional, based on parameters)
            let vocalsPath = null;
            if (params.includeVocals !== false) {
                console.log("Generating vocals...");
                vocalsPath = await this.generateVocals(beatPath, {
                    genre: params.genre,
                    mood: params.mood,
                    topic: params.topic || "life",
                    verses: params.verses || 1,
                    choruses: params.choruses || 1,
                    referenceVoicePath: inputAudioPath, // For voice cloning if provided
                    voiceType: params.voiceType || this.voices.nova,
                    speed: params.speed || 1.0
                });
            }
            
            // Step 3: In a real app, you would mix the beat and vocals together
            // For now, we're just returning both components separately
            
            // Create a unique ID for the final mixed track (in real app, would be actual mixed file)
            const finalOutputId = uuidv4();
            const finalPath = `/uploads/songs/${finalOutputId}.mp3`;
            
            // For demonstration, we're just copying the beat as the final track
            const sampleDir = path.join(process.cwd(), 'public', '/uploads/songs');
            if (!fs.existsSync(sampleDir)) {
                fs.mkdirSync(sampleDir, { recursive: true });
            }
            
            // In a real app, you would mix the beat and vocals together here
            // For now, just copy the beat as the final output
            const beatFullPath = path.join(process.cwd(), 'public', beatPath);
            const finalFullPath = path.join(process.cwd(), 'public', finalPath);
            
            if (fs.existsSync(beatFullPath)) {
                fs.copyFileSync(beatFullPath, finalFullPath);
            }
            
            return {
                beatPath: beatPath,
                vocalsPath: vocalsPath,
                finalPath: finalPath,
                instrumentalPath: beatPath, // For backward compatibility
                parameters: params
            };
            
        } catch (error) {
            console.error('Error generating music with OpenAI:', error);
            throw error;
        }
    }
}

module.exports = new OpenAIService();
