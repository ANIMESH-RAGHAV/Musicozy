const mongoose = require('mongoose');
const Friendship = require('../models/Friendship');
const User = require('../models/user');

// 1. Send Friend Request
async function sendFriendRequest(req, res) {
    try {
        const recipientId = req.params.userId;
        const requesterId = req.userId;

        // Validate recipient ID
        if (!mongoose.isValidObjectId(recipientId)) {
            return res.status(400).json({
                message: 'Invalid user ID'
            });
        }

        // Prevent sending request to yourself
        if (requesterId === recipientId) {
            return res.status(400).json({
                message: 'You cannot send a friend request to yourself'
            });
        }

        // Check whether recipient exists
        const recipient = await User.findById(recipientId);

        if (!recipient) {
            return res.status(404).json({
                message: 'User not found'
            });
        }

        // Check existing requests in both directions
        const outgoing = await Friendship.findOne({
            requesterId,
            recipientId
        });

        const incoming = await Friendship.findOne({
            requesterId: recipientId,
            recipientId: requesterId
        });

        // Already friends
        if (
            outgoing?.status === 'accepted' ||
            incoming?.status === 'accepted'
        ) {
            return res.status(409).json({
                message: 'You are already friends'
            });
        }

        // Blocked users cannot send requests
        if (
            outgoing?.status === 'blocked' ||
            incoming?.status === 'blocked'
        ) {
            return res.status(403).json({
                message: 'Friend request is not allowed'
            });
        }

        // Request already sent
        if (outgoing?.status === 'pending') {
            return res.status(409).json({
                message: 'Friend request already sent'
            });
        }

        // Recipient has already sent us a request
        if (incoming?.status === 'pending') {
            return res.status(409).json({
                message: 'This user has already sent you a friend request'
            });
        }

        // Reuse previously rejected outgoing request
        if (outgoing?.status === 'rejected') {
            outgoing.status = 'pending';
            outgoing.respondedAt = null;

            await outgoing.save();

            return res.status(200).json({
                message: 'Friend request sent again',
                request: outgoing
            });
        }

        // Create a new friend request
        const request = await Friendship.create({
            requesterId,
            recipientId
        });

        return res.status(201).json({
            message: 'Friend request sent successfully',
            request
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Friend request already exists'
            });
        }

        console.error('Send friend request error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 2. Get Received Pending Requests
async function getFriendRequests(req, res) {
    try {
        const requests = await Friendship.find({
            recipientId: req.userId,
            status: 'pending'
        })
        .populate('requesterId', 'username profile')
        .sort({ createdAt: -1 });

        return res.status(200).json({
            count: requests.length,
            requests
        });

    } catch (error) {
        console.error('Get friend requests error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 3. Accept or Reject Friend Request
async function respondToFriendRequest(req, res) {
    try {
        const requestId = req.params.requestId;
        const { status } = req.body || {};

        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(400).json({
                message: 'Invalid request ID'
            });
        }

        // Only accepted or rejected status is allowed
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                message: 'Status must be accepted or rejected'
            });
        }

        // Only recipient can respond to a pending request
        const request = await Friendship.findOne({
            _id: requestId,
            recipientId: req.userId,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({
                message: 'Pending friend request not found'
            });
        }

        request.status = status;
        request.respondedAt = new Date();

        await request.save();

        return res.status(200).json({
            message: `Friend request ${status} successfully`,
            request
        });

    } catch (error) {
        console.error('Respond to friend request error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 4. Get Accepted Friends
async function getFriends(req, res) {
    try {
        const friendships = await Friendship.find({
            $or: [
                { requesterId: req.userId, status: 'accepted' },
                { recipientId: req.userId, status: 'accepted' }
            ]
        })
        .populate('requesterId', 'username profile')
        .populate('recipientId', 'username profile');

        const friends = friendships
            .map(friendship => {
                if (!friendship.requesterId || !friendship.recipientId) {
                    return null;
                }

                const friend =
                    friendship.requesterId._id.toString() === req.userId
                        ? friendship.recipientId
                        : friendship.requesterId;

                return {
                    friendshipId: friendship._id,
                    userId: friend._id,
                    username: friend.username,
                    profile: friend.profile,
                    friendsSince: friendship.respondedAt
                };
            })
            .filter(Boolean);

        return res.status(200).json({
            count: friends.length,
            friends
        });

    } catch (error) {
        console.error('Get friends error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


module.exports = {
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    getFriends
};
