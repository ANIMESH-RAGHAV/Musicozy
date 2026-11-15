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


// Update Logged-in User Profile
async function updateProfile(req, res) {
    try {
        const { profile } = req.body;

        // Validate profile object
        if (
            !profile ||
            typeof profile !== 'object' ||
            Array.isArray(profile)
        ) {
            return res.status(400).json({
                message: 'A valid profile object is required'
            });
        }

        // Allow only specific profile fields
        const allowedFields = ['fullName', 'bio', 'avatarUrl'];
        const receivedFields = Object.keys(profile);

        if (
            receivedFields.length === 0 ||
            receivedFields.some(field => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: 'Invalid or missing profile fields'
            });
        }

        // Validate field data types
        for (const field of receivedFields) {
            if (typeof profile[field] !== 'string') {
                return res.status(400).json({
                    message: `${field} must be a string`
                });
            }
        }

        // Find authenticated user
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Update only the requested fields
        for (const field of receivedFields) {
            user.profile[field] = profile[field];
        }

        // Save and run Mongoose validation
        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profile: user.profile,
                baselineInterests: user.baselineInterests,
                lastActiveAt: user.lastActiveAt,
                updatedAt: user.updatedAt
            }
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error('Update profile error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


module.exports = { getProfile, updateProfile };