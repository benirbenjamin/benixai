/**
 * BenixAI Custom Audio Player
 * A feature-rich audio player that replaces the native HTML5 audio element
 */

class BenixAudioPlayer {
  constructor(options = {}) {
    this.audioElement = null;
    this.container = null;
    this.title = options.title || 'Audio Player';
    this.onPlay = options.onPlay || null;
    this.onPause = options.onPause || null;
    this.onEnded = options.onEnded || null;
    this.autoDestroy = options.autoDestroy || false;
    
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.75; // Default volume - 75%
    this.speed = 1.0;  // Default playback speed
    
    // If the container element is provided, initialize player
    if (options.containerElement) {
      this.initPlayer(options.containerElement, options.audioSrc);
    }
  }
  
  /**
   * Initialize the custom audio player
   * @param {HTMLElement|string} containerElement - The container element or selector
   * @param {string} audioSrc - Optional initial audio source
   */
  initPlayer(containerElement, audioSrc = null) {
    // Get container element
    if (typeof containerElement === 'string') {
      this.container = document.querySelector(containerElement);
    } else {
      this.container = containerElement;
    }
    
    if (!this.container) {
      console.error('BenixAudioPlayer: Container element not found');
      return;
    }
    
    // Create the audio element
    this.audioElement = document.createElement('audio');
    this.audioElement.style.display = 'none';
    this.container.appendChild(this.audioElement);
    
    // Build player UI
    this.buildPlayerUI();
    
    // Add event listeners
    this.setupEventListeners();
    
    // Set audio source if provided
    if (audioSrc) {
      this.setAudioSource(audioSrc);
    }
  }
  
  /**
   * Build the player UI
   */
  buildPlayerUI() {
    this.container.classList.add('custom-audio-player');
    
    // Create player UI structure
    this.container.innerHTML = `
      <div class="player-title">${this.title}</div>
      <div class="controls-container">
        <button class="play-pause-btn" aria-label="Play">
          <i class="fas fa-play"></i>
        </button>
        <span class="time-display current-time">0:00</span>
        <div class="progress-container">
          <div class="progress-bar" style="width: 0%;">
            <div class="progress-thumb"></div>
          </div>
        </div>
        <span class="time-display duration">0:00</span>
      </div>
      <div class="additional-controls">
        <div class="volume-container">
          <button class="volume-btn" aria-label="Volume">
            <i class="fas fa-volume-up"></i>
          </button>
          <div class="volume-slider">
            <div class="volume-slider-fill" style="width: ${this.volume * 100}%;"></div>
          </div>
        </div>
        <button class="speed-btn">1x</button>
      </div>
    `;
    
    // Get references to UI elements
    this.elements = {
      playPauseBtn: this.container.querySelector('.play-pause-btn'),
      playPauseIcon: this.container.querySelector('.play-pause-btn i'),
      currentTimeDisplay: this.container.querySelector('.current-time'),
      durationDisplay: this.container.querySelector('.duration'),
      progressContainer: this.container.querySelector('.progress-container'),
      progressBar: this.container.querySelector('.progress-bar'),
      volumeBtn: this.container.querySelector('.volume-btn'),
      volumeIcon: this.container.querySelector('.volume-btn i'),
      volumeSlider: this.container.querySelector('.volume-slider'),
      volumeSliderFill: this.container.querySelector('.volume-slider-fill'),
      speedBtn: this.container.querySelector('.speed-btn')
    };
  }
  
  /**
   * Set up event listeners for the player
   */
  setupEventListeners() {
    // Audio element events
    this.audioElement.addEventListener('loadedmetadata', () => this.onLoadedMetadata());
    this.audioElement.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.audioElement.addEventListener('ended', () => this.onAudioEnded());
    this.audioElement.addEventListener('error', (e) => this.onAudioError(e));
    
    // Play/Pause button
    this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
    
    // Progress bar
    this.elements.progressContainer.addEventListener('click', (e) => this.onProgressClick(e));
    
    // Volume controls
    this.elements.volumeBtn.addEventListener('click', () => this.toggleMute());
    this.elements.volumeSlider.addEventListener('click', (e) => this.onVolumeClick(e));
    
    // Speed button
    this.elements.speedBtn.addEventListener('click', () => this.cyclePlaybackSpeed());
  }
  
  /**
   * Set the audio source
   * @param {string} src - The audio source URL
   */
  setAudioSource(src) {
    // Reset UI
    this.currentTime = 0;
    this.duration = 0;
    this.updateTimeDisplay();
    this.updateProgress();
    
    // Set new source
    this.audioElement.src = src;
    this.audioElement.load();
    
    // Attempt to enable audio fixes if available
    if (window.audioFix && typeof window.audioFix.applyAudioFixes === 'function') {
      window.audioFix.applyAudioFixes(this.audioElement);
    }
  }
  
