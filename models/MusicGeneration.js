const { pool } = require('../config/database');
const path = require('path');
const fs = require('fs');

/**
 * MusicGeneration Model
 */
class MusicGeneration {
    /**
     * Create a new music generation record
     * @param {Object} data - Generation data
     * @returns {Promise<Object>} Created record
     */
    static async create(data) {
        try {
            const now = new Date();
              // Insert generation record
            const [result] = await pool.execute(
                `INSERT INTO music_generations 
                 (user_id, original_voice_path, instrumental_path, vocals_path, chorus_path, 
                  beat_path, final_song_path, song_structure, num_verses, has_bridge, has_chorus, bpm, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.userId,
                    data.originalVoicePath || null,
                    data.instrumentalPath || null,
                    data.vocalsPath || null,
                    data.chorusPath || null,
                    data.beatPath || null,
                    data.finalPath || null,
                    data.songStructure || 'verse',
                    data.numVerses || 1,
                    data.hasBridge ? 1 : 0,
                    data.hasChorus ? 1 : 0,
                    data.bpm || 90,
                    now
                ]
            );
            
            return {
                id: result.insertId,
                ...data,
                createdAt: now
            };
        } catch (error) {
            console.error('Error creating music generation record:', error);
            throw error;
        }
    }
    
    /**
     * Update a music generation record with new generated files
     * @param {number} id - Generation ID
     * @param {Object} data - New file paths
     * @returns {Promise<Object>} Updated record
     */
    static async update(id, data) {
        try {
            // Build update query dynamically based on provided data
            const updateFields = [];
            const values = [];
            
            if (data.instrumentalPath) {
                updateFields.push('instrumental_path = ?');
                values.push(data.instrumentalPath);
            }
            
            if (data.vocalsPath) {
                updateFields.push('vocals_path = ?');
                values.push(data.vocalsPath);
            }
            
            if (data.chorusPath) {
                updateFields.push('chorus_path = ?');
                values.push(data.chorusPath);
            }
            
            // Add generation ID to values
            values.push(id);
            
            // Update generation record
            await pool.execute(
                `UPDATE music_generations SET ${updateFields.join(', ')} WHERE id = ?`,
                values
            );
            
            // Get updated record
            const [rows] = await pool.execute(
                'SELECT * FROM music_generations WHERE id = ?',
                [id]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error updating music generation record:', error);
            throw error;
        }
    }
    
    /**
     * Get user's music generations
     * @param {number} userId - User ID
     * @param {number} limit - Maximum results
     * @param {number} offset - Pagination offset
     * @returns {Promise<Array>} Array of generations
     */
    static async getByUser(userId, limit = 10, offset = 0) {
        try {
            const [rows] = await pool.execute(
                `SELECT * FROM music_generations 
                 WHERE user_id = ? 
                 ORDER BY created_at DESC
                 LIMIT ? OFFSET ?`,
                [userId, limit, offset]
            );
            
            return rows;
        } catch (error) {
            console.error('Error getting user generations:', error);
            throw error;
        }
    }
      /**
     * Get generation by ID
     * @param {number} id - Generation ID
     * @returns {Promise<Object|null>} Generation record or null
     */
    static async getById(id) {
        try {
            const [rows] = await pool.execute(
                'SELECT * FROM music_generations WHERE id = ?',
                [id]
            );
            
            return rows.length ? rows[0] : null;
        } catch (error) {
            console.error('Error getting generation by ID:', error);
            throw error;
        }
    }

    /**
     * Count generations by user and date
     * @param {number} userId - User ID
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<number>} Count of generations
     */
    static async countByUserAndDate(userId, date) {
        try {
            const [rows] = await pool.execute(
                `SELECT COUNT(*) as count FROM music_generations 
                 WHERE user_id = ? AND DATE(created_at) = ?`,
                [userId, date]
            );
            
            return rows[0].count || 0;
        } catch (error) {
            console.error('Error counting generations:', error);
            throw error;
        }
    }
    
    /**
     * Find generations by user ID
     * @param {number} userId - User ID
     * @returns {Promise<Array>} Array of generations
     */
    static async findByUserId(userId) {
        return this.getByUser(userId);
    }

    /**
     * Delete generation by ID
     * @param {number} id - Generation ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteById(id) {
        try {
            await pool.execute(
                'DELETE FROM music_generations WHERE id = ?',
                [id]
            );
            return true;
        } catch (error) {
            console.error('Error deleting generation:', error);
            throw error;
        }
    }

    /**
     * Count music generations by date
     * @param {string} date - Date in YYYY-MM-DD format
     * @returns {Promise<number>} Count of generations on that date
     */
    static async countByDate(date) {
        try {
            const [rows] = await pool.execute(
                'SELECT COUNT(*) as count FROM music_generations WHERE DATE(created_at) = ?',
                [date]
            );
              return rows[0].count || 0;
        } catch (error) {
            console.error('Error counting generations by date:', error);
            throw error;
        }
    }
    
    /**
     * Find all voice recordings by a user
     * @param {number} userId - The user ID
     * @returns {Promise<Array>} - List of recordings with voice paths
     */
    static async findVoiceRecordingsByUserId(userId) {
        try {
            const [rows] = await pool.execute(
                `SELECT id, original_voice_path, created_at 
                 FROM music_generations 
                 WHERE user_id = ? AND original_voice_path IS NOT NULL
                 ORDER BY created_at DESC`,
                [userId]
            );
            
            return rows;
        } catch (error) {
            console.error('Error finding voice recordings:', error);
            throw error;
        }
    }
}

module.exports = MusicGeneration;
