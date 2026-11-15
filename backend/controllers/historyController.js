const mongoose = require('mongoose');
const History = require('../models/History');

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
            actionType,
            actionWeight
        } = req.body || {};

        // Validate required fields
        if (
            !trackId ||
            !title ||
            !artist ||
            !genre ||
            !actionType ||
            actionWeight === undefined
        ) {
            return res.status(400).json({
                message: 'All required fields must be provided'
            });
        }

        // Validate string fields
        if (
            typeof trackId !== 'string' ||
            typeof title !== 'string' ||
            typeof artist !== 'string' ||
            typeof genre !== 'string' ||
            (previewUrl !== undefined && typeof previewUrl !== 'string') ||
            (coverUrl !== undefined && typeof coverUrl !== 'string')
        ) {
            return res.status(400).json({
                message: 'Invalid field types'
            });
        }

        // Validate action type
        const allowedActions = [
            'play',
            'complete',
            'like',
            'skip',
            'playlist_add'
        ];

        if (!allowedActions.includes(actionType)) {
            return res.status(400).json({
                message: 'Invalid action type'
            });
        }

        // Validate action weight
        if (
            typeof actionWeight !== 'number' ||
            !Number.isFinite(actionWeight) ||
            actionWeight < 0 ||
            actionWeight > 1
        ) {
            return res.status(400).json({
                message: 'Action weight must be between 0 and 1'
            });
        }

        // Save activity in database
        const history = await History.create({
            userId: req.userId,
            trackId,
            title,
            artist,
            genre,
            previewUrl,
            coverUrl,
            actionType,
            actionWeight
        });

        return res.status(201).json({
            message: 'Music activity saved successfully',
            history
        });

    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error('Add history error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 2. Get User's Music History
async function getHistory(req, res) {
    try {
        const history = await History.find({
            userId: req.userId
        })
        .sort({ createdAt: -1 });

        return res.status(200).json({
            count: history.length,
            history
        });

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

        // Validate history ID
        if (!mongoose.isValidObjectId(historyId)) {
            return res.status(400).json({
                message: 'Invalid history ID'
            });
        }

        // Delete only if the entry belongs to logged-in user
        const history = await History.findOneAndDelete({
            _id: historyId,
            userId: req.userId
        });

        if (!history) {
            return res.status(404).json({
                message: 'History entry not found'
            });
        }

        return res.status(200).json({
            message: 'History entry deleted successfully',
            historyId: history._id
        });

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
    deleteHistory
};
