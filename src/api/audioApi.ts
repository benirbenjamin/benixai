const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const uploadAudio = async (audioBlob: Blob): Promise<Response> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.wav');

  return fetch(`${API_URL}/api/upload-audio`, {
    method: 'POST',
    body: formData,
  });
};
