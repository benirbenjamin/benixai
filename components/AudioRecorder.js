const audioService = require('../services/audioService');

class AudioRecorder {
    constructor() {
        this.isRecording = false;
        this.onStatusChange = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const recordButton = document.getElementById('recordButton');
        if (recordButton) {
            recordButton.addEventListener('click', () => this.toggleRecording());
        }
    }

    async toggleRecording() {
        try {
            if (!this.isRecording) {
                await this.startRecording();
            } else {
                await this.stopRecording();
            }
        } catch (error) {
            this.updateStatus('error', error.message);
        }
    }

    async startRecording() {
        try {
            await audioService.startRecording();
            this.isRecording = true;
            this.updateStatus('recording', 'Recording in progress...');
        } catch (error) {
            this.updateStatus('error', error.message);
        }
    }

    async stopRecording() {
        try {
            const audioBlob = await audioService.stopRecording();
            this.isRecording = false;
            this.updateStatus('stopped', 'Recording stopped');
            await this.uploadAudio(audioBlob);
        } catch (error) {
            this.updateStatus('error', error.message);
        }
    }

    async uploadAudio(audioBlob) {
        try {
            this.updateStatus('uploading', 'Uploading audio...');
            await audioService.uploadAudio(audioBlob);
            this.updateStatus('success', 'Audio uploaded successfully');
        } catch (error) {
            this.updateStatus('error', `Upload failed: ${error.message}`);
        }
    }

    updateStatus(status, message) {
        const statusElement = document.getElementById('recordingStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status ${status}`;
        }
    }
}

module.exports = new AudioRecorder();
