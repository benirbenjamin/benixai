// Add this code to the existing document.addEventListener('DOMContentLoaded', function() { ... }) in audioRecorder.js

// Add the event listener for selected recordings
document.addEventListener('recording-selected', function(e) {
    // Update the UI to show the selected recording
    const selectedRecording = e.detail;
    
    if (selectedRecording && selectedRecording.filePath) {
        // Update the current recording path for use in generation
        window.selectedVoiceRecording = {
            id: selectedRecording.id,
            filePath: selectedRecording.filePath
        };
        
        // Enable the generate track button if we have a selected recording
        if (generateTrackBtn) {
            generateTrackBtn.disabled = false;
        }
        
        // Show a notification
        const notification = document.createElement('div');
        notification.className = 'alert alert-success alert-dismissible fade show';
        notification.innerHTML = `
            <strong>Voice Selected!</strong> You've selected a previously recorded voice track.
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        // Insert the notification at the top of the recording section
        const recordingCard = document.querySelector('.card-body');
        if (recordingCard) {
            recordingCard.prepend(notification);
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 150);
            }, 5000);
        }
    }
});

// Modify the generateTrack function to use the selected recording if available
function generateTrack() {
    if (!recordedAudio && !window.selectedVoiceRecording) {
        // Show error - no audio recorded or selected
        alert('Please record audio or select a saved recording first');
        return;
    }
    
    // Show generation UI
    document.querySelector('.generation-status').classList.remove('d-none');
    generationProgress.style.width = '10%';
    generationStatus.textContent = 'Uploading audio...';
    
    // Get parameters
    const genre = document.getElementById('genre')?.value || 'pop';
    const mood = document.getElementById('mood')?.value || 'happy';
    const complexity = document.getElementById('complexity')?.value || 'medium';
    const bpm = parseInt(bpmInput?.value) || 90;
    
    // Prepare the generation data
    let generationData = {
        genre,
        mood,
        tempo: bpm,
        complexity,
        songStructure: songStructure.join('-')
    };
    
    // Use the selected recording path if available, otherwise use the recorded audio
    if (window.selectedVoiceRecording && window.selectedVoiceRecording.filePath) {
        generationData.audioPath = window.selectedVoiceRecording.filePath;
        startGeneration(generationData);
    } else if (recordedAudio) {
        // Or upload the newly recorded audio
        uploadRecordedAudio(recordedAudio)
            .then(response => {
                if (response.success) {
                    generationData.audioPath = response.processingPath;
                    startGeneration(generationData);
                } else {
                    showError('Error uploading audio: ' + response.message);
                }
            })
            .catch(error => {
                showError('Upload failed: ' + error);
                resetGenerationUI();
            });
    }
}

// Add this function to update the song structure preview
function updateSongStructure() {
    // Update song structure based on UI selections
    const verses = parseInt(versesCount?.value) || 2;
    const choruses = parseInt(chorusCount?.value) || 1;
    const hasBridge = includeBridge?.checked || false;
    
    songStructure = [];
    
    // Build the structure array
    for (let i = 0; i < verses; i++) {
        songStructure.push(`verse${i+1}`);
        if (i < choruses) {
            songStructure.push('chorus');
        }
    }
    
    if (hasBridge) {
        songStructure.push('bridge');
        if (choruses > 0) {
            songStructure.push('chorus');
        }
    }
    
    return songStructure;
}
