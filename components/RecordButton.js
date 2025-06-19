import { AudioRecorder } from '../utils/recorder.js';

export class RecordButton {
  constructor(buttonElement, countdownElement) {
    this.buttonElement = buttonElement;
    this.countdownElement = countdownElement;
    this.recorder = new AudioRecorder();
    this.isRecording = false;
    
    this.buttonElement.addEventListener('click', () => this.toggleRecording());
  }
  
  async toggleRecording() {
    if (this.isRecording) {
      await this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  
  async startRecording() {
    // Show lightweight countdown indicator (non-blocking)
    this.countdownElement.style.display = 'inline';
    
    this.buttonElement.disabled = true;
    
    // Start with countdown, providing callbacks for updates
    await this.recorder.startRecording(3, 
      // Update count display
      (count) => {
        this.countdownElement.textContent = count;
      },
      // When countdown completes
      () => {
        this.isRecording = true;
        this.buttonElement.disabled = false;
        this.buttonElement.textContent = 'Stop Recording';
        this.countdownElement.style.display = 'none';
      }
    );
  }
  
  async stopRecording() {
    this.buttonElement.disabled = true;
    const audioBlob = await this.recorder.stopRecording();
    
    // Reset UI
    this.isRecording = false;
    this.buttonElement.disabled = false;
    this.buttonElement.textContent = 'Start Recording';
    
    // Do something with the recorded audio
    if (audioBlob) {
      // Process the audio
      console.log('Recording complete, audio blob size:', audioBlob.size);
    }
  }
}
