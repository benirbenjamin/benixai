/**
 * Music Service Manager
 * Provides a unified interface for multiple music generation services
 * Allows fallback between services if one fails
 */
const stabilityService = require('./stabilityAudioService');
const openaiService = require('./openaiService');

class MusicServiceManager {
    constructor() {
        this.services = {
            stability: stabilityService,
            openai: openaiService
        };
        
        // Default service preferences order
        this.preferredOrder = [
            'stability',    // Stability AI Audio Gen (fastest)
            'openai'        // OpenAI (for vocals and fallback)
        ];
        
        // Track available services based on API keys
        this.available = {
            stability: !!process.env.STABILITY_API_KEY,
            openai: !!process.env.OPENAI_API_KEY
        };
        
        console.log('Available music services:', 
            Object.keys(this.available).filter(s => this.available[s]).join(', '));
    }
    
    /**
     * Generate music using the preferred available service
     * @param {Object} params - Music generation parameters
     * @param {string} referenceAudioPath - Optional reference audio path
     * @param {string} preferredService - Optional preferred service
     * @returns {Promise<Object>} - Generated music details
     */
    async generateMusic(params, referenceAudioPath = null, preferredService = null) {
        // Determine service order based on preference and availability
        let serviceOrder = [...this.preferredOrder];
        
        // If a specific service is requested and available, try it first
        if (preferredService && this.available[preferredService]) {
            serviceOrder = [preferredService, ...serviceOrder.filter(s => s !== preferredService)];
        }
        
        // Filter to only available services
        serviceOrder = serviceOrder.filter(s => this.available[s]);
        
        // If no services available, use Stability AI as default fallback (will use sample audio)
        if (serviceOrder.length === 0) {
            serviceOrder = ['stability'];
        }
        
        let lastError = null;
        
        // Try each service in order until one succeeds
        for (const serviceName of serviceOrder) {
            try {
                console.log(`Attempting to generate music using ${serviceName} service`);
                const result = await this.services[serviceName].generateMusic(params, referenceAudioPath);
                
                // Add which service was used to the result
                result.serviceUsed = serviceName;
                return result;
            } catch (error) {
                console.error(`Failed to generate with ${serviceName}:`, error);
                lastError = error;
                // Continue to next service
            }
        }
        
        // If all services failed, throw the last error
        throw lastError || new Error('All music generation services failed');
    }
    
    /**
     * Generate vocals using OpenAI service
     * @param {string} instrumentalPath - Path to instrumental file
     * @param {Object} params - Vocal generation parameters
     * @returns {Promise<string>} - Path to generated vocals
     */
    async generateVocals(instrumentalPath, params) {
        // For vocals, we currently only support OpenAI
        if (!this.available.openai) {
            throw new Error('OpenAI service is required for vocal generation but API key is missing');
        }
        
        return this.services.openai.generateVocals(instrumentalPath, params);
    }
    
    /**
     * Clone a voice using the best available service
     * @param {string} referenceVoicePath - Path to reference voice recording
     * @param {string} text - Text to convert to speech
     * @param {Object} params - Additional parameters
     * @returns {Promise<string>} - Path to generated voice audio
     */
    async cloneVoice(referenceVoicePath, text, params = {}) {
        // Currently only OpenAI supports our voice cloning approach
        if (!this.available.openai) {
            throw new Error('OpenAI service is required for voice cloning but API key is missing');
        }
        
        return this.services.openai.cloneVoice(referenceVoicePath, text, params);
    }
}

module.exports = new MusicServiceManager();
