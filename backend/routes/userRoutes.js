const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getProfile, updateProfile } = require('../controllers/userController');


// Get logged-in user's profile
router.get('/profile', authMiddleware, getProfile);

// Update logged-in user's profile
router.put('/profile', authMiddleware, updateProfile);

module.exports = router;