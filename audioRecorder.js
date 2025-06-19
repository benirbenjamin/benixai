// State variables
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let isPaused = false;
let finalAudio = null;

// Define the playAccentedClick function
function playAccentedClick(volume = 1.0) {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    
    setTimeout(() => {
      resolve();
      oscillator.disconnect();
      gainNode.disconnect();
    }, 100);
  });
}

// Define the playRegularClick function for regular metronome clicks
function playRegularClick(volume = 0.7) {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);
    
    setTimeout(() => {
      resolve();
      oscillator.disconnect();
      gainNode.disconnect();
    }, 80);
  });
}

// Define alias for compatibility with existing code
const playaccentedclic = playAccentedClick;

/**
 * Downloads the audio blob as a file
 * @param {Blob} blob - The audio blob to download
 * @param {string} filename - The filename to use for download
 */
function downloadTrack(blob, filename = 'recording.wav') {
  if (!blob) {
    console.error('No audio data to download');
    return;
  }
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  document.body.appendChild(a);
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

function setupEventListeners() {
  // Set up event listeners for UI elements
  const downloadTrackBtn = document.getElementById('downloadTrackBtn');
  if (downloadTrackBtn) {
    downloadTrackBtn.addEventListener('click', function() {
      // Get the audio blob from wherever it's stored in your application
      const audioBlob = getCurrentAudioBlob(); // You'll need to implement this function
      if (audioBlob) {
        downloadTrack(audioBlob, 'my-recording.wav');
      } else {
        console.error('No audio available to download');
      }
    });
  }
  
  // Add other event listeners as needed
}

/**
 * Returns the current audio blob from the application state
 * @returns {Blob|null} The audio blob if available, null otherwise
 */
function getCurrentAudioBlob() {
  // This is a placeholder function - you should modify it to return
  // the actual audio blob from wherever it's stored in your application
  
  // For example, if you have an audioChunks array:
  if (typeof audioChunks !== 'undefined' && audioChunks.length > 0) {
    return new Blob(audioChunks, { type: 'audio/wav' });
  }
  
  // Or if you have a finalAudio blob already stored:
  if (typeof finalAudio !== 'undefined' && finalAudio) {
    return finalAudio;
  }
  
  // If you store the audio in an HTML audio element:
  const audioElement = document.getElementById('audioPreview');
  if (audioElement && audioElement.src) {
    // This would need additional code to convert from the src to a blob
    // For now, we'll return null
    console.warn('Audio element exists but blob extraction not implemented');
    return null;
  }
  
  return null;
}

/**
 * Countdown timer before starting recording
 * @returns {Promise} A promise that resolves when the countdown is complete
 */
async function countdownToRecord() {
  return new Promise(async (resolve) => {
    let count = 4;  // 4 beat pre-count
    
    // Create countdown display if it doesn't exist yet
    let countdownElement = document.querySelector('.countdown-overlay');
    if (!countdownElement) {
      countdownElement = document.createElement('div');
      countdownElement.className = 'countdown-overlay';
      document.body.appendChild(countdownElement);
    }
    
    countdownElement.innerHTML = `<div class="countdown-number">${count}</div>`;
    countdownElement.style.display = 'flex';
    
    // Calculate interval based on current BPM setting
    const bpmInput = document.getElementById('bpmInput');
    const bpm = bpmInput ? (parseInt(bpmInput.value) || 90) : 90;
    const beatInterval = (60 / bpm) * 1000; // Convert BPM to milliseconds
    
    // Play first beat immediately
    try {
      await playAccentedClick();
      updateCountdown(count);
      
      const countdownInterval = setInterval(async () => {
        count--;
        
        if (count > 0) {
          // Regular beats
          try {
            await playRegularClick();
            updateCountdown(count);
          } catch (error) {
            console.error('Error playing regular click:', error);
          }
        } else {
          // End of countdown
          clearInterval(countdownInterval);
          countdownElement.style.display = 'none';
          resolve();
        }
      }, beatInterval);
    } catch (error) {
      console.error('Error in countdown:', error);
      countdownElement.style.display = 'none';
      resolve(); // Resolve anyway to allow recording
    }
  });
}

/**
 * Updates the countdown display
 * @param {number} count - The current count number
 */
function updateCountdown(count) {
  const countdownElement = document.querySelector('.countdown-overlay');
  if (countdownElement) {
    countdownElement.innerHTML = `<div class="countdown-number">${count}</div>`;
  }
}

/**
 * Starts the audio recording process
 * @returns {Promise} A promise that resolves when recording has started
 */
async function startRecording() {
  try {
    const recordingStatus = document.getElementById('recordingStatus');
    if (recordingStatus) {
      recordingStatus.textContent = 'Preparing to record...';
      recordingStatus.className = 'alert alert-info text-center';
    }

    // Show countdown before recording
    await countdownToRecord();

    // Request media stream with audio
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create media recorder
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    // Set up data handling
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    // Set up recorder completion handler
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      processRecording(audioBlob);
    };
    
    // Start recording
    mediaRecorder.start();
    isRecording = true;
    isPaused = false;
    
    // Update UI
    if (recordingStatus) {
      recordingStatus.textContent = 'Recording...';
      recordingStatus.className = 'alert alert-danger text-center';
    }
    
    // Start visualizer if available
    startVisualizer(stream);
    
  } catch (error) {
    console.error('Recording error:', error);
    const recordingStatus = document.getElementById('recordingStatus');
    if (recordingStatus) {
      recordingStatus.textContent = `Error: ${error.message || 'Could not start recording'}`;
      recordingStatus.className = 'alert alert-danger text-center';
    }
    throw error;
  }
}

