const User = require('../models/user');
const jwt = require('jsonwebtoken');

// Signup Controller
async function signup(req, res) {
    try {
        const { username, email, password, profile } = req.body;

        // Check required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Username, email and password are required'
            });
        }

        // Check JWT secret configuration
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server authentication configuration error'
            });
        }

        // Normalize input
        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        // Check existing username or email
        const existingUser = await User.findOne({
            $or: [
                { username: normalizedUsername },
                { email: normalizedEmail }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'Username or email already exists'
            });
        }

        // Create user
        const user = new User({
            username: normalizedUsername,
            email: normalizedEmail,
            password,
            profile: profile || {}
        });

        // Save user (bcrypt pre-save hook hashes password)
        await user.save();

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Send response without password
        return res.status(201).json({
            message: 'Account created successfully',
            token,
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
        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Username or email already exists'
            });
        }

        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error('Signup error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// Login Controller
async function login(req, res) {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        // Check JWT secret configuration
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server authentication configuration error'
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Find user and explicitly include password
        const user = await User.findOne({
            email: normalizedEmail
        }).select('+password');

        // Verify password
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Update last active time
        user.lastActiveAt = new Date();
        await user.save();

        // Send response without password
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profile: user.profile,
                baselineInterests: user.baselineInterests,
                lastActiveAt: user.lastActiveAt
            }
        });

    } catch (error) {
        console.error('Login error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


module.exports = { signup, login };