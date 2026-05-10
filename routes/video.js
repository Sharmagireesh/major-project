const express = require('express');
const router = express.Router();
const Listing = require('../models/listing.js');
const CallRequest = require('../models/callRequest.js');
const { isLoggedIn } = require('../middleware.js');
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

router.get('/video/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params;
    const { callId } = req.query;
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

    let channelName = `listing-${listing._id}`;
    if (callId) {
        const call = await CallRequest.findById(callId);
        if (!call || !call.listing.equals(listing._id)) {
            req.flash('error', 'Invalid call request.');
            return res.redirect(`/listings/${id}`);
        }
        if (!call.owner.equals(req.user._id) && !call.caller.equals(req.user._id)) {
            req.flash('error', 'Not allowed to join this call.');
            return res.redirect(`/listings/${id}`);
        }
        if (isOwner && call.status === 'ringing') {
            call.status = 'accepted';
            await call.save();
        }
        if (!isOwner && call.status !== 'accepted') {
            req.flash('error', 'Owner has not accepted the call yet.');
            return res.redirect(`/calls/${call._id}/waiting`);
        }
        channelName = call.channelName;
    }

    res.render('video.ejs', { listing, isOwner, channelName, callId: callId || '' });
});

router.post('/agora-token', isLoggedIn, async (req, res) => {
    try {
        const { channelName, listingId, callId } = req.body;
        const listing = await Listing.findById(listingId).populate('owner');
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        const isOwner = listing.owner && listing.owner._id.equals(req.user._id);
        const hasBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));

        if (callId) {
            const call = await CallRequest.findById(callId);
            if (!call || !call.listing.equals(listing._id)) {
                return res.status(403).json({ error: 'Invalid call request' });
            }
            if (!call.owner.equals(req.user._id) && !call.caller.equals(req.user._id)) {
                return res.status(403).json({ error: 'Not allowed to access this call room' });
            }
            if (call.status !== 'accepted') {
                return res.status(403).json({ error: 'Call has not been accepted by owner yet' });
            }
        } else if (!isOwner && !hasBooked) {
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