/**
 * Generate Track Fix Module
 * This module fixes issues with track generation and audio transmission
 */

// Store any ongoing generation tasks
const generationTasks = {};

/**
 * Validate audio data before sending it to the server
 * @param {Blob|ArrayBuffer|String} audioData - The audio data to validate
 * @returns {boolean} Whether the audio data is valid
 */
function validateAudioData(audioData) {
    if (!audioData) return false;
    
    // If it's a Blob, check its size and type
    if (audioData instanceof Blob) {
        if (audioData.size === 0) return false;
        if (!audioData.type.startsWith('audio/')) return false;
        return true;
    }
    
    // If it's an ArrayBuffer, check its length
    if (audioData instanceof ArrayBuffer) {
        return audioData.byteLength > 0;
    }
    
    // If it's a base64 string, check its format
    if (typeof audioData === 'string') {
        // Basic validation for base64 data
        if (audioData.startsWith('data:audio')) return true;
        
        // Check for base64 pattern
        const base64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
        if (base64Pattern.test(audioData.split(',')[1] || audioData)) return true;
    }
    
    return false;
}

/**
 * Fix audio format conversion issues
 * @param {Blob} audioBlob - The audio blob to convert
 * @param {string} targetFormat - The target format
 * @returns {Promise<Blob>} The converted audio blob
 */
async function fixAudioConversion(audioBlob, targetFormat = 'audio/wav') {
    return new Promise((resolve, reject) => {
        // If already in target format, return as-is
        if (audioBlob.type === targetFormat) {
            return resolve(audioBlob);
        }
        
        const fileReader = new FileReader();
        
        fileReader.onload = async (event) => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const audioData = await audioContext.decodeAudioData(event.target.result);
                
                // Get audio buffer data
                const numberOfChannels = audioData.numberOfChannels;
                const length = audioData.length;
                const sampleRate = audioData.sampleRate;
                
                // Create WAV file format
                const wavBuffer = createWavBuffer(audioData);
                const convertedBlob = new Blob([wavBuffer], { type: 'audio/wav' });
                resolve(convertedBlob);
            } catch (error) {
                console.error('Audio conversion error:', error);
                // Return original blob as fallback
                resolve(audioBlob);
            }
        };
        
        fileReader.onerror = () => {
            console.error('FileReader error');
            // Return original blob as fallback
            resolve(audioBlob);
        };
        
        fileReader.readAsArrayBuffer(audioBlob);
    });
}

/**
 * Create a WAV buffer from audio data
 * @param {AudioBuffer} audioData - The audio buffer data
 * @returns {ArrayBuffer} The WAV file buffer
 */
function createWavBuffer(audioData) {
    const numChannels = audioData.numberOfChannels;
    const length = audioData.length;
    const sampleRate = audioData.sampleRate;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * numChannels * bytesPerSample;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type 'WAVE'
    writeString(view, 8, 'WAVE');
    // Format chunk identifier 'fmt '
    writeString(view, 12, 'fmt ');
    // Format chunk length
    view.setUint32(16, 16, true);
    // Sample format (1 = PCM)
    view.setUint16(20, 1, true);
    // Channel count
    view.setUint16(22, numChannels, true);
    // Sample rate
    view.setUint32(24, sampleRate, true);
    // Byte rate (sample rate * block align)
    view.setUint32(28, byteRate, true);
    // Block align (channel count * bytes per sample)
    view.setUint16(32, blockAlign, true);
    // Bits per sample
    view.setUint16(34, bitsPerSample, true);
    // Data chunk identifier 'data'
    writeString(view, 36, 'data');
    // Data chunk length
    view.setUint32(40, dataSize, true);

    // Write the PCM samples
    const channelData = [];
    // Get audio data for each channel
    for (let channel = 0; channel < numChannels; channel++) {
        channelData.push(audioData.getChannelData(channel));
    }
    
    let offset = 44;
    const volume = 1;
    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            // Convert Float32 to Int16
            const sample = Math.max(-1, Math.min(1, channelData[channel][i])) * volume;
            const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(offset, int16Sample, true);
            offset += 2;
        }
    }

    return buffer;
}

/**
 * Write a string to a DataView
 * @param {DataView} view - The data view
 * @param {number} offset - The offset to write at
 * @param {string} string - The string to write
 */
function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Fix track generation by using a better format and robust error handling
 * @param {Object} options - Options for track generation
 * @returns {Promise<string>} URL of the generated audio
 */
async function generateTrackWithFix(options) {
    const { audioData, type, genre, mood, tempo } = options;
    
    return new Promise(async (resolve, reject) => {
        try {
            let processedAudioData = audioData;
            
            // Validate and process audio data if needed
            if (audioData instanceof Blob) {
                if (!validateAudioData(audioData)) {
                    return reject(new Error('Invalid audio data'));
                }
                
                // Convert to WAV format for better compatibility
                processedAudioData = await fixAudioConversion(audioData, 'audio/wav');
            }
            
            // Create form data for upload
            const formData = new FormData();
            if (processedAudioData instanceof Blob) {
                formData.append('audio', processedAudioData);
                formData.append('audioFormat', 'wav');
            } else if (typeof processedAudioData === 'string') {
                formData.append('audioData', processedAudioData);
                formData.append('audioFormat', 'wav');
            }
            
            // Add other generation parameters
            formData.append('type', type || 'instrumental');
            formData.append('genre', genre || 'pop');
            formData.append('mood', mood || 'energetic');
            formData.append('tempo', tempo || 120);
            
            // Send to server
            const response = await fetch('/api/generate-music', {
                method: 'POST',
                body: formData,
                headers: {
                    // Do not set Content-Type with FormData
                },
            });
            
            // Parse response
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Failed to generate track');
            }
            
            // Return audio URL
            resolve(data.audioUrl);
        } catch (error) {
            console.error('Track generation error:', error);
            reject(error);
        }
    });
}

// Export functions
window.generateTrackFix = {
    validateAudioData,
    fixAudioConversion,
    generateTrackWithFix
};
