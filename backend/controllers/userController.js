const User = require('../models/user');

// Get Logged-in User Profile
async function getProfile(req, res) {
    try {
        // Find authenticated user
        const user = await User.findById(req.userId);

        // Check whether user exists
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Return profile without password
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

    } catch (error) {
        console.error('Get profile error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

module.exports = { getProfile };