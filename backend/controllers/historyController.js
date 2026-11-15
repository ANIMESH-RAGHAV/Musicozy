const mongoose = require('mongoose');
const History = require('../models/History');

// In-Memory history store for offline/local mode
let inMemoryHistory = [
    {
        _id: 'hist_1',
        userId: '65f1a2b3c4d5e6f7a8b9c0d1',
        trackId: 'dX3k_QDnzHE',
        title: 'Midnight City',
        artist: 'M83',
        genre: 'synthwave',
        actionType: 'play',
        actionWeight: 0.5,
        createdAt: new Date()
    },
    {
        _id: 'hist_2',
        userId: '65f1a2b3c4d5e6f7a8b9c0d1',
        trackId: 'PEM0Vs8jf1w',
        title: 'Golden Hour (Studio Acoustic)',
        artist: 'JVKE',
        genre: 'acoustic',
        actionType: 'complete',
        actionWeight: 1.0,
        createdAt: new Date(Date.now() - 3600000)
    }
];

// 1. Add Music Activity
async function addHistory(req, res) {
    try {
        const {
            trackId,
            title,
            artist,
            genre,
            previewUrl,
            coverUrl,
            durationSeconds,
            actionType,
            actionWeight
        } = req.body || {};

        if (!trackId || !title || !artist || !actionType) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        const safeGenre = genre || 'music';
        const safeWeight = typeof actionWeight === 'number' ? actionWeight : 0.5;
        const safeDuration = Number(durationSeconds) || 210;
        const currentUserId = req.userId || 'guest_user';

        if (mongoose.connection.readyState === 1) {
            const history = await History.create({
                userId: currentUserId,
                trackId,
                title,
                artist,
                genre: safeGenre,
                previewUrl: previewUrl || '',
                coverUrl: coverUrl || '',
                durationSeconds: safeDuration,
                actionType,
                actionWeight: safeWeight
            });

            return res.status(201).json({
                message: 'Music activity saved successfully',
                history
            });
        } else {
            // In-Memory store
            const newHist = {
                _id: 'hist_' + Date.now(),
                userId: currentUserId,
                trackId,
                title,
                artist,
                genre: safeGenre,
                previewUrl: previewUrl || '',
                coverUrl: coverUrl || '',
                durationSeconds: safeDuration,
                actionType,
                actionWeight: safeWeight,
                createdAt: new Date()
            };

            // Remove existing entry for same track and user to keep latest on top
            const existingIdx = inMemoryHistory.findIndex(
                h => h.trackId === trackId && h.userId === currentUserId
            );
            if (existingIdx !== -1) {
                inMemoryHistory.splice(existingIdx, 1);
            }

            inMemoryHistory.unshift(newHist);
            if (inMemoryHistory.length > 50) inMemoryHistory.pop();

            return res.status(201).json({
                message: 'Music activity saved successfully',
                history: newHist
            });
        }

    } catch (error) {
        console.error('Add history error:', error.message);
        return res.status(500).json({
            message: 'Internal server error: ' + error.message
        });
    }
}

// 2. Get User's Music History
async function getHistory(req, res) {
    try {
        const currentUserId = req.userId || 'guest_user';

        if (mongoose.connection.readyState === 1) {
            const query = (currentUserId !== 'guest_user')
                ? { userId: currentUserId }
                : { userId: 'guest_user' };

            const history = await History.find(query).sort({ createdAt: -1 });

            return res.status(200).json({
                count: history.length,
                history
            });
        } else {
            // Filter by user ID if logged in, or guest entries
            let userHistory = (currentUserId !== 'guest_user')
                ? inMemoryHistory.filter(h => h.userId === currentUserId)
                : inMemoryHistory.filter(h => h.userId === 'guest_user');

            // If no user-specific history found yet, fall back to default rotation
            if (userHistory.length === 0) {
                userHistory = inMemoryHistory;
            }

            return res.status(200).json({
                count: userHistory.length,
                history: userHistory
            });
        }

    } catch (error) {
        console.error('Get history error:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

// 3. Delete a History Entry
async function deleteHistory(req, res) {
    try {
        const historyId = req.params.historyId;

        if (mongoose.connection.readyState === 1) {
            const history = await History.findOneAndDelete({
                _id: historyId,
                userId: req.userId
            });

            if (!history) {
                return res.status(404).json({ message: 'History entry not found' });
            }

            return res.status(200).json({
                message: 'History entry deleted successfully',
                historyId: history._id
            });
        } else {
            inMemoryHistory = inMemoryHistory.filter(h => h._id !== historyId);
            return res.status(200).json({
                message: 'History entry deleted successfully',
                historyId
            });
        }

    } catch (error) {
        console.error('Delete history error:', error.message);
        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}

module.exports = {
    addHistory,
    getHistory,
    deleteHistory,
    inMemoryHistory
};
