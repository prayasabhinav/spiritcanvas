const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    googleId: {
        type: String,
        required: true,
        unique: true
    },
    displayName: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    image: {
        type: String
    },
    selectedPathways: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pathway' 
    }],
    pathwayProgress: [{
        pathway: { type: mongoose.Schema.Types.ObjectId, ref: 'Pathway', required: true },
        cards: [{
            title: String,
            items: [{
                text: String,
                completed: Boolean
            }]
        }]
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', UserSchema);
