// Get user's saved voice recordings
async function getSavedRecordings(req, res) {
    try {
        const userId = req.session.user.id;
        
        // Get all music generations that have original voice paths
        const recordings = await MusicGeneration.findVoiceRecordingsByUserId(userId);
        
        res.json({
            success: true,
            recordings: recordings.map(rec => ({
                id: rec.id,
                filePath: rec.original_voice_path,
                createdAt: rec.created_at
            }))
        });
    } catch (error) {
        console.error('Error getting saved recordings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recordings'
        });
    }
}
