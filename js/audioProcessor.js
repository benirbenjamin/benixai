/**
 * Audio Processor
 * Handles audio recording and transmission to AI service
 */
import AudioRecorder from '../utils/audioRecorder.js';
import AudioTransmissionService from '../services/audioTransmissionService.js';

// Configuration - update this with your actual API endpoint
const API_ENDPOINT = 'https://api.benixai.com/generate-song';

class AudioProcessor {
  constructor() {
    this.statusElement = document.getElementById('status-message') || this._createStatusElement();
    this.audioElement = document.getElementById('audio-player') || this._createAudioElement();
    this.setupRecorder();
    this.addEventListeners();
  }

  setupRecorder() {
    this.audioRecorder = new AudioRecorder({
      mimeType: 'audio/webm',
      audioBitsPerSecond: 128000,
      onError: (error) => {
        console.error('Recording error:', error);
        this.displayError(`Recording error: ${error.message}`);
      },
      onRecordingComplete: async (audioBlob) => {
        try {
          this.displayStatus('Processing your recording...');
          
          // Create transmission service
          const transmissionService = new AudioTransmissionService(API_ENDPOINT, {
            retries: 3,
            timeout: 60000, // 60 seconds timeout for AI processing
            onProgress: (progress) => {
              this.displayStatus(`Processing: ${progress}% complete`);
            }
          });
          
          // Check server availability
          this.displayStatus('Checking connection to AI service...');
          const isServerAvailable = await transmissionService.checkServerAvailability();
          if (!isServerAvailable) {
            this.displayError('AI service is currently unavailable. Please try again later.');
            return;
          }
          
          // Convert to WAV format for better compatibility with AI services
          this.displayStatus('Preparing audio for AI processing...');
          const processableAudio = await transmissionService.convertAudioFormat(audioBlob, 'audio/wav');
          
          // Send to AI service
          this.displayStatus('Generating AI song from your audio...');
          const response = await transmissionService.transmitAudio(processableAudio);
          
          // Process response
          if (response && response.songUrl) {
            this.displaySuccess('Your AI song has been generated!');
            this.playSong(response.songUrl);
          } else {
            this.displayError('Could not generate song from your recording.');
          }
        } catch (error) {
          console.error('AI processing error:', error);
          this.displayError(`Failed to generate song: ${error.message}`);
        }
      }
    });

    // Initialize transmission service
    this.transmissionService = new AudioTransmissionService(API_ENDPOINT);
  }

  addEventListeners() {
    // Add event listeners to buttons
    const startButton = document.getElementById('start-recording');
    const stopButton = document.getElementById('stop-recording');
    const debugButton = document.getElementById('debug-recording') || this._createDebugButton();
    
    if (startButton) {
      startButton.addEventListener('click', () => this.startRecording());
    }
    
    if (stopButton) {
      stopButton.addEventListener('click', () => this.stopRecording());
    }
    
    if (debugButton) {
      debugButton.addEventListener('click', () => this.showDebugInfo());
    }
  }

  async startRecording() {
    this.displayStatus('Starting recording...');
    const success = await this.audioRecorder.startRecording();
    if (success) {
      this.displayStatus('Recording... Speak now!');
    } else {
      this.displayError('Could not start recording. Please check your microphone permissions.');
    }
  }

  stopRecording() {
    this.displayStatus('Processing recording...');
    const success = this.audioRecorder.stopRecording();
    if (!success) {
      this.displayError('No active recording to stop.');
    }
  }

  showDebugInfo() {
    const debugInfo = this.audioRecorder.getDebugInfo();
    console.log('Audio recording debug info:', debugInfo);
    
    // Create a formatted string of debug info
    const formattedInfo = Object.entries(debugInfo)
      .map(([key, value]) => {
        if (typeof value === 'object') {
          return `${key}: ${JSON.stringify(value)}`;
        }
        return `${key}: ${value}`;
      })
      .join('\n');
    
    // Display debug info in the UI
    const debugElement = document.createElement('pre');
    debugElement.textContent = formattedInfo;
    debugElement.style.backgroundColor = '#f5f5f5';
    debugElement.style.padding = '10px';
    debugElement.style.borderRadius = '5px';
    debugElement.style.maxHeight = '300px';
    debugElement.style.overflow = 'auto';
    
    // Clear previous debug element if exists
    const existingDebugElement = document.getElementById('debug-info');
    if (existingDebugElement) {
      existingDebugElement.parentNode.removeChild(existingDebugElement);
    }
    
    // Add ID to the debug element
    debugElement.id = 'debug-info';
    
    // Add to the document
    document.body.appendChild(debugElement);
  }

  playSong(url) {
    if (this.audioElement) {
      this.audioElement.src = url;
      this.audioElement.play();
    }
  }

  displayStatus(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = 'status-message';
    } else {
      console.log('Status:', message);
    }
  }

  displayError(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = 'status-message error';
    } else {
      console.error('Error:', message);
    }
  }

  displaySuccess(message) {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = 'status-message success';
    } else {
      console.log('Success:', message);
    }
  }

  _createStatusElement() {
    const statusElement = document.createElement('div');
    statusElement.id = 'status-message';
    statusElement.className = 'status-message';
    document.body.appendChild(statusElement);
    return statusElement;
  }

  _createAudioElement() {
    const audioElement = document.createElement('audio');
    audioElement.id = 'audio-player';
    audioElement.controls = true;
    document.body.appendChild(audioElement);
    return audioElement;
  }

  _createDebugButton() {
    const debugButton = document.createElement('button');
    debugButton.id = 'debug-recording';
    debugButton.textContent = 'Debug Recording';
    debugButton.style.marginTop = '10px';
    document.body.appendChild(debugButton);
    return debugButton;
  }
}

// Initialize the audio processor when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.audioProcessor = new AudioProcessor();
});

export default AudioProcessor;
