/**
 * Audio Transmission Service
 * Handles transmitting recorded audio to the AI service
 */
import { validateAudioData } from '../utils/mediaErrorHandler.js';

export default class AudioTransmissionService {
  constructor(apiEndpoint, options = {}) {
    this.apiEndpoint = apiEndpoint;
    this.options = {
      retries: 3,
      timeout: 30000, // 30 seconds
      onProgress: null,
      ...options
    };
  }
  
  /**
   * Transmits audio data to the AI service for processing
   * @param {Blob} audioBlob - The recorded audio blob
   * @returns {Promise<Object>} The response from the AI service
   */
  async transmitAudio(audioBlob) {
    // Validate the audio data before sending
    const validation = validateAudioData(audioBlob);
    if (!validation.valid) {
      throw new Error(`Invalid audio data: ${validation.issues.join(', ')}`);
    }
    
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    // Add metadata about the audio
    formData.append('format', audioBlob.type);
    formData.append('size', audioBlob.size);
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < this.options.retries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
        
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
        return await response.json();
      } catch (err) {
        lastError = err;
        console.error(`Attempt ${attempt} failed:`, err);
        
        // If this was an abort error (timeout), we include that in the message
        if (err.name === 'AbortError') {
          lastError = new Error(`Request timed out after ${this.options.timeout}ms`);
        }
        
        // If we have more retries, wait before trying again
        if (attempt < this.options.retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
    
    // If we get here, all retries failed
    throw new Error(`Failed to transmit audio after ${this.options.retries} attempts: ${lastError.message}`);
  }
  
  /**
   * Checks if the server is reachable and accepting audio
   * @returns {Promise<boolean>} Whether the server is available
   */
  async checkServerAvailability() {
    try {
      const response = await fetch(`${this.apiEndpoint}/status`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (err) {
      console.error('Server availability check failed:', err);
      return false;
    }
  }
  
  /**
   * Converts audio format if needed
   * @param {Blob} audioBlob - The original audio blob
   * @param {string} targetFormat - The target MIME type
   * @returns {Promise<Blob>} The converted audio blob
   */
  async convertAudioFormat(audioBlob, targetFormat) {
    return new Promise((resolve, reject) => {
      // Skip conversion if already in the right format
      if (audioBlob.type === targetFormat) {
        return resolve(audioBlob);
      }
      
      const fileReader = new FileReader();
      
      fileReader.onload = (event) => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        audioContext.decodeAudioData(event.target.result)
          .then(audioBuffer => {
            // Get audio data
            const numberOfChannels = audioBuffer.numberOfChannels;
            const length = audioBuffer.length;
            const sampleRate = audioBuffer.sampleRate;
            const channelData = [];
            
            // Get audio data for each channel
            for (let channel = 0; channel < numberOfChannels; channel++) {
              channelData.push(audioBuffer.getChannelData(channel));
            }
            
            // Create the WAV file
            const wavFile = this._createWavFile(channelData, sampleRate);
            
            // Create the appropriate MIME type
            const mimeType = targetFormat || 'audio/wav';
            const convertedBlob = new Blob([wavFile], { type: mimeType });
            
            resolve(convertedBlob);
          })
          .catch(error => {
            reject(new Error(`Audio conversion error: ${error.message}`));
          });
      };
      
      fileReader.onerror = () => {
        reject(new Error('Error reading audio file for conversion'));
      };
      
      fileReader.readAsArrayBuffer(audioBlob);
    });
  }
  
  /**
   * Creates a WAV file from PCM audio data
   * @private
   */
  _createWavFile(channelData, sampleRate) {
    const numChannels = channelData.length;
    const length = channelData[0].length;
    const bitsPerSample = 16;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    this._writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + dataSize, true);
    /* RIFF type */
    this._writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this._writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, byteRate, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitsPerSample, true);
    /* data chunk identifier */
    this._writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, dataSize, true);
    
    // Write the PCM samples
    const offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        const value = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset + (i * blockAlign) + (channel * bytesPerSample), value, true);
      }
    }
    
    return buffer;
  }
  
  /**
   * Write a string to a DataView at the specified offset
   * @private
   */
  _writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}
