const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const callRequestSchema = new Schema(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: true,
        },
        caller: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        channelName: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['ringing', 'accepted', 'rejected', 'cancelled'],
            default: 'ringing',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('CallRequest', callRequestSchema);
