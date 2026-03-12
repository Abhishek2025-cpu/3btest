const mongoose = require('mongoose');

const labelClientSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true,
        unique: true
    },
    labelName: {
        type: String,
        default: 'Label Client'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('LabelClient', labelClientSchema);