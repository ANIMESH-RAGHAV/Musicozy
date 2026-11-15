const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const {
    addHistory,
    getHistory,
    deleteHistory
} = require('../controllers/historyController');

// Optional authentication middleware:
// If a valid JWT is provided, attaches req.userId.
// If absent or invalid, sets req.userId = 'guest_user' so guests can still track history.
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token && process.env.JWT_SECRET) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.userId = decoded.userId;
            } catch (err) {
                req.userId = 'guest_user';
            }
        } else {
            req.userId = 'guest_user';
        }
    } else {
        req.userId = 'guest_user';
    }
    next();
}

// Add music activity
router.post('/', optionalAuth, addHistory);

// Get user's music history
router.get('/', optionalAuth, getHistory);

// Delete a specific history entry
router.delete('/:historyId', optionalAuth, deleteHistory);

module.exports = router;
