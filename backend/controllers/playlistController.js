const mongoose = require('mongoose');
const Playlist = require('../models/Playlist');


// 1. Create Playlist
async function createPlaylist(req, res) {
    try {
        const { title, description, isPublic } = req.body || {};

        if (typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({
                message: 'Playlist title is required'
            });
        }

        if (
            description !== undefined &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                message: 'Description must be a string'
            });
        }

        if (
            isPublic !== undefined &&
            typeof isPublic !== 'boolean'
        ) {
            return res.status(400).json({
                message: 'isPublic must be a boolean'
            });
        }

        const playlist = await Playlist.create({
            userId: req.userId,
            title,
            description,
            isPublic
        });

        return res.status(201).json({
            message: 'Playlist created successfully',
            playlist
        });

    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error('Create playlist error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 2. Get All Playlists Of Logged-in User
async function getMyPlaylists(req, res) {
    try {
        const playlists = await Playlist.find({
            userId: req.userId
        }).sort({ createdAt: -1 });

        return res.status(200).json({
            count: playlists.length,
            playlists
        });

    } catch (error) {
        console.error('Get playlists error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 3. Get A Specific Playlist

async function getPlaylistById(req, res) {
    try {
        const { playlistId } = req.params;

        if (!mongoose.isValidObjectId(playlistId)) {
            return res.status(400).json({
                message: 'Invalid playlist ID'
            });
        }

        const playlist = await Playlist.findById(playlistId);

        if (!playlist) {
            return res.status(404).json({
                message: 'Playlist not found'
            });
        }

        const isOwner = playlist.userId.equals(req.userId);

        if (!isOwner && !playlist.isPublic) {
            return res.status(404).json({
                message: 'Playlist not found'
            });
        }

        return res.status(200).json({
            playlist
        });

    } catch (error) {
        console.error('Get playlist error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}



// 4. Update Playlist Details And Tracks
async function updatePlaylist(req, res) {
    try {
        const { playlistId } = req.params;
        const { title, description, isPublic, tracks } = req.body || {};

        if (!mongoose.isValidObjectId(playlistId)) {
            return res.status(400).json({
                message: 'Invalid playlist ID'
            });
        }

        const allowedFields = [
            'title',
            'description',
            'isPublic',
            'tracks'
        ];

        const receivedFields = Object.keys(req.body || {});

        if (
            receivedFields.length === 0 ||
            receivedFields.some(field => !allowedFields.includes(field))
        ) {
            return res.status(400).json({
                message: 'Provide valid playlist fields to update'
            });
        }

        if (
            title !== undefined &&
            (typeof title !== 'string' || !title.trim())
        ) {
            return res.status(400).json({
                message: 'Title must be a non-empty string'
            });
        }

        if (
            description !== undefined &&
            typeof description !== 'string'
        ) {
            return res.status(400).json({
                message: 'Description must be a string'
            });
        }

        if (
            isPublic !== undefined &&
            typeof isPublic !== 'boolean'
        ) {
            return res.status(400).json({
                message: 'isPublic must be a boolean'
            });
        }

        // Validate tracks array if provided
        if (tracks !== undefined) {
            if (!Array.isArray(tracks)) {
                return res.status(400).json({
                    message: 'Tracks must be an array'
                });
            }

            const allowedTrackFields = [
                'trackId',
                'title',
                'artist',
                'genre',
                'previewUrl',
                'coverUrl'
            ];

            const trackIds = new Set();

            for (const track of tracks) {
                if (
                    !track ||
                    typeof track !== 'object' ||
                    Array.isArray(track)
                ) {
                    return res.status(400).json({
                        message: 'Invalid track data'
                    });
                }

                const invalidFields = Object.keys(track).some(
                    field => !allowedTrackFields.includes(field)
                );

                if (invalidFields) {
                    return res.status(400).json({
                        message: 'Invalid track fields'
                    });
                }

                if (
                    typeof track.trackId !== 'string' ||
                    !track.trackId.trim() ||
                    typeof track.title !== 'string' ||
                    !track.title.trim() ||
                    typeof track.artist !== 'string' ||
                    !track.artist.trim() ||
                    typeof track.genre !== 'string' ||
                    !track.genre.trim()
                ) {
                    return res.status(400).json({
                        message: 'Track ID, title, artist and genre are required'
                    });
                }

                if (
                    (track.previewUrl !== undefined &&
                        typeof track.previewUrl !== 'string') ||
                    (track.coverUrl !== undefined &&
                        typeof track.coverUrl !== 'string')
                ) {
                    return res.status(400).json({
                        message: 'Track URLs must be strings'
                    });
                }

                const normalizedTrackId = track.trackId.trim();

                if (trackIds.has(normalizedTrackId)) {
                    return res.status(409).json({
                        message: 'Duplicate tracks are not allowed'
                    });
                }

                trackIds.add(normalizedTrackId);
            }
        }

        // Find playlist belonging to logged-in user
        const playlist = await Playlist.findOne({
            _id: playlistId,
            userId: req.userId
        });

        if (!playlist) {
            return res.status(404).json({
                message: 'Playlist not found'
            });
        }

        if (title !== undefined) {
            playlist.title = title;
        }

        if (description !== undefined) {
            playlist.description = description;
        }

        if (isPublic !== undefined) {
            playlist.isPublic = isPublic;
        }

        if (tracks !== undefined) {
            playlist.tracks = tracks;
        }

        await playlist.save();

        return res.status(200).json({
            message: 'Playlist updated successfully',
            playlist
        });

    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(400).json({
                message: error.message
            });
        }

        console.error('Update playlist error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


// 5. Delete Playlist
async function deletePlaylist(req, res) {
    try {
        const { playlistId } = req.params;

        if (!mongoose.isValidObjectId(playlistId)) {
            return res.status(400).json({
                message: 'Invalid playlist ID'
            });
        }

        const playlist = await Playlist.findOneAndDelete({
            _id: playlistId,
            userId: req.userId
        });

        if (!playlist) {
            return res.status(404).json({
                message: 'Playlist not found'
            });
        }

        return res.status(200).json({
            message: 'Playlist deleted successfully',
            playlistId: playlist._id
        });

    } catch (error) {
        console.error('Delete playlist error:', error.message);

        return res.status(500).json({
            message: 'Internal server error'
        });
    }
}


module.exports = {
    createPlaylist,
    getMyPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist
};
