document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements - Song Structure
    const versesCount = document.getElementById('versesCount');
    const chorusCount = document.getElementById('chorusCount');
    const includeBridge = document.getElementById('includeBridge');
    const structureText = document.getElementById('structureText');
    
    // DOM Elements - Recording
    const currentSection = document.getElementById('currentSection');
    const visualizer = document.getElementById('visualizer');
    const recordButton = document.getElementById('recordButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const recordingStatus = document.getElementById('recordingStatus');
    const audioPreview = document.getElementById('audioPreview');
    const recordedSections = document.getElementById('recordedSections');
    
    // DOM Elements - Metronome
    const bpmInput = document.getElementById('bpmInput');
    const timeSignature = document.getElementById('timeSignature');
    const metronomeToggle = document.getElementById('metronomeToggle');
    
    // DOM Elements - Upload Progress
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    
    // DOM Elements - Generate Music
    const generateTrackBtn = document.getElementById('generateTrackBtn');
    const generationProgress = document.getElementById('generationProgress');
    const generationStatus = document.getElementById('generationStatus');
    
    // DOM Elements - Final Track
    const finalTrack = document.getElementById('finalTrack');
    const finalTrackStatus = document.getElementById('finalTrackStatus');
    const finalTrackButtons = document.getElementById('finalTrackButtons');
    const downloadTrackBtn = document.getElementById('downloadTrackBtn');
    const shareTrackBtn = document.getElementById('shareTrackBtn');
    
    // State variables
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let isPaused = false;
    let metronomeInterval = null;
    let audioContext = null;
    let canvasContext = visualizer?.getContext('2d');
    let recordedAudio = {};
    let metronomeActive = false;
    let songStructure = [];
    let beatCount = 0;
    
    // Audio playback functions
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
    
    // Initialize
    initializeApp();
    
    function initializeApp() {
        // Set up canvas if visualizer exists
        if (visualizer) {
            visualizer.width = visualizer.offsetWidth;
        }
        
        // Set up event listeners
        setupEventListeners();
        
        // Update song structure preview
        updateSongStructurePreview();
    }
    
    function setupEventListeners() {
        // Song structure events
        if (versesCount) versesCount.addEventListener('change', updateSongStructurePreview);
        if (chorusCount) chorusCount.addEventListener('change', updateSongStructurePreview);
        if (includeBridge) includeBridge.addEventListener('change', updateSongStructurePreview);
        
        // Recording events
        if (recordButton) recordButton.addEventListener('click', toggleRecording);
        if (pauseButton) pauseButton.addEventListener('click', togglePause);
        if (stopButton) stopButton.addEventListener('click', stopRecording);
        if (metronomeToggle) metronomeToggle.addEventListener('click', toggleMetronome);
        
        // Generate track event
        if (generateTrackBtn) generateTrackBtn.addEventListener('click', generateTrack);
        
        // Download track event
        if (downloadTrackBtn) downloadTrackBtn.addEventListener('click', downloadTrack);
        
        // Share track event
        if (shareTrackBtn) shareTrackBtn.addEventListener('click', shareTrack);
    }
    
    /**
     * Downloads the audio blob as a file
     * @param {Event} event - The click event
     */
    function downloadTrack(event) {
        event.preventDefault();
        
        // Use the final track audio element if available
        const finalTrack = document.getElementById('finalTrack');
        let audioSrc = finalTrack?.src;
        let filename = 'benixai-track.wav';
        
        if (!audioSrc) {
            // Fallback to the audio preview if final track is not available
            const audioPreview = document.getElementById('audioPreview');
            audioSrc = audioPreview?.src;
            filename = 'benixai-recording.wav';
        }
        
        if (!audioSrc) {
            console.error('No audio available to download');
            alert('No audio available to download');
            return;
        }
        
        // Fetch the audio data as a blob
        fetch(audioSrc)
            .then(response => response.blob())
            .then(blob => {
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
            })
            .catch(error => {
                console.error('Download error:', error);
                alert('Error downloading the audio');            });
    }
    
    // Share track function
    function shareTrack(event) {
        event.preventDefault();
        alert('Sharing functionality will be implemented in a future update.');
    }
    
    // Song Structure Functions
    function updateSongStructurePreview() {
        const verses = parseInt(versesCount.value || 2);
        const choruses = parseInt(chorusCount.value || 1);
        const bridge = includeBridge.checked;
        
        // Build the structure
        let structure = [];
        let structureTextArray = [];
        
        // First verse always comes first
        structure.push('verse1');
        structureTextArray.push('Verse 1');
        
        // First chorus
        structure.push('chorus');
        structureTextArray.push('Chorus');
        
        // Additional verses with choruses in between
        for (let i = 2; i <= verses; i++) {
            structure.push(`verse${i}`);
            structureTextArray.push(`Verse ${i}`);
            
            if (i < verses || choruses > 1) {
                structure.push('chorus');
                structureTextArray.push('Chorus');
            }
        }
        
        // Bridge before final chorus if included
        if (bridge) {
            structure.push('bridge');
            structureTextArray.push('Bridge');
            
            // Add final chorus if needed
            if (choruses > structure.filter(s => s === 'chorus').length) {
                structure.push('chorus');
                structureTextArray.push('Chorus');
            }
        }
        
        // Store the structure
        songStructure = structure;
        
        // Update UI
        if (structureText) {
            structureText.textContent = structureTextArray.join(' → ');
        }
        
        // Update dropdown
        updateSectionDropdown();
        
        // Check if any sections were recorded and update UI
        updateRecordedSectionsUI();
    }
    
    function updateSectionDropdown() {
        if (!currentSection) return;
        
        // Store current selection if any
        const currentlySelected = currentSection.value;
        
        // Clear dropdown
        currentSection.innerHTML = '';
        
        // Add unique sections
        const uniqueSections = [...new Set(songStructure)];
        uniqueSections.forEach(section => {
            const option = document.createElement('option');
            option.value = section;
            
            // Format display text
            if (section === 'chorus') {
                option.textContent = 'Chorus';
            } else if (section === 'bridge') {
                option.textContent = 'Bridge';
            } else {
                const verseNum = section.replace('verse', '');
                option.textContent = `Verse ${verseNum}`;
            }
            
            currentSection.appendChild(option);
        });
        
        // Restore selection if it still exists
        if (uniqueSections.includes(currentlySelected)) {
            currentSection.value = currentlySelected;
        }
    }
    
    // Recording Functions
    async function toggleRecording() {
        if (!isRecording) {
            await startRecording();
        } else {
            stopRecording();
        }
    }
    
    async function startRecording() {
        try {
            // Get the stream first to ensure microphone access before countdown
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Update UI to show we're preparing to record
            recordingStatus.textContent = 'Preparing to record...';
            recordingStatus.className = 'alert alert-warning text-center';
            
            // Start metronome automatically
            if (!metronomeActive) {
                startMetronome();
                metronomeToggle.innerHTML = '<i class="fas fa-stop"></i>';
                metronomeActive = true;
            }
            
            // Countdown before recording starts
            await countdownToRecord();
            
            // Reset audio chunks
            audioChunks = [];
            
            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };
            
            mediaRecorder.onstop = processRecording;
            
            // Start recording
            mediaRecorder.start(100);
            isRecording = true;
            isPaused = false;
            
            // Update UI
            recordButton.innerHTML = '<i class="fas fa-microphone-slash me-1"></i> Stop';
            recordButton.classList.add('btn-danger');
            pauseButton.disabled = false;
            stopButton.disabled = false;
            currentSection.disabled = true;
            recordingStatus.textContent = `Recording ${formatSectionName(currentSection.value)}...`;
            recordingStatus.className = 'alert alert-danger text-center';
            audioPreview.classList.add('d-none');
            
            // Start visualization
            startVisualization(stream);
            
        } catch (error) {
            recordingStatus.textContent = `Error: ${error.message}`;
            recordingStatus.className = 'alert alert-danger text-center';
            console.error('Recording error:', error);
        }
    }
    
    // Pre-recording countdown function
    function countdownToRecord() {
        return new Promise((resolve) => {
            let count = 4;  // 4 beat pre-count
            
            // Create countdown display
            const countdownElement = document.createElement('div');
            countdownElement.className = 'countdown-overlay';
            countdownElement.innerHTML = `<div class="countdown-number">${count}</div>`;
            document.body.appendChild(countdownElement);
            
            // Calculate interval based on current BPM setting
            const bpm = parseInt(bpmInput.value) || 90;
            const beatInterval = (60 / bpm) * 1000; // Convert BPM to milliseconds
            
            // Play first beat immediately
            playAccentedClick();
            updateCountdown(count);
            
            const countdownInterval = setInterval(() => {
                count--;
                
                if (count > 0) {
                    // Regular beats
                    playRegularClick();
                    updateCountdown(count);
                } else {
                    // Final beat (accent) before recording starts
                    playAccentedClick();
                    updateCountdown('GO');
                    
                    // Clean up
                    clearInterval(countdownInterval);
                    setTimeout(() => {
                        document.body.removeChild(countdownElement);
                        resolve();
                    }, beatInterval / 2);
                }
            }, beatInterval);
            
            function updateCountdown(value) {
                countdownElement.innerHTML = `<div class="countdown-number">${value}</div>`;
            }
        });
    }
    
    function togglePause() {
        if (!mediaRecorder) return;
        
        if (isPaused) {
            // Resume
            mediaRecorder.resume();
            isPaused = false;
            pauseButton.innerHTML = '<i class="fas fa-pause me-1"></i> Pause';
            recordingStatus.textContent = `Recording ${formatSectionName(currentSection.value)}...`;
        } else {
            // Pause
            mediaRecorder.pause();
            isPaused = true;
            pauseButton.innerHTML = '<i class="fas fa-play me-1"></i> Resume';
            recordingStatus.textContent = 'Recording paused';
        }
    }
    
    function stopRecording() {
        if (!mediaRecorder) return;
        
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        
        // Stop metronome when recording stops
        if (metronomeActive) {
            stopMetronome();
            metronomeToggle.innerHTML = '<i class="fas fa-play"></i>';
            metronomeActive = false;
        }
        
        // Reset UI
        isRecording = false;
        isPaused = false;
        recordButton.innerHTML = '<i class="fas fa-microphone me-1"></i> Record';
        recordButton.classList.remove('btn-danger');
        pauseButton.disabled = true;
        pauseButton.innerHTML = '<i class="fas fa-pause me-1"></i> Pause';
        stopButton.disabled = true;
        currentSection.disabled = false;
        recordingStatus.textContent = 'Processing recording...';
        recordingStatus.className = 'alert alert-info text-center';
        
        // Stop visualization
        if (window.animationFrame) {
            cancelAnimationFrame(window.animationFrame);
        }
    }
    
    function processRecording() {
        const section = currentSection.value;
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Store the recording
        recordedAudio[section] = {
            blob: audioBlob,
            url: audioUrl
        };
        
        // Update UI
        audioPreview.src = audioUrl;
        audioPreview.classList.remove('d-none');
        recordingStatus.textContent = `${formatSectionName(section)} recorded successfully!`;
        recordingStatus.className = 'alert alert-success text-center';
        
        // Update recorded sections
        updateRecordedSectionsUI();
        
        // Enable generate button if all sections are recorded
        checkIfAllSectionsRecorded();
        
        // Upload the recording
        uploadRecording(section, audioBlob);
    }
    
    async function uploadRecording(section, audioBlob) {
        try {
            // Show upload progress
            uploadProgress.classList.remove('d-none');
            uploadProgressBar.style.width = '0%';
            uploadProgressBar.textContent = '0%';
            
            // Create form data
            const formData = new FormData();
            formData.append('audio', audioBlob, `${section}.wav`);
            formData.append('section', section);
            
            // Use fetch with progress tracking via XHR
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', function(e) {
                if (e.lengthComputable) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100);
                    uploadProgressBar.style.width = percentComplete + '%';
                    uploadProgressBar.textContent = percentComplete + '%';
                }
            });
            
            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    // Success
                    setTimeout(() => {
                        uploadProgress.classList.add('d-none');
                    }, 2000);
                } else {
                    console.error('Upload failed:', xhr.statusText);
                }
            };
            
            xhr.onerror = function() {
                console.error('Upload network error');
                uploadProgress.classList.add('d-none');
            };
            
            xhr.open('POST', '/upload-audio');
            xhr.send(formData);
            
        } catch (error) {
            console.error('Upload error:', error);
            uploadProgress.classList.add('d-none');
        }
    }
    
    function updateRecordedSectionsUI() {
        if (!recordedSections) return;
        
        // Check if we have any recordings
        if (Object.keys(recordedAudio).length === 0 || songStructure.length === 0) {
            recordedSections.innerHTML = '<div class="alert alert-secondary text-center">No sections recorded yet</div>';
            return;
        }
        
        // Clear container
        recordedSections.innerHTML = '';
        
        // Create elements for each section in the structure
        songStructure.forEach(section => {
            const recording = recordedAudio[section];
            
            const card = document.createElement('div');
            card.className = 'card mb-2';
            
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body p-2';
            
            const rowDiv = document.createElement('div');
            rowDiv.className = 'd-flex justify-content-between align-items-center';
            
            const titleDiv = document.createElement('div');
            titleDiv.innerHTML = `<h6 class="mb-0">${formatSectionName(section)}</h6>`;
            
            const actionsDiv = document.createElement('div');
            
            rowDiv.appendChild(titleDiv);
            rowDiv.appendChild(actionsDiv);
            cardBody.appendChild(rowDiv);
            
            if (recording) {
                // Section has been recorded
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = recording.url;
                audio.className = 'w-100 mt-2';
                
                const rerecordBtn = document.createElement('button');
                rerecordBtn.className = 'btn btn-sm btn-outline-primary';
                rerecordBtn.innerHTML = '<i class="fas fa-redo"></i>';
                rerecordBtn.title = 'Re-record';
                rerecordBtn.onclick = () => {
                    currentSection.value = section;
                    recordButton.click();
                };
                
                actionsDiv.appendChild(rerecordBtn);
                cardBody.appendChild(audio);
                
                card.className = 'card mb-2 border-success';
            } else {
                // Not recorded yet
                const recordBtn = document.createElement('button');
                recordBtn.className = 'btn btn-sm btn-outline-danger';
                recordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                recordBtn.title = 'Record this section';
                recordBtn.onclick = () => {
                    currentSection.value = section;
                    recordButton.click();
                };
                
                const statusDiv = document.createElement('small');
                statusDiv.className = 'text-muted d-block mt-2';
                statusDiv.textContent = 'Not recorded yet';
                
                actionsDiv.appendChild(recordBtn);
                cardBody.appendChild(statusDiv);
                
                card.className = 'card mb-2 border-warning';
            }
            
            card.appendChild(cardBody);
            recordedSections.appendChild(card);
        });
    }
    
    function checkIfAllSectionsRecorded() {
        if (!generateTrackBtn) return;
        
        const allRecorded = songStructure.every(section => recordedAudio[section]);
        generateTrackBtn.disabled = !allRecorded;
        
        if (allRecorded) {
            generateTrackBtn.classList.add('btn-success');
            generateTrackBtn.classList.remove('btn-primary');
        } else {
            generateTrackBtn.classList.add('btn-primary');
            generateTrackBtn.classList.remove('btn-success');
        }
    }
    
    // Track Generation Functions
    function generateTrack() {
        if (generateTrackBtn.disabled) return;
        
        // Disable button during generation
        generateTrackBtn.disabled = true;
        
        // Show generation progress
        const generationContainer = document.querySelector('.generation-status');
        if (generationContainer) {
            generationContainer.classList.remove('d-none');
        }
        
        // Update status
        if (finalTrackStatus) {
            finalTrackStatus.textContent = 'Generating your track...';
            finalTrackStatus.className = 'alert alert-info';
        }
        
        // Get settings
        const genre = document.getElementById('genre')?.value || 'pop';
        const mood = document.getElementById('mood')?.value || 'happy';
        const complexity = document.getElementById('complexity')?.value || 'medium';
        
        // Create FormData to send all recorded audio sections
        const formData = new FormData();
        
        // Add all recorded audio sections to form data
        Object.entries(recordedAudio).forEach(([section, data]) => {
            formData.append(`audio_${section}`, data.blob, `${section}.wav`);
        });
        
        // Add generation parameters
        formData.append('genre', genre);
        formData.append('mood', mood);
        formData.append('complexity', complexity);
        
        // Start progress simulation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            
            if (generationProgress) {
                generationProgress.style.width = `${progress}%`;
                generationProgress.textContent = `${progress}%`;
            }
            
            if (generationStatus) {
                if (progress < 30) {
                    generationStatus.textContent = 'Analyzing vocal patterns...';
                } else if (progress < 60) {
                    generationStatus.textContent = `Creating ${genre} instrumental...`;
                } else if (progress < 90) {
                    generationStatus.textContent = 'Mixing vocals and instrumentals...';
                } else {
                    generationStatus.textContent = 'Finalizing track...';
                }
            }
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                
                // In production, you would make a real API call
                // For now, we'll simulate by calling our endpoint directly
                fetch('/api/generate-music', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        genre,
                        mood,
                        complexity
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server responded with status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (!data.success) {
                        throw new Error(data.error || 'Unknown error');
                    }
                    trackGenerationComplete(data);
                })
                .catch(error => {
                    console.error('Generation error:', error);
                    generationFailed(error.message);
                });
            }
        }, 300);
    }
    
    function trackGenerationComplete(data) {
        console.log('Track generation complete:', data);
        
        // Show success message
        if (finalTrackStatus) {
            finalTrackStatus.textContent = 'Track generated successfully!';
            finalTrackStatus.className = 'alert alert-success';
        }
        
        // Show the audio player with the track
        if (finalTrack) {
            // Make sure the src attribute has a valid URL
            finalTrack.src = data.trackUrl;
            
            // Add a cache-busting parameter to prevent browser caching
            finalTrack.src = finalTrack.src + '?t=' + new Date().getTime();
            
            // Show the audio element
            finalTrack.classList.remove('d-none');
            
            // Add event listeners to debug playback issues
            finalTrack.addEventListener('error', function(e) {
                console.error('Audio error event:', e);
                console.error('Audio error code:', finalTrack.error ? finalTrack.error.code : 'No error code');
                console.error('Audio error message:', finalTrack.error ? finalTrack.error.message : 'No error message');
                finalTrackStatus.textContent = `Error loading audio: ${finalTrack.error ? finalTrack.error.message : 'Unknown error'}`;
            });
            
            finalTrack.addEventListener('loadeddata', function() {
                console.log('Audio loaded successfully');
            });
            
            // Explicitly try to load the audio
            finalTrack.load();
        }
        
        // Show download/share buttons
        if (finalTrackButtons) {
            finalTrackButtons.classList.remove('d-none');
        }
        
        // Re-enable generate button
        if (generateTrackBtn) {
            generateTrackBtn.disabled = false;
        }
        
        // Hide progress indicators
        const generationContainer = document.querySelector('.generation-status');
        if (generationContainer) {
            setTimeout(() => {
                generationContainer.classList.add('d-none');
            }, 2000);
        }
    }
    
    function generationFailed(errorMessage) {
        // Show error message
        if (finalTrackStatus) {
            finalTrackStatus.textContent = `Generation failed: ${errorMessage}`;
            finalTrackStatus.className = 'alert alert-danger';
        }
        
        // Re-enable generate button
        if (generateTrackBtn) {
            generateTrackBtn.disabled = false;
        }
        
        // Hide progress indicators
        const generationContainer = document.querySelector('.generation-status');
        if (generationContainer) {
            generationContainer.classList.add('d-none');
        }
    }
    
    // Visualization Functions
    function startVisualization(stream) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (!canvasContext || !visualizer) return;
        
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvasContext.clearRect(0, 0, visualizer.width, visualizer.height);
        
        function draw() {
            if (!isRecording) return;
            
            window.animationFrame = requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasContext.fillStyle = '#f8f9fa';
            canvasContext.fillRect(0, 0, visualizer.width, visualizer.height);
            
            const barWidth = (visualizer.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * visualizer.height;
                
                canvasContext.fillStyle = `rgb(${Math.min(255, dataArray[i] * 2)}, 50, 50)`;
                canvasContext.fillRect(x, visualizer.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }
    
    // Metronome Functions
    function toggleMetronome() {
        if (metronomeActive) {
            stopMetronome();
            metronomeToggle.innerHTML = '<i class="fas fa-play"></i>';
            metronomeActive = false;
        } else {
            startMetronome();
            metronomeToggle.innerHTML = '<i class="fas fa-stop"></i>';
            metronomeActive = true;
        }
    }
    
    function startMetronome() {
        if (metronomeInterval) clearInterval(metronomeInterval);
        
        const bpm = parseInt(bpmInput.value) || 90;
        const signature = timeSignature.value || '4/4';
        const beatsPerBar = parseInt(signature.split('/')[0]) || 4;
        const interval = (60 / bpm) * 1000; // Convert BPM to milliseconds
        
        // Reset beat counter
        beatCount = 0;
        
        // Play first beat immediately
        playClick(true);
        
        // Set interval for subsequent beats
        metronomeInterval = setInterval(() => {
            beatCount = (beatCount + 1) % beatsPerBar;
            playClick(beatCount === 0);
        }, interval);
    }
    
    function stopMetronome() {
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
    }
    
    function playClick(isAccent) {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        
        // Higher pitch and volume for accented beats
        if (isAccent) {
            oscillator.frequency.value = 1000;
            gainNode.gain.value = 0.7;
        } else {
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.5;
        }
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const now = audioContext.currentTime;
        
        oscillator.start(now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.stop(now + 0.1);
    }
    
    // Helper functions
    function formatSectionName(section) {
        if (section === 'chorus') return 'Chorus';
        if (section === 'bridge') return 'Bridge';
        
        // Assuming format is "verseX"
        const verseNum = section.replace('verse', '');
        return `Verse ${verseNum}`;
    }
});
