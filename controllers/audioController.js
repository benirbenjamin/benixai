const audioService = require('../services/audioService');

const audioController = {
  uploadAudio: async (req, res) => {
    try {
      const file = await audioService.handleAudioUpload(req, res);
      if (!file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      res.status(200).json({ 
        success: true, 
        message: 'Audio uploaded successfully',
        file: file.filename 
      });
    } catch (error) {
      res.status(500).json({ 
        error: error.message || 'Error uploading audio' 
      });
    }
  }
};

module.exports = audioController;
