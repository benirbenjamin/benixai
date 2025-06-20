/**
 * Apply fixes to audio elements
 * This function applies various fixes to prevent MEDIA_ELEMENT_ERROR and other audio issues
 */
function applyAudioFixes() {
    // If our audioFix module is loaded
    if (window.audioFix) {
        console.log('Applying audio fixes to prevent format errors...');
        
        // Fix all existing audio elements
        document.querySelectorAll('audio').forEach(audio => {
            window.audioFix.fixAudioElement(audio);
        });
        
        // Monitor DOM for new audio elements
        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.tagName === 'AUDIO') {
                        window.audioFix.fixAudioElement(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('audio').forEach(audio => {
                            window.audioFix.fixAudioElement(audio);
                        });
                    }
                });
            });
        });
        
        // Start observing the DOM
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Global error handler for audio elements
        window.addEventListener('error', function(event) {
            if (event.target && event.target.tagName === 'AUDIO') {
                console.log('Caught audio error event, applying fixes...');
                
                // Try to recover the audio element
                const audio = event.target;
                const originalSrc = audio.src;
                
                // Create error message element if it doesn't exist
                let errorMessage = document.getElementById('audioErrorMessage');
                if (!errorMessage) {
                    errorMessage = document.createElement('div');
                    errorMessage.id = 'audioErrorMessage';
                    errorMessage.className = 'alert alert-warning audio-error';
                    errorMessage.style.display = 'none';
                    document.body.appendChild(errorMessage);
                }
                
                // Show error message
                errorMessage.textContent = 'Audio format error detected. Trying to fix...';
                errorMessage.style.display = 'block';
                
                // If it's a blob URL, try to fetch and convert
                if (originalSrc.startsWith('blob:')) {
                    fetch(originalSrc)
                        .then(response => response.blob())
                        .then(blob => window.audioFix.convertToWav(blob))
                        .then(wavBlob => {
                            const newSrc = URL.createObjectURL(wavBlob);
                            audio.src = newSrc;
                            audio.load();
                            
                            errorMessage.textContent = 'Audio fixed! Playing...';
                            setTimeout(() => {
                                errorMessage.style.display = 'none';
                            }, 3000);
                        })
                        .catch(error => {
                            console.error('Error fixing audio:', error);
                            errorMessage.textContent = 'Could not fix audio format. Please try a different audio file.';
                        });
                } else {
                    // For non-blob URLs, try a different approach
                    setTimeout(() => {
                        audio.src = ''; // Clear the source
                        setTimeout(() => {
                            audio.src = originalSrc;
                            audio.load();
                        }, 500);
                    }, 500);
                }
            }
        }, true);
    } else {
        console.warn('Audio fix module not loaded');
    }
}
