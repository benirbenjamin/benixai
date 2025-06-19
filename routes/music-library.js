const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth');
const { getMusicLibrary, deleteSong } = require('../controllers/recordController');

/**
 * @route   GET /music-library
 * @desc    Show user's music library
 * @access  Private
 */
router.get('/', checkAuth, getMusicLibrary);

/**
 * @route   DELETE /music-library/:id
 * @desc    Delete a song
 * @access  Private
 */
router.delete('/:id', checkAuth, deleteSong);

module.exports = router;
