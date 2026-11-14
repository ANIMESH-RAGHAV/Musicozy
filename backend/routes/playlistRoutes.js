const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
    createPlaylist,
    getMyPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist
} = require('../controllers/playlistController');

// Create playlist
router.post('/', authMiddleware, createPlaylist);

// Get all own playlists
router.get('/', authMiddleware, getMyPlaylists);

// Get a specific playlist
router.get('/:playlistId', authMiddleware, getPlaylistById);

// Update playlist
router.put('/:playlistId', authMiddleware, updatePlaylist);

// Delete playlist
router.delete('/:playlistId', authMiddleware, deletePlaylist);

module.exports = router;