/**
 * Toggles recording state (start/stop)
 * @returns {Promise} A promise that resolves when the toggle action is complete
 */
async function toggleRecording() {
  try {
    const recordButton = document.getElementById('recordButton');
    
    if (!isRecording) {
      // Start recording
      await startRecording();
      
      // Update button state
      if (recordButton) {
        recordButton.innerHTML = '<i class="fas fa-stop"></i> Stop';
        recordButton.classList.remove('btn-primary');
        recordButton.classList.add('btn-danger');
      }
    } else {
      // Stop recording
      stopRecording();
      
      // Update button state
      if (recordButton) {
        recordButton.innerHTML = '<i class="fas fa-microphone"></i> Record';
        recordButton.classList.remove('btn-danger');
        recordButton.classList.add('btn-primary');
      }
    }
  } catch (error) {
    console.error('Error toggling recording:', error);
    alert('Could not access microphone. Please ensure you have microphone access enabled.');
  }
}

/**
 * Stops the audio recording
 */
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    isPaused = false;
    
    // Update UI
    const recordingStatus = document.getElementById('recordingStatus');
    if (recordingStatus) {
      recordingStatus.textContent = 'Processing recording...';
      recordingStatus.className = 'alert alert-info text-center';
    }
  }
}

/**
 * Processes the recorded audio blob
 * @param {Blob} audioBlob - The recorded audio blob
 */
function processRecording(audioBlob) {
  if (!audioBlob) return;
  
  // Store the final audio blob
  finalAudio = audioBlob;
  
  // Create audio URL
  const audioUrl = URL.createObjectURL(audioBlob);
  
  // Update audio preview if available
  const audioPreview = document.getElementById('audioPreview');
  if (audioPreview) {
    audioPreview.src = audioUrl;
    audioPreview.style.display = 'block';
  }
  
  // Update UI
  const recordingStatus = document.getElementById('recordingStatus');
  if (recordingStatus) {
    recordingStatus.textContent = 'Recording complete!';
    recordingStatus.className = 'alert alert-success text-center';
  }
  
  // Show download/share buttons if available
  const finalTrackButtons = document.getElementById('finalTrackButtons');
  if (finalTrackButtons) {
    finalTrackButtons.style.display = 'flex';
  }
}

/**
 * Starts the audio visualizer if available
 * @param {MediaStream} stream - The media stream to visualize
 */
function startVisualizer(stream) {
  // Basic implementation - expand as needed
  const visualizer = document.getElementById('visualizer');
  if (!visualizer || !stream) return;
  
  console.log('Visualizer started with stream:', stream.id);
}