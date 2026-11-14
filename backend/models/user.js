
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({

    // Authentication Details
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [
            /^[a-zA-Z0-9_]+$/,
            'Username can contain only letters, numbers and underscores'
        ]
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            'Please enter a valid email address'
        ]
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false
    },

    // User Profile
    profile: {
        fullName: {
            type: String,
            trim: true,
            default: '',
            maxlength: [100, 'Full name cannot exceed 100 characters']
        },

        avatarUrl: {
            type: String,
            trim: true,
            default: '',
            validate: {
                validator: function(value) {
                    return value === '' || /^https?:\/\/\S+$/i.test(value);
                },
                message: 'Please enter a valid HTTP or HTTPS avatar URL'
            }
        },

        bio: {
            type: String,
            trim: true,
            default: '',
            maxlength: [300, 'Bio cannot exceed 300 characters']
        }
    },

    // Initial Music Preferences
    baselineInterests: {
        type: Map,
        of: {
            type: Number,
            min: [0, 'Interest value cannot be less than 0'],
            max: [1, 'Interest value cannot exceed 1']
        },
        default: {}
    },

    // User Activity
    lastActiveAt: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});


// Hash password before saving
userSchema.pre('save', async function() {

    // Hash only when password is modified
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});


// Compare entered password with stored hash
userSchema.methods.comparePassword = async function(enteredPassword) {

    return await bcrypt.compare(enteredPassword, this.password);
};


// Export User Model
module.exports = mongoose.model('User', userSchema);