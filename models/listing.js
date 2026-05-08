const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Review = require('./review.js');
const bookingSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        bookedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const listingSchema = new Schema({
    title: { type: String, required: true },
    description: String,
    image: {
        filename: String,
        url: String,
    },
    price:Number,
    location: String,
    country: String,
    reviews:[
        {
            type: Schema.Types.ObjectId,
            ref: 'Review',
        },
    ],
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    bookings: [bookingSchema],
    category: {
        type: String,
        enum: ["Trending", "Rooms", "Vibrant Hubs", "Castles", "Beaches", "Park", "Family-Friendly", "Great views"]
    }
});

listingSchema.post('findOneAndDelete', async (listing) => {
    if (listing) { 
        await Review.deleteMany({
        _id: {
            $in: listing.reviews
        }
    });
    }
});



const Listing = mongoose.model('Listing', listingSchema);
module.exports = Listing;