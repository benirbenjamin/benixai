/**
 * Record Page JavaScript
 * Handles voice recording, metronome, file uploads, and music generation
 */

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startRecording');
    const stopButton = document.getElementById('stopRecording');
    const inputStatus = document.getElementById('inputStatus');
    const inputFilename = document.getElementById('inputFilename');
    
    // Initialize audio recording
    async function initializeRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                document.getElementById('recordedAudio').src = audioUrl;
                document.getElementById('recordingPlayback').classList.remove('d-none');
                
                // Update status
                inputStatus.textContent = 'Ready';
                inputStatus.className = 'badge bg-success';
                inputFilename.textContent = 'Recording completed';
                
                // Enable generation buttons
                document.querySelectorAll('[id^=generate]').forEach(btn => {
                    btn.disabled = false;
                });
            };
            
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            inputStatus.textContent = 'Error';
            inputStatus.className = 'badge bg-danger';
            inputFilename.textContent = 'Microphone access denied';
            return false;
        }
    }

    startButton.addEventListener('click', async () => {
        if (!mediaRecorder) {
            const initialized = await initializeRecording();
            if (!initialized) return;
        }
        
        audioChunks = [];
        mediaRecorder.start();
        isRecording = true;
        startButton.disabled = true;
        stopButton.disabled = false;
        inputStatus.textContent = 'Recording...';
        inputStatus.className = 'badge bg-danger';
    });

    stopButton.addEventListener('click', () => {
        mediaRecorder.stop();
        isRecording = false;
        startButton.disabled = false;
        stopButton.disabled = true;
    });

    // Handle file upload
    const audioFileInput = document.getElementById('audioFile');
    const uploadForm = document.getElementById('uploadForm');

    audioFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const audioUrl = URL.createObjectURL(file);
            document.getElementById('uploadedAudio').src = audioUrl;
            document.getElementById('uploadPreview').classList.remove('d-none');
            
            inputStatus.textContent = 'Ready';
            inputStatus.className = 'badge bg-success';
            inputFilename.textContent = file.name;
        }
    });

    uploadForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('audio', audioFileInput.files[0]);

        try {
            const response = await fetch('/api/upload-audio', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            
            // Enable generation buttons after successful upload
            document.querySelectorAll('[id^=generate]').forEach(btn => {
                btn.disabled = false;
            });
        } catch (error) {
            console.error('Upload error:', error);
            inputStatus.textContent = 'Error';
            inputStatus.className = 'badge bg-danger';
            inputFilename.textContent = 'Upload failed';
        }
    });
});
            window.benixSpace.showToast('Could not access microphone. Please check permissions.', 'danger');
        }
    }
    
    /**
     * Start recording
     */
    function startRecording() {
        // Reset audio chunks
        audioChunks = [];
        
        // Update UI
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        recordingPlayback.classList.add('d-none');
        recordingTimerElement.classList.remove('d-none');
        
        // Start recording timer
        recordingStartTime = Date.now();
        updateRecordingTime();
        recordingTimer = setInterval(updateRecordingTime, 1000);
        
        // Start recording
        recorder.start();
    }
    
    /**
     * Stop recording
     */
    function stopRecording() {
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
            
            // Update UI
            startRecordingBtn.disabled = false;
            stopRecordingBtn.disabled = true;
        }
    }
    
    /**
     * Update recording timer
     */
    function updateRecordingTime() {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        recordingTimerElement.textContent = `${minutes}:${seconds}`;
    }
    
    /**
     * Draw audio visualizer
     */
    function drawVisualizer() {
        // Resize canvas
        visualizerWidth = visualizerCanvas.width = visualizerCanvas.offsetWidth;
        visualizerHeight = visualizerCanvas.height = 100;
        
        // Draw function
        function draw() {
            // Request next frame
            requestAnimationFrame(draw);
            
            // Get audio data if recording
            if (analyser && recorder && recorder.state === 'recording') {
                analyser.getByteTimeDomainData(dataArray);
                
                // Clear canvas
                canvasCtx.fillStyle = '#f8f9fa';
                canvasCtx.fillRect(0, 0, visualizerWidth, visualizerHeight);
                
                // Draw waveform
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = '#0d6efd';
                canvasCtx.beginPath();
                
                const sliceWidth = visualizerWidth / dataArray.length;
                let x = 0;
                
                for (let i = 0; i < dataArray.length; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = v * visualizerHeight / 2;
                    
                    if (i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }
                    
                    x += sliceWidth;
                }
                
                canvasCtx.lineTo(visualizerWidth, visualizerHeight / 2);
                canvasCtx.stroke();
            } else {
                // Draw default line when not recording
                canvasCtx.fillStyle = '#f8f9fa';
                canvasCtx.fillRect(0, 0, visualizerWidth, visualizerHeight);
                
                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = '#dee2e6';
                canvasCtx.beginPath();
                canvasCtx.moveTo(0, visualizerHeight / 2);
                canvasCtx.lineTo(visualizerWidth, visualizerHeight / 2);
                canvasCtx.stroke();
            }
        }
        
        draw();
    }
    
    // ==============================
    // Metronome Functions
    // ==============================
    
    let metronomeInterval = null;
    let metronomeAudioContext = null;
    
    /**
     * Toggle metronome
     */
    function toggleMetronome() {
        if (metronomeToggle.checked) {
            startMetronome();
        } else {
            stopMetronome();
        }
    }
    
    /**
     * Start metronome
     */
    function startMetronome() {
        if (!metronomeAudioContext) {
            metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const bpm = parseInt(bpmInput.value) || 90;
        const intervalMs = (60 / bpm) * 1000;
        
        // Stop previous interval if exists
        stopMetronome();
        
        // Start new interval
        let beat = 0;
        metronomeInterval = setInterval(() => {
            // Play tick sound
            playTickSound(beat % 4 === 0 ? 880 : 440); // Higher pitch on first beat
            beat++;
        }, intervalMs);
    }
    
    /**
     * Stop metronome
     */
    function stopMetronome() {
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
    }
    
    /**
     * Play metronome tick sound
     * @param {number} frequency - Sound frequency
     */
    function playTickSound(frequency = 440) {
        if (!metronomeAudioContext) return;
        
        const oscillator = metronomeAudioContext.createOscillator();
        const gainNode = metronomeAudioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(metronomeAudioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gainNode.gain.value = 0.5;
        
        // Quick fade out
        gainNode.gain.exponentialRampToValueAtTime(0.001, metronomeAudioContext.currentTime + 0.1);
        
        oscillator.start();
        oscillator.stop(metronomeAudioContext.currentTime + 0.1);
    }
    
    /**
     * Update BPM value
     * @param {number} change - Amount to change BPM
     */
    function updateBPM(change) {
        let bpm = parseInt(bpmInput.value) || 90;
        bpm += change;
        
        // Limit to reasonable range
        bpm = Math.max(40, Math.min(220, bpm));
        
        bpmInput.value = bpm;
        
        // Restart metronome if active
        if (metronomeToggle.checked) {
            startMetronome();
        }
    }
    
    // ==============================
    // File Upload Functions
    // ==============================
    
    /**
     * Handle file upload
     * @param {Event} event - Form submission event
     */
    function handleFileUpload(event) {
        event.preventDefault();
        
        const file = audioFileInput.files[0];
        if (!file) {
            window.benixSpace.showToast('Please select an audio file', 'warning');
            return;
        }
        
        // Check file type
        if (!file.type.includes('audio/')) {
            window.benixSpace.showToast('Please select a valid audio file', 'danger');
            return;
        }
        
        // Update preview
        const url = URL.createObjectURL(file);
        uploadedAudio.src = url;
        uploadPreview.classList.remove('d-none');
        
        // Update generation status
        updateInputStatus('Ready', file.name);
        audioBlob = file;
    }
    
    // ==============================
    // Generation Functions
    // ==============================
    
    /**
     * Update input status for generation
     * @param {string} status - Status text
     * @param {string} filename - File name
     */
    function updateInputStatus(status, filename) {
        inputStatus.textContent = status;
        inputFilename.textContent = filename || 'No file selected';
        
        if (status === 'Ready') {
            inputStatus.className = 'badge bg-success';
            enableGenerationButtons();
        } else {
            inputStatus.className = 'badge bg-secondary';
            disableGenerationButtons();
        }
    }
    
    /**
     * Enable generation buttons
     */
    function enableGenerationButtons() {
        // First check subscription status from server
        checkGenerationAvailability().then(status => {
            if (status.active && status.songsRemaining > 0) {
                // Enable buttons based on features
                generateInstrumentalBtn.disabled = !status.features.instrumental;
                generateVocalsBtn.disabled = !status.features.vocal;
                generateChorusBtn.disabled = !status.features.chorus;
                
                // Add tooltips for disabled buttons
                if (!status.features.instrumental) {
                    generateInstrumentalBtn.setAttribute('data-bs-toggle', 'tooltip');
                    generateInstrumentalBtn.setAttribute('title', 'Feature not available in your plan');
                }
                
                if (!status.features.vocal) {
                    generateVocalsBtn.setAttribute('data-bs-toggle', 'tooltip');
                    generateVocalsBtn.setAttribute('title', 'Feature not available in your plan');
                }
                
                if (!status.features.chorus) {
                    generateChorusBtn.setAttribute('data-bs-toggle', 'tooltip');
                    generateChorusBtn.setAttribute('title', 'Feature not available in your plan');
                }
                
                // Initialize tooltips
                const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
                tooltips.forEach(tooltip => new bootstrap.Tooltip(tooltip));
            }
        });
    }
    
    /**
     * Disable generation buttons
     */
    function disableGenerationButtons() {
        generateInstrumentalBtn.disabled = true;
        generateVocalsBtn.disabled = true;
        generateChorusBtn.disabled = true;
    }
    
    /**
     * Check if user can generate more music
     * @returns {Promise<Object>} Subscription status
     */
    async function checkGenerationAvailability() {
        try {
            // Call API to check user subscription status
            return await window.benixSpace.apiCall('/api/user/status');
        } catch (error) {
            console.error('Error checking generation availability:', error);
            return {
                active: false,
                songsRemaining: 0,
                features: {
                    vocal: false,
                    instrumental: false,
                    chorus: false
                }
            };
        }
    }
    
    /**
     * Generate music (instrumental, vocals, or chorus)
     * @param {string} type - Type of generation (instrumental, vocals, chorus)
     */
    async function generateMusic(type) {
        if (!audioBlob) {
            window.benixSpace.showToast('Please record or upload audio first', 'warning');
            return;
        }
        
        // Show processing modal
        showProcessingModal(`Generating ${type}...`);
        
        // Get song structure from form
        const songData = getSongStructureData();
        
        try {
            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
            formData.append('type', type);
            formData.append('numVerses', songData.numVerses);
            formData.append('hasChorus', songData.hasChorus);
            formData.append('hasBridge', songData.hasBridge);
            formData.append('bpm', bpmInput.value || 90);
            
            // Call API to generate music
            const response = await fetch(`/api/music/generate/${type}`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to generate ${type}`);
            }
            
            const result = await response.json();
            
            // Hide processing modal
            hideProcessingModal();
            
            // Add to results section
            addGenerationResult(type, result.fileUrl, result.id);
            
            // Show results section
            resultsSection.classList.remove('d-none');
            
            // Show success message
            window.benixSpace.showToast(`${type} generated successfully!`, 'success');
            
            // Update subscription status
            updateSubscriptionDisplay();
            
        } catch (error) {
            console.error(`Error generating ${type}:`, error);
            hideProcessingModal();
            window.benixSpace.showToast(error.message || `Failed to generate ${type}`, 'danger');
        }
    }
    
    /**
     * Get song structure data from form
     * @returns {Object} Song structure data
     */
    function getSongStructureData() {
        return {
            numVerses: document.getElementById('numVerses').value || 2,
            hasChorus: document.getElementById('hasChorus').checked,
            hasBridge: document.getElementById('hasBridge').checked
        };
    }
    
    /**
     * Add generation result to results section
     * @param {string} type - Type of generation (instrumental, vocals, chorus)
     * @param {string} fileUrl - URL to generated audio file
     * @param {string} id - Generation ID
     */
    function addGenerationResult(type, fileUrl, id) {
        const resultCol = document.createElement('div');
        resultCol.className = 'col-md-6 col-lg-4 mb-3';
        
        // Set up icon and title based on type
        let icon, title;
        switch (type) {
            case 'instrumental':
                icon = 'fas fa-guitar';
                title = 'Instrumental Track';
                break;
            case 'vocals':
                icon = 'fas fa-microphone-alt';
                title = 'AI Vocals';
                break;
            case 'chorus':
                icon = 'fas fa-users';
                title = 'Chorus Harmonies';
                break;
            default:
                icon = 'fas fa-music';
                title = 'Generated Music';
        }
        
        resultCol.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">
                        <i class="${icon} me-2"></i>${title}
                    </h5>
                    <audio src="${fileUrl}" controls class="w-100 mb-3"></audio>
                    <div class="d-grid gap-2">
                        <a href="${fileUrl}" download class="btn btn-outline-primary btn-sm">
                            <i class="fas fa-download me-1"></i>Download
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        generatedResults.appendChild(resultCol);
    }
    
    /**
     * Show processing modal
     * @param {string} message - Processing message
     */
    function showProcessingModal(message) {
        const processingModal = document.getElementById('processingModal');
        const processingMessage = document.getElementById('processingMessage');
        
        processingMessage.textContent = message || 'Processing...';
        
        // Reset progress bar
        const progressBar = document.getElementById('processingProgress');
        progressBar.style.width = '0%';
        
        // Show modal
        const modal = new bootstrap.Modal(processingModal);
        modal.show();
        
        // Animate progress
        animateProgress();
    }
    
    /**
     * Hide processing modal
     */
    function hideProcessingModal() {
        const processingModal = document.getElementById('processingModal');
        const modal = bootstrap.Modal.getInstance(processingModal);
        
        if (modal) {
            modal.hide();
        }
    }
    
    /**
     * Animate progress bar
     */
    function animateProgress() {
        const progressBar = document.getElementById('processingProgress');
        const processingDetails = document.getElementById('processingDetails');
        let width = 0;
        
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
            } else {
                // Gradually slow down progress as it gets closer to 100%
                const increment = Math.max(0.1, (100 - width) / 50);
                width += increment;
                progressBar.style.width = width + '%';
                
                // Update processing message
                if (width < 30) {
                    processingDetails.textContent = 'Analyzing audio input...';
                } else if (width < 60) {
                    processingDetails.textContent = 'Generating AI music...';
                } else if (width < 90) {
                    processingDetails.textContent = 'Finalizing...';
                }
            }
        }, 200);
    }
    
    /**
     * Update subscription display
     */
    async function updateSubscriptionDisplay() {
        try {
            const status = await checkGenerationAvailability();
            
            // Update remaining songs alert
            const songsRemainingAlert = document.querySelector('.alert-info');
            if (songsRemainingAlert) {
                if (status.songsRemaining <= 0) {
                    songsRemainingAlert.className = 'alert alert-warning';
                    songsRemainingAlert.innerHTML = `
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Daily song limit reached!</strong> You've used all ${status.songsLimit} songs for today.
                        ${status.plan !== 'Premium' ? ' Consider <a href="/subscription" class="alert-link">upgrading</a> to a higher tier for more songs.' : ''}
                    `;
                    
                    // Disable generation buttons
                    disableGenerationButtons();
                } else {
                    songsRemainingAlert.innerHTML = `
                        <i class="fas fa-info-circle me-2"></i>
                        You have <strong>${status.songsRemaining} song generation${status.songsRemaining !== 1 ? 's' : ''}</strong> remaining today.
                    `;
                }
            }
        } catch (error) {
            console.error('Error updating subscription display:', error);
        }
    }
    
    // ==============================
    // Event Listeners
    // ==============================
    
    // Initialize recording when page loads
    initializeRecording();
    
    // Recording buttons
    if (startRecordingBtn) {
        startRecordingBtn.addEventListener('click', startRecording);
    }
    
    if (stopRecordingBtn) {
        stopRecordingBtn.addEventListener('click', stopRecording);
    }
    
    if (reRecordBtn) {
        reRecordBtn.addEventListener('click', () => {
            recordingPlayback.classList.add('d-none');
            startRecordingBtn.disabled = false;
            updateInputStatus('Not Ready');
        });
    }
    
    if (useRecordingBtn) {
        useRecordingBtn.addEventListener('click', () => {
            updateInputStatus('Ready', 'Recorded audio');
        });
    }
    
    // Metronome controls
    if (metronomeToggle) {
        metronomeToggle.addEventListener('change', toggleMetronome);
    }
    
    if (bpmInput) {
        bpmInput.addEventListener('change', () => {
            if (metronomeToggle.checked) {
                startMetronome();
            }
        });
    }
    
    if (decreaseBpmBtn) {
        decreaseBpmBtn.addEventListener('click', () => updateBPM(-5));
    }
    
    if (increaseBpmBtn) {
        increaseBpmBtn.addEventListener('click', () => updateBPM(5));
    }
    
    // File upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
    
    if (audioFileInput) {
        audioFileInput.addEventListener('change', () => {
            // Preview selected file
            const file = audioFileInput.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                uploadedAudio.src = url;
                uploadPreview.classList.remove('d-none');
            }
        });
    }
    
    // Generation buttons
    if (generateInstrumentalBtn) {
        generateInstrumentalBtn.addEventListener('click', () => generateMusic('instrumental'));
    }
    
    if (generateVocalsBtn) {
        generateVocalsBtn.addEventListener('click', () => generateMusic('vocals'));
    }
    
    if (generateChorusBtn) {
        generateChorusBtn.addEventListener('click', () => generateMusic('chorus'));
    }
    
    if (generateAnotherBtn) {
        generateAnotherBtn.addEventListener('click', () => {
            // Reset UI for new generation
            resultsSection.classList.add('d-none');
            generatedResults.innerHTML = '';
            audioBlob = null;
            updateInputStatus('Not Ready');
        });
    }
    
    // Check subscription status on page load
    updateSubscriptionDisplay();
    
    // Tab switching - reset input status when switching tabs
    const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', () => {
            audioBlob = null;
            updateInputStatus('Not Ready');
        });
    });
});
