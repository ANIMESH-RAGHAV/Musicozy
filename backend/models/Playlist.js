const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({

    // User who owns the playlist
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },

    // Playlist details
    title: {
        type: String,
        required: [true, 'Playlist title is required'],
        trim: true,
        minlength: [1, 'Playlist title cannot be empty'],
        maxlength: [100, 'Playlist title cannot exceed 100 characters']
    },

    description: {
        type: String,
        trim: true,
        default: '',
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Songs inside the playlist
    tracks: [{
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

        addedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // Playlist visibility
    isPublic: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});


// Find a user's playlists by creation date
playlistSchema.index({
    userId: 1,
    createdAt: -1
});


module.exports = mongoose.model('Playlist', playlistSchema);