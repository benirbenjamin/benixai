/**
 * Media Error Handler Utility
 * Helps diagnose and handle common media element errors
 */

// Error codes for MediaError
const MEDIA_ERR_ABORTED = 1;      // User aborted the download
const MEDIA_ERR_NETWORK = 2;      // Network error occurred during download
const MEDIA_ERR_DECODE = 3;       // Error decoding the audio/video
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;  // Audio/video format not supported

/**
 * Get detailed error message for MediaElement errors
 * @param {MediaError|Event} error - Media error object or event
 * @returns {Object} Error details with type, message, and suggestions
 */
export function getMediaErrorDetails(error) {
  // If error is an event with target that has error property
  if (error && error.target && error.target.error) {
    error = error.target.error;
  }
  
  // Default error structure
  const errorDetails = {
    type: 'UNKNOWN_MEDIA_ERROR',
    message: 'An unknown media error occurred',
    suggestions: ['Try refreshing the page', 'Check browser compatibility']
  };
  
  // No error object provided
  if (!error) {
    errorDetails.type = 'NO_ERROR_OBJECT';
    errorDetails.message = 'No error object was provided';
    return errorDetails;
  }
  
  // Handle MediaError code if available
  if (error.code) {
    switch(error.code) {
      case MEDIA_ERR_ABORTED:
        errorDetails.type = 'MEDIA_ERR_ABORTED';
        errorDetails.message = 'The media download was aborted';
        errorDetails.suggestions = ['Try recording again', 'Ensure you don\'t cancel the recording'];
        break;
      case MEDIA_ERR_NETWORK:
        errorDetails.type = 'MEDIA_ERR_NETWORK';
        errorDetails.message = 'A network error occurred during download';
        errorDetails.suggestions = ['Check your internet connection', 'Try again later'];
        break;
      case MEDIA_ERR_DECODE:
        errorDetails.type = 'MEDIA_ERR_DECODE';
        errorDetails.message = 'The media could not be decoded';
        errorDetails.suggestions = ['Try a different audio format', 'Check if the audio is corrupted'];
        break;
      case MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorDetails.type = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
        errorDetails.message = 'The audio format is not supported';
        errorDetails.suggestions = ['Try a different audio format (MP3, WAV, or OGG)', 'Update your browser'];
        break;
    }
  }
  
  // Check for format error specifically
  if (error.message && error.message.toLowerCase().includes('format')) {
    errorDetails.type = 'FORMAT_ERROR';
    errorDetails.message = 'Audio format error detected';
    errorDetails.suggestions = [
      'Ensure audio is being recorded in a supported format (WAV recommended)',
      'Check the sample rate (44.1kHz or 48kHz standard)',
      'Try recording with 16-bit depth',
      'Ensure the MediaRecorder is configured correctly'
    ];
  }
  
  // Include original message if available
  if (error.message) {
    errorDetails.originalMessage = error.message;
  }
  
  return errorDetails;
}

/**
 * Check if audio data is valid and being transmitted
 * @param {Blob|ArrayBuffer} audioData - The audio data to check
 * @returns {Object} Validation result
 */
export function validateAudioData(audioData) {
  const result = {
    valid: false,
    size: 0,
    issues: []
  };
  
  if (!audioData) {
    result.issues.push('No audio data provided');
    return result;
  }
  
  // Check if it's a Blob
  if (audioData instanceof Blob) {
    result.size = audioData.size;
    result.type = audioData.type;
    
    if (audioData.size === 0) {
      result.issues.push('Audio data is empty (0 bytes)');
    } else {
      result.valid = true;
    }
    
    if (!audioData.type) {
      result.issues.push('Audio MIME type is missing');
    } else if (!audioData.type.startsWith('audio/')) {
      result.issues.push(`Unexpected MIME type: ${audioData.type}`);
    }
  } 
  // Check if it's an ArrayBuffer
  else if (audioData instanceof ArrayBuffer) {
    result.size = audioData.byteLength;
    
    if (audioData.byteLength === 0) {
      result.issues.push('Audio data buffer is empty (0 bytes)');
    } else {
      result.valid = true;
    }
  }
  
  return result;
}

/**
 * Debug media recorder setup
 * @param {MediaRecorder} mediaRecorder - The MediaRecorder instance
 * @returns {Object} Debug information
 */
export function debugMediaRecorder(mediaRecorder) {
  if (!mediaRecorder) {
    return { error: 'MediaRecorder not provided' };
  }
  
  return {
    state: mediaRecorder.state,
    mimeType: mediaRecorder.mimeType,
    audioBitsPerSecond: mediaRecorder.audioBitsPerSecond,
    videoBitsPerSecond: mediaRecorder.videoBitsPerSecond,
    stream: mediaRecorder.stream ? 'Available' : 'Not available',
    events: {
      dataavailable: !!mediaRecorder.ondataavailable,
      error: !!mediaRecorder.onerror,
      pause: !!mediaRecorder.onpause,
      resume: !!mediaRecorder.onresume,
      start: !!mediaRecorder.onstart,
      stop: !!mediaRecorder.onstop
    }
  };
}
