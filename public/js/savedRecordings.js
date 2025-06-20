/**
 * Saved Recordings Manager
 * - Handles loading, displaying, and selecting previously recorded/uploaded voice samples
 */
class SavedRecordingsManager {
    constructor() {
        this.recordings = [];
        this.selectedRecordingId = null;
        this.containerElement = null;
        this.uploadFormElement = null;
    }

    /**
     * Initialize the saved recordings manager with DOM elements
     * @param {string} containerSelector - Selector for the container where recordings will be displayed
     * @param {string} uploadFormSelector - Selector for the file upload form
     */
    init(containerSelector, uploadFormSelector) {
        this.containerElement = document.querySelector(containerSelector);
        this.uploadFormElement = document.querySelector(uploadFormSelector);
        
        if (this.uploadFormElement) {
            // Set up file upload event listeners
            const fileInput = this.uploadFormElement.querySelector('input[type="file"]');
            const uploadBtn = this.uploadFormElement.querySelector('button[type="submit"]');
            
            if (fileInput && uploadBtn) {
                this.uploadFormElement.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.uploadFile(fileInput.files[0]);
                });
            }
        }
        
        // Load saved recordings on init
        this.loadSavedRecordings();
    }

    /**
     * Load saved recordings from the server
     */
    async loadSavedRecordings() {
        try {
            const response = await fetch('/record/saved-recordings');
            const data = await response.json();
            
            if (data.success) {
                this.recordings = data.recordings;
                this.renderRecordings();
            } else {
                console.error('Failed to load saved recordings:', data.message);
                this.showMessage('error', 'Failed to load saved recordings');
            }
        } catch (error) {
            console.error('Error loading saved recordings:', error);
            this.showMessage('error', 'Error loading saved recordings');
        }
    }

    /**
     * Render the saved recordings in the container
     */
    renderRecordings() {
        if (!this.containerElement) return;
        
        if (this.recordings.length === 0) {
            this.containerElement.innerHTML = `
                <div class="alert alert-info">
                    No saved voice recordings found. Record a new one or upload a file.
                </div>
            `;
            return;
        }
        
        // Create the recordings list
        const recordingsList = document.createElement('div');
        recordingsList.className = 'list-group saved-recordings-list';
        
        this.recordings.forEach(recording => {
            const date = new Date(recording.createdAt);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
            
            const recordingItem = document.createElement('div');
            recordingItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            recordingItem.dataset.id = recording.id;
            recordingItem.dataset.path = recording.filePath;
            
            if (recording.id === this.selectedRecordingId) {
                recordingItem.classList.add('active');
            }
            
            recordingItem.innerHTML = `
                <div>
                    <h6 class="mb-1">Recording from ${formattedDate}</h6>
                    <small class="text-muted">${this.getFilenameFromPath(recording.filePath)}</small>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary btn-play">
                        <i class="fas fa-play"></i>
                    </button>
                    <button class="btn btn-outline-primary btn-select">
                        <i class="fas fa-check"></i> Select
                    </button>
                </div>
            `;
            
            // Add event listeners for play and select buttons
            const playBtn = recordingItem.querySelector('.btn-play');
            const selectBtn = recordingItem.querySelector('.btn-select');
            
            playBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playRecording(recording.filePath);
            });
            
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectRecording(recording.id, recording.filePath);
            });
            
            recordingsList.appendChild(recordingItem);
        });
        
        this.containerElement.innerHTML = '';
        this.containerElement.appendChild(recordingsList);
    }
    
    /**
     * Get filename from a file path
     * @param {string} path - The file path
     * @returns {string} The filename
     */
    getFilenameFromPath(path) {
        return path.split('/').pop();
    }
    
    /**
     * Play a recording
     * @param {string} filePath - The path to the audio file
     */
    playRecording(filePath) {
        // Create a temporary audio element for playback
        const audio = new Audio();
        audio.src = filePath;
        audio.addEventListener('error', (e) => {
            console.error('Error playing audio:', e);
            this.showMessage('error', 'Error playing the recording');
        });
        audio.play();
    }
    
    /**
     * Select a recording for use
     * @param {string} id - The recording ID
     * @param {string} filePath - The path to the audio file
     */
    selectRecording(id, filePath) {
        this.selectedRecordingId = id;
        
        // Update UI to show selected recording
        const allItems = this.containerElement.querySelectorAll('.list-group-item');
        allItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id == id) {
                item.classList.add('active');
            }
        });
        
        // Trigger a custom event that the main app can listen for
        const event = new CustomEvent('recording-selected', { 
            detail: { id, filePath } 
        });
        document.dispatchEvent(event);
        
        this.showMessage('success', 'Recording selected! You can now use it for music generation.');
    }
    
    /**
     * Upload a voice file
     * @param {File} file - The audio file to upload
     */
    async uploadFile(file) {
        if (!file) {
            this.showMessage('error', 'Please select a file to upload');
            return;
        }
        
        // Check if it's an audio file
        if (!file.type.startsWith('audio/')) {
            this.showMessage('error', 'Please select an audio file');
            return;
        }
        
        try {
            // Create a FormData object
            const formData = new FormData();
            formData.append('audioFile', file);
            
            // Show upload progress
            this.showMessage('info', 'Uploading file...');
            
            // Upload the file
            const response = await fetch('/record/upload', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('success', 'File uploaded successfully!');
                // Reload the recordings list to include the new upload
                this.loadSavedRecordings();
            } else {
                this.showMessage('error', data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.showMessage('error', 'Error uploading file');
        }
    }
    
    /**
     * Display a message
     * @param {string} type - Message type (success, error, info, warning)
     * @param {string} message - The message text
     */
    showMessage(type, message) {
        // Find existing message container or create one
        let messageContainer = document.getElementById('savedRecordingsMessages');
        
        if (!messageContainer) {
            messageContainer = document.createElement('div');
            messageContainer.id = 'savedRecordingsMessages';
            messageContainer.className = 'mt-2';
            
            if (this.containerElement) {
                this.containerElement.parentNode.insertBefore(
                    messageContainer, 
                    this.containerElement.nextSibling
                );
            }
        }
        
        const alertClass = `alert-${type === 'error' ? 'danger' : type}`;
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert ${alertClass} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        messageContainer.innerHTML = '';
        messageContainer.appendChild(alertDiv);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            alertDiv.classList.remove('show');
            setTimeout(() => alertDiv.remove(), 150);
        }, 5000);
    }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.savedRecordings = new SavedRecordingsManager();
    
    // Initialize if the container exists
    const savedRecordingsContainer = document.getElementById('savedRecordingsContainer');
    const uploadForm = document.getElementById('voiceUploadForm');
    
    if (savedRecordingsContainer) {
        window.savedRecordings.init('#savedRecordingsContainer', '#voiceUploadForm');
    }
});
