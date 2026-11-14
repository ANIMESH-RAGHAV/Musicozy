const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    getFriends
} = require('../controllers/friendshipController');

// Send friend request
router.post('/:userId', authMiddleware, sendFriendRequest);

// Get received pending requests
router.get('/requests', authMiddleware, getFriendRequests);

// Accept or reject friend request
router.put('/:requestId', authMiddleware, respondToFriendRequest);

// Get accepted friends
router.get('/', authMiddleware, getFriends);

module.exports = router;
