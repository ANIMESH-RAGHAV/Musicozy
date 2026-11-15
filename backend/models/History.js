
const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({

    // User who performed the music activity
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // Music track details
    trackId: {
        type: String,
        required: [true, 'Track ID is required'],
        trim: true
    },

    title: {
        type: String,
        required: [true, 'Track title is required'],
        trim: true,
        maxlength: [200, 'Track title cannot exceed 200 characters']
    },

    artist: {
        type: String,
        required: [true, 'Artist name is required'],
        trim: true,
        maxlength: [150, 'Artist name cannot exceed 150 characters']
    },

    genre: {
        type: String,
        required: [true, 'Genre is required'],
        trim: true,
        maxlength: [50, 'Genre cannot exceed 50 characters']
    },

    previewUrl: {
        type: String,
        trim: true,
        default: ''
    },

    coverUrl: {
        type: String,
        trim: true,
        default: ''
    },

    // Type of user activity
    actionType: {
        type: String,
        enum: {
            values: ['play', 'complete', 'like', 'skip', 'playlist_add'],
            message: 'Invalid music action type'
        },
        required: [true, 'Action type is required']
    },

    // Weight assigned to the activity for recommendations
    actionWeight: {
        type: Number,
        required: [true, 'Action weight is required'],
        min: [0, 'Action weight cannot be negative'],
        max: [1, 'Action weight cannot exceed 1']
    }

}, {
    timestamps: {
        createdAt: true,
        updatedAt: false
    }
});


// Find a user's history in chronological order
historySchema.index({
    userId: 1,
    createdAt: -1
});


// Export History Model
module.exports = mongoose.model('History', historySchema);
