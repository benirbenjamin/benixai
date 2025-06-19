document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const recordContainer = document.getElementById('recordContainer');
    const versesInput = document.getElementById('versesCount');
    const bridgeCheckbox = document.getElementById('includeBridge');
    const setupButton = document.getElementById('setupTracksButton');
    const bpmInput = document.getElementById('bpmInput');
    const metronomeToggle = document.getElementById('metronomeToggle');
    const uploadStatus = document.getElementById('uploadStatus');
    
    // Recording variables
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingTrackId = null;
    let metronomeAudio = new Audio('/sounds/click.mp3');
    let metronomeInterval = null;
    let bpm = 90;
    let metronomeEnabled = true;
    
    // Setup event listeners
    if (setupButton) {
        setupButton.addEventListener('click', setupRecordingTracks);
    }
    
    if (metronomeToggle) {
        metronomeToggle.addEventListener('change', function() {
            metronomeEnabled = this.checked;
        });
    }
    
    if (bpmInput) {
        bpmInput.addEventListener('change', function() {
            bpm = parseInt(this.value) || 90;
            if (metronomeInterval) {
                stopMetronome();
                startMetronome();
            }
        });
    }
    
    // Setup recording tracks based on user input
    function setupRecordingTracks() {
        const versesCount = parseInt(versesInput.value) || 1;
        const includeBridge = bridgeCheckbox.checked;
        
        // Clear previous tracks
        recordContainer.innerHTML = '';
        
        // Create verse tracks
        for (let i = 1; i <= versesCount; i++) {
            createTrack(`verse-${i}`, `Verse ${i}`);
        }
        
        // Create bridge track if selected
        if (includeBridge) {
            createTrack('bridge', 'Bridge');
        }
        
        // Show recording instructions
        const instructions = document.createElement('div');
        instructions.className = 'alert alert-info mt-4';
        instructions.innerHTML = '<strong>Instructions:</strong> Record each part separately. Click the record button for each section.';
        recordContainer.appendChild(instructions);
    }
    
    // Create a recording track UI element
    function createTrack(id, label) {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track-container mb-4 p-3 border rounded';
        trackDiv.id = `track-${id}`;
        
        trackDiv.innerHTML = `
            <h4>${label}</h4>
            <canvas id="visualizer-${id}" width="600" height="80" class="w-100 mb-2"></canvas>
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span id="status-${id}" class="track-status">Ready to record</span>
                <span id="timer-${id}" class="track-timer">00:00</span>
            </div>
            <div class="btn-group">
                <button id="record-${id}" class="btn btn-danger record-button">
                    <i class="fas fa-microphone"></i> Record
                </button>
                <button id="pause-${id}" class="btn btn-warning pause-button" disabled>
                    <i class="fas fa-pause"></i> Pause
                </button>
                <button id="stop-${id}" class="btn btn-secondary stop-button" disabled>
                    <i class="fas fa-stop"></i> Stop
                </button>
            </div>
            <audio id="audio-${id}" class="mt-3 w-100" controls style="display: none;"></audio>
        `;
        
        recordContainer.appendChild(trackDiv);
        
        // Add event listeners to buttons
        const recordBtn = document.getElementById(`record-${id}`);
        const pauseBtn = document.getElementById(`pause-${id}`);
        const stopBtn = document.getElementById(`stop-${id}`);
        
        recordBtn.addEventListener('click', () => startRecording(id));
        pauseBtn.addEventListener('click', () => pauseRecording(id));
        stopBtn.addEventListener('click', () => stopRecording(id));
        
        // Setup canvas for visualization
        setupCanvas(id);
    }
    
    // Setup canvas for audio visualization
    function setupCanvas(trackId) {
        const canvas = document.getElementById(`visualizer-${trackId}`);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Start recording for a specific track
    async function startRecording(trackId) {
        // If already recording another track, stop it
        if (isRecording && recordingTrackId && recordingTrackId !== trackId) {
            await stopRecording(recordingTrackId);
        }
        
        try {
            // Reset variables
            audioChunks = [];
            
            // Update UI
            const statusEl = document.getElementById(`status-${trackId}`);
            const recordBtn = document.getElementById(`record-${trackId}`);
            const pauseBtn = document.getElementById(`pause-${trackId}`);
            const stopBtn = document.getElementById(`stop-${trackId}`);
            
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create media recorder
            mediaRecorder = new MediaRecorder(stream);
            
            // Listen for data
            mediaRecorder.ondataavailable = (e) => {
                audioChunks.push(e.data);
            };
            
            // When recording stops
            mediaRecorder.onstop = () => {
                processRecordedAudio(trackId);
            };
            
            // Start recording
            mediaRecorder.start(100);
            isRecording = true;
            recordingTrackId = trackId;
            
            // Start metronome if enabled
            if (metronomeEnabled) {
                startMetronome();
            }
            
            // Start timer
            startTimer(trackId);
            
            // Update UI
            statusEl.textContent = 'Recording...';
            statusEl.className = 'track-status text-danger';
            recordBtn.disabled = true;
            pauseBtn.disabled = false;
            stopBtn.disabled = false;
            
            // Start visualization
            startVisualization(stream, trackId);
            
        } catch (error) {
            console.error('Recording error:', error);
            document.getElementById(`status-${trackId}`).textContent = `Error: ${error.message}`;
        }
    }
    
    // Pause recording
    function pauseRecording(trackId) {
        if (!mediaRecorder || recordingTrackId !== trackId) return;
        
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.pause();
            
            // Update UI
            const statusEl = document.getElementById(`status-${trackId}`);
            const recordBtn = document.getElementById(`record-${trackId}`);
            const pauseBtn = document.getElementById(`pause-${trackId}`);
            
            statusEl.textContent = 'Paused';
            statusEl.className = 'track-status text-warning';
            pauseBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            
            // Pause timer
            clearInterval(window[`timer_interval_${trackId}`]);
            
            // Pause metronome
            stopMetronome();
            
        } else if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
            
            // Update UI
            const statusEl = document.getElementById(`status-${trackId}`);
            const pauseBtn = document.getElementById(`pause-${trackId}`);
            
            statusEl.textContent = 'Recording...';
            statusEl.className = 'track-status text-danger';
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            
            // Resume timer
            startTimer(trackId, document.getElementById(`timer-${trackId}`).textContent);
            
            // Resume metronome
            if (metronomeEnabled) {
                startMetronome();
            }
        }
    }
    
    // Stop recording
    function stopRecording(trackId) {
        return new Promise((resolve) => {
            if (!mediaRecorder || recordingTrackId !== trackId) {
                resolve();
                return;
            }
            
            // Add an onstop event handler to resolve the promise
            const originalOnstop = mediaRecorder.onstop;
            mediaRecorder.onstop = (e) => {
                if (originalOnstop) originalOnstop(e);
                resolve();
            };
            
            // Stop recording
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            
            // Update UI
            const statusEl = document.getElementById(`status-${trackId}`);
            const recordBtn = document.getElementById(`record-${trackId}`);
            const pauseBtn = document.getElementById(`pause-${trackId}`);
            const stopBtn = document.getElementById(`stop-${trackId}`);
            
            statusEl.textContent = 'Processing...';
            statusEl.className = 'track-status text-info';
            recordBtn.disabled = false;
            pauseBtn.disabled = true;
            stopBtn.disabled = true;
            
            // Reset recording state
            isRecording = false;
            recordingTrackId = null;
            
            // Stop timer
            clearInterval(window[`timer_interval_${trackId}`]);
            
            // Stop metronome
            stopMetronome();
        });
    }
    
    // Process the recorded audio
    function processRecordedAudio(trackId) {
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Update audio player
        const audioEl = document.getElementById(`audio-${trackId}`);
        audioEl.src = audioUrl;
        audioEl.style.display = 'block';
        
        // Update status
        const statusEl = document.getElementById(`status-${trackId}`);
        statusEl.textContent = 'Recorded';
        statusEl.className = 'track-status text-success';
        
        // Upload the recording
        uploadRecording(audioBlob, trackId);
    }
    
    // Upload recording to server
    async function uploadRecording(audioBlob, trackId) {
        try {
            uploadStatus.textContent = `Uploading ${trackId}...`;
            
            const formData = new FormData();
            formData.append('audio', audioBlob, `${trackId}-${Date.now()}.wav`);
            formData.append('trackId', trackId);
            
            const response = await fetch('/upload-audio', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                uploadStatus.textContent = `${trackId} uploaded successfully!`;
                
                // Store the file path in a data attribute for submission
                const trackElement = document.getElementById(`track-${trackId}`);
                trackElement.dataset.filepath = result.path;
                trackElement.dataset.filename = result.filename;
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } catch (error) {
            uploadStatus.textContent = `Upload error for ${trackId}: ${error.message}`;
            console.error('Upload error:', error);
        }
    }
    
    // Start visualization
    function startVisualization(stream, trackId) {
        const canvas = document.getElementById(`visualizer-${trackId}`);
        if (!canvas) return;
        
        const canvasCtx = canvas.getContext('2d');
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        function draw() {
            if (!isRecording || recordingTrackId !== trackId) {
                audioContext.close();
                return;
            }
            
            requestAnimationFrame(draw);
            
            analyser.getByteFrequencyData(dataArray);
            
            canvasCtx.fillStyle = '#f5f5f5';
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * canvas.height;
                
                canvasCtx.fillStyle = `rgb(${Math.min(255, dataArray[i] * 2)}, 50, 50)`;
                canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                
                x += barWidth + 1;
            }
        }
        
        draw();
    }
    
    // Timer functions
    function startTimer(trackId, startTime = '00:00') {
        // Clear any existing timer
        clearInterval(window[`timer_interval_${trackId}`]);
        
        const timerEl = document.getElementById(`timer-${trackId}`);
        let [minutes, seconds] = startTime.split(':').map(t => parseInt(t));
        let totalSeconds = minutes * 60 + seconds;
        
        window[`timer_interval_${trackId}`] = setInterval(() => {
            totalSeconds++;
            minutes = Math.floor(totalSeconds / 60);
            seconds = totalSeconds % 60;
            
            timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }
    
    // Metronome functions
    function startMetronome() {
        stopMetronome();
        
        const interval = 60000 / bpm; // Convert BPM to milliseconds
        
        // Play immediately
        playMetronomeSound();
        
        // Set interval for future beats
        metronomeInterval = setInterval(playMetronomeSound, interval);
    }
    
    function stopMetronome() {
        if (metronomeInterval) {
            clearInterval(metronomeInterval);
            metronomeInterval = null;
        }
    }
    
    function playMetronomeSound() {
        // Clone the audio to allow overlapping sounds
        const sound = metronomeAudio.cloneNode();
        sound.play().catch(e => console.log('Metronome playback prevented:', e));
    }
});
