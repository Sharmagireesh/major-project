const express = require('express');
const router = express.Router();
const Listing = require('../models/listing.js');
const { isLoggedIn } = require('../middleware.js');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

router.get('/video/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id).populate('owner');
    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }

    const isOwner = listing.owner && listing.owner._id.equals(req.user._id);
    const hasBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));
    if (!isOwner && !hasBooked) {
        req.flash('error', 'Book this listing first to start a video call with owner.');
        return res.redirect(`/listings/${id}`);
    }

    res.render('video.ejs', { listing, isOwner });
});

router.post('/agora-token', isLoggedIn, async (req, res) => {
    try {
        const { channelName, listingId } = req.body;
        const listing = await Listing.findById(listingId).populate('owner');
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const isOwner = listing.owner && listing.owner._id.equals(req.user._id);
        const hasBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));
        if (!isOwner && !hasBooked) {
            return res.status(403).json({ error: 'Not allowed to access this call room' });
        }

        const appId = process.env.AGORA_APP_ID;
        const appCertificate = process.env.AGORA_APP_CERTIFICATE;
        const userAccount = req.user._id.toString();

        if (!appId || !appCertificate) {
            return res.status(500).json({ error: 'Agora credentials are missing on server' });
        }

        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        const token = RtcTokenBuilder.buildTokenWithAccount(
            appId,
            appCertificate,
            channelName,
            userAccount,
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );

        res.json({ token, appId, userAccount });
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;