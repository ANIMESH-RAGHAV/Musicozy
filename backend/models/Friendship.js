
const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema({

    // User who sends the friend request
    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Requester ID is required']
    },

    // User who receives the friend request
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Recipient ID is required'],
        validate: {
            validator: function(value) {
                return !this.requesterId || !value.equals(this.requesterId);
            },
            message: 'A user cannot send a friend request to themselves'
        }
    },

    // Current friendship status
    status: {
        type: String,
        enum: {
            values: ['pending', 'accepted', 'rejected', 'blocked'],
            message: 'Invalid friendship status'
        },
        default: 'pending',
        required: true
    },

    // When the request was responded to
    respondedAt: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});


// Prevent duplicate requests in the same direction
friendshipSchema.index(
    { requesterId: 1, recipientId: 1 },
    { unique: true }
);

// Find pending requests received by a user
friendshipSchema.index(
    { recipientId: 1, status: 1 }
);


// Export Friendship Model
module.exports = mongoose.model('Friendship', friendshipSchema);