  /**
   * Toggle play/pause
   */
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  /**
   * Play the audio
   */
  play() {
    const playPromise = this.audioElement.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.elements.playPauseIcon.classList.remove('fa-play');
          this.elements.playPauseIcon.classList.add('fa-pause');
          if (this.onPlay) this.onPlay();
        })
        .catch(error => {
          console.error('Error playing audio:', error);
          this.showError('Error playing audio. Please try again.');
        });
    }
  }
  
  /**
   * Pause the audio
   */
  pause() {
    this.audioElement.pause();
    this.isPlaying = false;
    this.elements.playPauseIcon.classList.remove('fa-pause');
    this.elements.playPauseIcon.classList.add('fa-play');
    if (this.onPause) this.onPause();
  }
  
  /**
   * Format time in seconds to MM:SS format
   * @param {number} timeInSeconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Update the time display
   */
  updateTimeDisplay() {
    this.elements.currentTimeDisplay.textContent = this.formatTime(this.currentTime);
    this.elements.durationDisplay.textContent = this.formatTime(this.duration);
  }
  
  /**
   * Update the progress bar
   */
  updateProgress() {
    const progress = (this.currentTime / this.duration) * 100 || 0;
    this.elements.progressBar.style.width = `${progress}%`;
  }
  
  /**
   * Handle progress bar click
   * @param {MouseEvent} e - Click event
   */
  onProgressClick(e) {
    const rect = this.elements.progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.audioElement.currentTime = pos * this.duration;
  }
  
  /**
   * Toggle mute state
   */
  toggleMute() {
    if (this.audioElement.volume > 0) {
      this.audioElement.volume = 0;
      this.elements.volumeIcon.classList.remove('fa-volume-up');
      this.elements.volumeIcon.classList.add('fa-volume-mute');
      this.elements.volumeSliderFill.style.width = '0%';
    } else {
      this.audioElement.volume = this.volume;
      this.elements.volumeIcon.classList.remove('fa-volume-mute');
      this.elements.volumeIcon.classList.add('fa-volume-up');
      this.elements.volumeSliderFill.style.width = `${this.volume * 100}%`;
    }
  }
  
  /**
   * Handle volume slider click
   * @param {MouseEvent} e - Click event
   */
  onVolumeClick(e) {
    const rect = this.elements.volumeSlider.getBoundingClientRect();
    this.volume = (e.clientX - rect.left) / rect.width;
    this.audioElement.volume = this.volume;
    this.elements.volumeSliderFill.style.width = `${this.volume * 100}%`;
    
    // Update icon
    if (this.volume === 0) {
      this.elements.volumeIcon.classList.remove('fa-volume-up');
      this.elements.volumeIcon.classList.add('fa-volume-mute');
    } else {
      this.elements.volumeIcon.classList.remove('fa-volume-mute');
      this.elements.volumeIcon.classList.add('fa-volume-up');
    }
  }
  
  /**
   * Cycle through playback speeds
   */
  cyclePlaybackSpeed() {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    let currentIndex = speeds.indexOf(this.speed);
    
    if (currentIndex === -1 || currentIndex >= speeds.length - 1) {
      currentIndex = 0;
    } else {
      currentIndex++;
    }
    
    this.speed = speeds[currentIndex];
    this.audioElement.playbackRate = this.speed;
    this.elements.speedBtn.textContent = `${this.speed}x`;
  }
  
  /**
   * Handle audio metadata loaded
   */
  onLoadedMetadata() {
    this.duration = this.audioElement.duration;
    this.updateTimeDisplay();
  }
  
  /**
   * Handle audio time update
   */
  onTimeUpdate() {
    this.currentTime = this.audioElement.currentTime;
    this.updateTimeDisplay();
    this.updateProgress();
  }
  
  /**
   * Handle audio ended event
   */
  onAudioEnded() {
    this.isPlaying = false;
    this.elements.playPauseIcon.classList.remove('fa-pause');
    this.elements.playPauseIcon.classList.add('fa-play');
    
    if (this.onEnded) this.onEnded();
    
    if (this.autoDestroy) {
      this.destroy();
    }
  }
  
  /**
   * Handle audio error
   * @param {Event} e - Error event
   */
  onAudioError(e) {
    console.error('Audio error:', e);
    this.showError('Error playing audio. Please check the file format or try again.');
    
    // Try to recover using audioFix utilities if available
    if (window.audioFix && typeof window.audioFix.recoverFromError === 'function') {
      window.audioFix.recoverFromError(this.audioElement);
    }
  }
  
  /**
   * Show error message within the player
   * @param {string} message - Error message
   */
  showError(message) {
    // Create error element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'audio-player-error alert alert-danger fade-in';
    errorDiv.textContent = message;
    
    // Clear any existing errors
    const existingError = this.container.querySelector('.audio-player-error');
    if (existingError) {
      existingError.remove();
    }
    
    // Show error
    this.container.appendChild(errorDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.classList.remove('fade-in');
        setTimeout(() => errorDiv.remove(), 300);
      }
    }, 5000);
  }
  
  /**
   * Destroy the player and clean up
   */
  destroy() {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement.remove();
    }
    
    if (this.container) {
      this.container.innerHTML = '';
      this.container.classList.remove('custom-audio-player');
    }
    
    this.audioElement = null;
    this.container = null;
    this.elements = null;
  }
}

// Make available globally
window.BenixAudioPlayer = BenixAudioPlayer;

// Initialize all players with data-audio-player attribute
document.addEventListener('DOMContentLoaded', () => {
  const playerElements = document.querySelectorAll('[data-audio-player]');
  
  playerElements.forEach(element => {
    const audioSrc = element.dataset.audioSrc || null;
    const title = element.dataset.title || 'Audio Player';
    
    new BenixAudioPlayer({
      containerElement: element,
      audioSrc: audioSrc,
      title: title,
      autoDestroy: false
    });
  });
});
