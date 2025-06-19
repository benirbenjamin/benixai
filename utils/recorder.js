import { playaccentedclic, playClick } from './audio.js';

export class AudioRecorder {
  // ...existing code...

  /**
   * Start recording with optional countdown
   * @param {number} countdownSeconds - Number of seconds to count before recording
   * @param {Function} onCountdown - Optional callback for countdown progress
   * @param {Function} onCountdownComplete - Callback when countdown is complete
   * @returns {Promise<boolean>} - Whether recording started successfully
   */
  async startRecording(countdownSeconds = 3, onCountdown = null, onCountdownComplete = null) {
    try {
      // Non-blocking countdown
      if (countdownSeconds > 0) {
        this.performCountdown(countdownSeconds, onCountdown, onCountdownComplete);
        return true; // Return early, actual recording will start after countdown
      }
      
      return this.beginRecording();
    } catch (error) {
      console.error('Error starting recording:', error);
      return false;
    }
  }
  
  /**
   * Performs countdown without blocking UI
   */
  async performCountdown(seconds, onCount, onComplete) {
    for (let i = seconds; i > 0; i--) {
      if (onCount) onCount(i);
      await playClick();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Start actual recording after countdown
    const success = await this.beginRecording();
    if (success && onComplete) onComplete();
    return success;
  }
  
  /**
   * Begin the actual recording process
   */
  async beginRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.isRecording = true;

      this.mediaRecorder.addEventListener('dataavailable', event => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.start();
      await playaccentedclic(); // Signal recording start
      return true;
    } catch (error) {
      console.error('Error beginning recording:', error);
      return false;
    }
  }

  // ...existing code...
}