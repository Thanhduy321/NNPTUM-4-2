let mongoose = require('mongoose');

let messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    to: {
        type: mongoose.Types.ObjectId,
        ref: 'user',
        required: true
    },
    messageContent: {
        type: {
            type: String,
            enum: ['text', 'file'],
            default: 'text'
        },
        text: {
            type: String,
            required: true
        }
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // timestamps tự động thêm trường createdAt và updatedAt

module.exports = mongoose.model('message', messageSchema);
