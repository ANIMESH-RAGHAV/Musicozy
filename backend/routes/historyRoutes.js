const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
    addHistory,
    getHistory,
    deleteHistory
} = require('../controllers/historyController');

// Add music activity
router.post('/', authMiddleware, addHistory);

// Get user's music history
router.get('/', authMiddleware, getHistory);

// Delete a specific history entry
router.delete('/:historyId', authMiddleware, deleteHistory);

module.exports = router;
