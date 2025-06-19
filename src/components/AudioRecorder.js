const React = require('react');
const { useState, useRef } = require('react');
const { toast } = require('react-toastify');

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error('Failed to start recording: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      toast.success('Recording stopped');
    }
  };

  const uploadAudio = async () => {
    if (!audioBlob) {
      toast.error('No recording to upload');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');

    try {
      const response = await fetch('/api/upload-audio', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      toast.success('Audio uploaded successfully');
    } catch (error) {
      toast.error('Upload failed: ' + error.message);
    }
  };

  return (
    <div className="audio-recorder">
      <div className="status-indicator">
        {isRecording && <span className="recording-indicator">Recording...</span>}
      </div>
      
      <div className="controls">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`record-button ${isRecording ? 'recording' : ''}`}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {audioBlob && (
          <button 
            onClick={uploadAudio}
            className="upload-button"
          >
            Upload Recording
          </button>
        )}
      </div>
    </div>
  );
};

module.exports = AudioRecorder;
