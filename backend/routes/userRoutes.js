const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getProfile } = require('../controllers/userController');

// Get logged-in user's profile
router.get('/profile', authMiddleware, getProfile);

module.exports = router;