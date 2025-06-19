/**
 * Enhanced Audio Recorder
 * Provides robust audio recording with error handling
 */
import { getMediaErrorDetails, validateAudioData, debugMediaRecorder } from './mediaErrorHandler.js';

export default class AudioRecorder {
  constructor(options = {}) {
    this.options = {
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000,
      ...options
    };
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.onError = options.onError || console.error;
    this.onDataAvailable = options.onDataAvailable || (() => {});
    this.onRecordingComplete = options.onRecordingComplete || (() => {});
  }
  
  async requestPermissions() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      this.onError({
        type: 'PERMISSION_ERROR',
        message: 'Could not get audio recording permissions',
        originalError: err
      });
      return false;
    }
  }
  
  async startRecording() {
    if (this.isRecording) {
      return false;
    }
    
    if (!this.stream) {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;
    }
    
    try {
      // Try to use the preferred mime type, fall back to standard types if not supported
      let mimeType = this.options.mimeType;
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Try other common formats
        const formats = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4'];
        for (const format of formats) {
          if (MediaRecorder.isTypeSupported(format)) {
            mimeType = format;
            console.warn(`Preferred mime type ${this.options.mimeType} not supported. Using ${mimeType} instead.`);
            break;
          }
        }
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: this.options.audioBitsPerSecond
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.onDataAvailable(event.data);
        } else {
          console.warn('Received empty audio data chunk');
        }
      };
      
      this.mediaRecorder.onerror = (event) => {
        const errorDetails = getMediaErrorDetails(event);
        this.onError(errorDetails);
      };
      
      // Capture recording state changes
      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        console.log('Recording started');
      };
      
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        console.log('Recording stopped');
        this.processRecording();
      };
      
      // Start recording with timeslice to get frequent data chunks
      this.mediaRecorder.start(1000); // Get data every second
      return true;
    } catch (err) {
      this.onError({
        type: 'RECORDER_INITIALIZATION_ERROR',
        message: 'Failed to initialize media recorder',
        originalError: err
      });
      return false;
    }
  }
  
  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      return true;
    }
    return false;
  }
  
  processRecording() {
    if (this.audioChunks.length === 0) {
      this.onError({
        type: 'NO_AUDIO_DATA',
        message: 'No audio data was recorded'
      });
      return;
    }
    
    const audioBlob = new Blob(this.audioChunks, { type: this.mediaRecorder.mimeType });
    const validation = validateAudioData(audioBlob);
    
    if (!validation.valid) {
      this.onError({
        type: 'INVALID_AUDIO_DATA',
        message: 'Recorded audio data is invalid',
        validation
      });
      return;
    }
    
    this.onRecordingComplete(audioBlob);
  }
  
  releaseResources() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }
  
  getDebugInfo() {
    return {
      isRecording: this.isRecording,
      hasStream: !!this.stream,
      chunksCount: this.audioChunks.length,
      totalSize: this.audioChunks.reduce((size, chunk) => size + chunk.size, 0),
      mediaRecorder: this.mediaRecorder ? debugMediaRecorder(this.mediaRecorder) : null,
      supportedMimeTypes: [
        'audio/webm', 
        'audio/ogg',
        'audio/wav',
        'audio/mp4'
      ].filter(type => MediaRecorder.isTypeSupported(type))
    };
  }
}
