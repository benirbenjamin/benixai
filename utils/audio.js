/**
 * Plays an accented click sound
 * @param {number} volume - Volume level between 0 and 1
 * @returns {Promise} - Promise that resolves when the sound has finished playing
 */
export const playaccentedclic = (volume = 1.0) => {
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
};

/**
 * Plays a regular click sound (lower pitch than accented)
 * @param {number} volume - Volume level between 0 and 1
 * @returns {Promise} - Promise that resolves when the sound has finished playing
 */
export const playClick = (volume = 0.7) => {
  return new Promise((resolve) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.08);
    
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
};
