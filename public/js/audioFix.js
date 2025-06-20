/**
 * Audio Fix Module
 * This module handles audio format compatibility issues
 * Pure JavaScript implementation - no FFmpeg required
 */

// Supported audio formats by most browsers
const SUPPORTED_FORMATS = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg'];

/**
 * Check if the browser supports the given audio format
 * @param {string} format - MIME type to check
 * @returns {boolean} Whether the format is supported
 */
function isFormatSupported(format) {
    const audio = document.createElement('audio');
    return audio.canPlayType(format) !== '';
}

/**
 * Create a WAV header for PCM audio data
 * @param {Object} options - Options for the WAV header
 * @param {number} options.sampleRate - The sample rate of the audio (default: 44100)
 * @param {number} options.numChannels - The number of channels (default: 2)
 * @param {number} options.bitsPerSample - Bits per sample (default: 16)
 * @param {number} options.dataSize - The size of the audio data in bytes
 * @returns {ArrayBuffer} - The WAV header
 */
function createWavHeader(options) {
    const { sampleRate = 44100, numChannels = 2, bitsPerSample = 16, dataSize } = options;
    const headerSize = 44;
    const buffer = new ArrayBuffer(headerSize);
    const view = new DataView(buffer);
    
    // RIFF identifier
    writeString(view, 0, 'RIFF');
    // RIFF chunk length
    view.setUint32(4, 36 + dataSize, true);
    // RIFF type
    writeString(view, 8, 'WAVE');
    // format chunk identifier
    writeString(view, 12, 'fmt ');
    // format chunk length
    view.setUint32(16, 16, true);
    // sample format (1 is PCM)
    view.setUint16(20, 1, true);
    // channel count
    view.setUint16(22, numChannels, true);
    // sample rate
    view.setUint32(24, sampleRate, true);
    // byte rate (sample rate * block align)
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    // block align (channel count * bytes per sample)
    view.setUint16(32, numChannels * bitsPerSample / 8, true);
    // bits per sample
    view.setUint16(34, bitsPerSample, true);
    // data chunk identifier
    writeString(view, 36, 'data');
    // data chunk length
    view.setUint32(40, dataSize, true);
    
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
 * Convert an audio blob to a WAV format
 * @param {Blob} audioBlob - The audio blob to convert
 * @returns {Promise<Blob>} - A promise that resolves to the WAV blob
 */
async function convertToWav(audioBlob) {
    return new Promise((resolve, reject) => {
        // If it's already a WAV, return it
        if (audioBlob.type === 'audio/wav') {
            resolve(audioBlob);
            return;
        }
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Read the blob as an array buffer
        const fileReader = new FileReader();
        fileReader.onload = async (event) => {
            try {
                // Decode the audio data
                const audioBuffer = await audioContext.decodeAudioData(event.target.result);
                
                // Convert to WAV format
                const wavBlob = await audioBufferToWavBlob(audioBuffer);
                resolve(wavBlob);
            } catch (err) {
                console.error('Error converting audio:', err);
                // Return original blob if conversion fails
                resolve(audioBlob);
            }
        };
        
        fileReader.onerror = () => {
            console.error('Error reading file');
            resolve(audioBlob); // Return original as fallback
        };
        
        fileReader.readAsArrayBuffer(audioBlob);
    });
}

/**
 * Determine the best format to use based on browser support
 * @returns {string} The best supported format
 */
function getBestSupportedFormat() {
    for (const format of SUPPORTED_FORMATS) {
        if (isFormatSupported(format)) {
            return format;
        }
    }
    return 'audio/wav'; // Default to WAV as fallback
}

/**
 * Fix audio element to prevent format errors
 * @param {HTMLAudioElement} audioElement - The audio element to fix
 */
function fixAudioElement(audioElement) {
    if (!audioElement) return;
    
    // Add error event listener
    audioElement.addEventListener('error', function(e) {
        console.error('Audio error:', e);
        const errorMessage = document.getElementById('audioErrorMessage');
        if (errorMessage) {
            errorMessage.textContent = 'Error loading audio. Trying alternative format...';
            errorMessage.style.display = 'block';
        }
        
        // If format error, try to load as WAV
        if (this.error && this.error.code === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
            const currentSrc = this.src;
            if (currentSrc.includes('.mp3')) {
                this.src = currentSrc.replace('.mp3', '.wav');
            } else if (currentSrc.includes('.ogg')) {
                this.src = currentSrc.replace('.ogg', '.wav');
            }
            this.load();
        }
    });
    
    // Force known good MIME type
    if (audioElement.src) {
        const urlObj = new URL(audioElement.src);
        const extension = urlObj.pathname.split('.').pop();
        
        // Add correct content-type based on extension
        if (extension === 'mp3') {
            fetch(audioElement.src, { headers: { 'Accept': 'audio/mpeg' } })
                .then(response => response.blob())
                .then(blob => {
                    const newBlob = new Blob([blob], { type: 'audio/mpeg' });
                    audioElement.src = URL.createObjectURL(newBlob);
                })
                .catch(err => console.error('Error fetching audio:', err));
        }
    }
}

/**
 * Establish compatibility for audio recording
 * @returns {Object} Audio constraints for recording
 */
function getAudioConstraints() {
    return {
        audio: {
            channelCount: 1,
            sampleRate: 44100,
            sampleSize: 16,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    };
}

/**
 * Convert an AudioBuffer to a WAV Blob
 * @param {AudioBuffer} audioBuffer - The audio buffer to convert
 * @returns {Blob} - A WAV blob
 */
function audioBufferToWavBlob(audioBuffer) {
    // Get audio parameters
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 16; // 16-bit PCM
    const bytesPerSample = format / 8;
    
    // Calculate sizes
    const dataLength = audioBuffer.length * numChannels * bytesPerSample;
    
    // Create WAV header
    const headerBuffer = createWavHeader({
        sampleRate: sampleRate,
        numChannels: numChannels,
        bitsPerSample: format,
        dataSize: dataLength
    });
    
    // Create the audio data buffer
    const audioDataView = new DataView(new ArrayBuffer(dataLength));
    let offset = 0;
    
    // Get audio channel data
    for (let i = 0; i < audioBuffer.length; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
            const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            audioDataView.setInt16(offset, value, true);
            offset += bytesPerSample;
        }
    }
    
    // Combine header and audio data
    const wavBuffer = new Uint8Array(headerBuffer.byteLength + audioDataView.buffer.byteLength);
    wavBuffer.set(new Uint8Array(headerBuffer), 0);
    wavBuffer.set(new Uint8Array(audioDataView.buffer), headerBuffer.byteLength);
    
    // Create and return WAV blob
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

// Export all functions
window.audioFix = {
    isFormatSupported,
    getBestSupportedFormat,
    fixAudioElement,
    convertToWav,
    audioBufferToWavBlob,
    getAudioConstraints
};
