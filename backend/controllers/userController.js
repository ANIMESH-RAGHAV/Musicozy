const mongoose = require('mongoose');
const User = require('../models/user');
const { inMemoryUsers } = require('./authController');

// Get Logged-in User Profile
async function getProfile(req, res) {
    try {
        if (mongoose.connection.readyState === 1) {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            return res.status(200).json({
                message: 'Profile fetched successfully',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile: user.profile,
                    baselineInterests: user.baselineInterests,
                    lastActiveAt: user.lastActiveAt,
                    createdAt: user.createdAt
                }
            });
        } else {
            const user = inMemoryUsers.find(u => u._id === req.userId) || inMemoryUsers[0];
            return res.status(200).json({
                message: 'Profile fetched successfully',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile: user.profile,
                    lastActiveAt: user.lastActiveAt
                }
            });
        }
    } catch (error) {
        console.error('Get profile error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

// Update Logged-in User Profile
async function updateProfile(req, res) {
    try {
        const { profile } = req.body || {};
        if (!profile || typeof profile !== 'object') {
            return res.status(400).json({ message: 'A valid profile object is required' });
        }

        if (mongoose.connection.readyState === 1) {
            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            user.profile = { ...user.profile, ...profile };
            await user.save();
            return res.status(200).json({
                message: 'Profile updated successfully',
                user: { id: user._id, username: user.username, email: user.email, profile: user.profile }
            });
        } else {
            const user = inMemoryUsers.find(u => u._id === req.userId) || inMemoryUsers[0];
            user.profile = { ...user.profile, ...profile };
            return res.status(200).json({
                message: 'Profile updated successfully',
                user: { id: user._id, username: user.username, email: user.email, profile: user.profile }
            });
        }
    } catch (error) {
        console.error('Update profile error:', error.message);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { getProfile, updateProfile };
