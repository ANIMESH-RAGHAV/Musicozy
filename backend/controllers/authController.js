const mongoose = require('mongoose');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// In-Memory store for when MongoDB is not running locally
const inMemoryUsers = [
    {
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        username: 'alexnaman',
        email: 'alex@example.com',
        passwordHash: bcrypt.hashSync('password123', 10),
        profile: {
            fullName: 'Alex Naman',
            bio: 'Audiophile & music curator',
            avatarUrl: ''
        },
        baselineInterests: { lofi: 0.8, acoustic: 0.9 },
        lastActiveAt: new Date()
    }
];

// Signup Controller
async function signup(req, res) {
    try {
        const { username, email, password, profile } = req.body || {};

        if (!username || !email || !password) {
            return res.status(400).json({
                message: 'Username, email and password are required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server authentication configuration error'
            });
        }

        const normalizedUsername = username.trim();
        const normalizedEmail = email.trim().toLowerCase();

        // Check if MongoDB is connected
        if (mongoose.connection.readyState === 1) {
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

            const user = new User({
                username: normalizedUsername,
                email: normalizedEmail,
                password,
                profile: profile || {}
            });

            await user.save();

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(201).json({
                message: 'Account created successfully',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile: user.profile
                }
            });
        } else {
            // In-Memory fallback
            const exists = inMemoryUsers.some(
                u => u.username === normalizedUsername || u.email === normalizedEmail
            );

            if (exists) {
                return res.status(409).json({
                    message: 'Username or email already exists'
                });
            }

            const newUser = {
                _id: new mongoose.Types.ObjectId().toString(),
                username: normalizedUsername,
                email: normalizedEmail,
                passwordHash: await bcrypt.hash(password, 10),
                profile: profile || { fullName: normalizedUsername, bio: '', avatarUrl: '' },
                lastActiveAt: new Date()
            };

            inMemoryUsers.push(newUser);

            const token = jwt.sign(
                { userId: newUser._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.status(201).json({
                message: 'Account created successfully',
                token,
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    profile: newUser.profile
                }
            });
        }

    } catch (error) {
        console.error('Signup error:', error.message);
        return res.status(500).json({
            message: 'Internal server error: ' + error.message
        });
    }
}

// Login Controller
async function login(req, res) {
    try {
        const { email, password } = req.body || {};

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                message: 'Email and password are required'
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                message: 'Server authentication configuration error'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // If MongoDB is connected
        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ email: normalizedEmail }).select('+password');

            if (!user || !(await user.comparePassword(password))) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            user.lastActiveAt = new Date();
            await user.save();

            return res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile: user.profile
                }
            });
        } else {
            // In-Memory fallback
            const user = inMemoryUsers.find(u => u.email === normalizedEmail);

            if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            const token = jwt.sign(
                { userId: user._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            user.lastActiveAt = new Date();

            return res.status(200).json({
                message: 'Login successful',
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    profile: user.profile
                }
            });
        }

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({
            message: 'Internal server error: ' + error.message
        });
    }
}

module.exports = { signup, login, inMemoryUsers };
