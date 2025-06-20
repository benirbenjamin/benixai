/**
 * Click Sound Fix Module
 * Fixes clicks and pops in audio recordings
 */

/**
 * Apply a ramp to the start and end of audio to prevent clicks
 * @param {AudioBuffer} audioBuffer - The audio buffer to process
 * @returns {AudioBuffer} The processed audio buffer
 */
function applyFadeToAudio(audioBuffer) {
    const fadeLength = Math.floor(audioBuffer.sampleRate * 0.005); // 5ms fade
    
    // For each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        
        // Apply fade in
        for (let i = 0; i < fadeLength; i++) {
            const factor = i / fadeLength;
            channelData[i] *= factor;
        }
        
        // Apply fade out
        for (let i = 0; i < fadeLength; i++) {
            const factor = i / fadeLength;
            channelData[channelData.length - 1 - i] *= factor;
        }
    }
    
    return audioBuffer;
}

/**
 * Process audio to remove DC offset that causes clicks
 * @param {AudioBuffer} audioBuffer - The audio buffer to process
 * @returns {AudioBuffer} The processed audio buffer
 */
function removeDCOffset(audioBuffer) {
    // For each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        
        // Calculate the DC offset (average value)
        let sum = 0;
        for (let i = 0; i < channelData.length; i++) {
            sum += channelData[i];
        }
        const dcOffset = sum / channelData.length;
        
        // Remove the DC offset
        for (let i = 0; i < channelData.length; i++) {
            channelData[i] -= dcOffset;
        }
    }
    
    return audioBuffer;
}

/**
 * Fix MediaRecorder to prevent clicks in recordings
 * @param {MediaRecorder} recorder - The MediaRecorder to fix
 */
function fixMediaRecorder(recorder) {
    if (!recorder) return;
    
    // Store the original stop method
    const originalStop = recorder.stop;
    
    // Override the stop method
    recorder.stop = function() {
        // Add a small delay before actually stopping
        setTimeout(() => {
            originalStop.call(recorder);
        }, 100);
    };
}

/**
 * Create an optimized recording configuration
 * @returns {Object} MediaRecorder options
 */
function getOptimalRecordingConfig() {
    // Find optimal audio format
    const formats = [
        { mimeType: 'audio/webm;codecs=pcm', bitRate: 256000 },
        { mimeType: 'audio/webm', bitRate: 128000 },
        { mimeType: 'audio/wav', bitRate: 256000 },
        { mimeType: 'audio/ogg', bitRate: 128000 }
    ];
    
    for (const format of formats) {
        try {
            if (MediaRecorder.isTypeSupported(format.mimeType)) {
                return { 
                    mimeType: format.mimeType, 
                    audioBitsPerSecond: format.bitRate 
                };
            }
        } catch (e) { 
            // Ignore error and try next format
        }
    }
    
    // Return empty object if no supported format found
    return {};
}

// Export functions
window.clickSoundFix = {
    applyFadeToAudio,
    removeDCOffset,
    fixMediaRecorder,
    getOptimalRecordingConfig
};
