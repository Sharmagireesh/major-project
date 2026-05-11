const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapasync.js');
const Listing = require('../models/listing.js');
const CallRequest = require('../models/callRequest.js');
const { isLoggedIn } = require('../middleware.js');

router.post('/:listingId/initiate', isLoggedIn, wrapAsync(async (req, res) => {
    const { listingId } = req.params;
    const listing = await Listing.findById(listingId).populate('owner');
    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }

    const isOwner = listing.owner && listing.owner._id.equals(req.user._id);
    const hasBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));
    if (isOwner || !hasBooked) {
        req.flash('error', 'Only booked users can initiate a call to owner.');
        return res.redirect(`/listings/${listingId}`);
    }

    let call = await CallRequest.findOne({
        listing: listing._id,
        caller: req.user._id,
        owner: listing.owner._id,
        status: { $in: ['ringing', 'accepted'] },
    }).sort({ createdAt: -1 });

    if (!call) {
        call = await CallRequest.create({
            listing: listing._id,
            caller: req.user._id,
            owner: listing.owner._id,
            channelName: `listing-${listing._id}-${Date.now()}`,
            status: 'ringing',
        });
    }

    return res.redirect(`/calls/${call._id}/waiting`);
}));

router.get('/incoming', isLoggedIn, wrapAsync(async (req, res) => {
    const calls = await CallRequest.find({
        owner: req.user._id,
        status: 'ringing',
    })
        .populate('listing')
        .populate('caller')
        .sort({ createdAt: -1 });
    res.render('calls/incoming.ejs', { calls });
}));

router.post('/:id/respond', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    const call = await CallRequest.findById(id).populate('listing');
    if (!call) {
        req.flash('error', 'Call request not found.');
        return res.redirect('/calls/incoming');
    }
    if (!call.owner.equals(req.user._id)) {
        req.flash('error', 'Not allowed.');
        return res.redirect('/listings');
    }

    if (action === 'accept') {
        call.status = 'accepted';
        await call.save();
        return res.redirect(`/video/${call.listing._id}?callId=${call._id}`);
    }

    call.status = 'rejected';
    await call.save();
    req.flash('success', 'Call rejected.');
    return res.redirect('/calls/incoming');
}));

router.get('/:id/waiting', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const call = await CallRequest.findById(id).populate('listing');
    if (!call) {
        req.flash('error', 'Call request not found.');
        return res.redirect('/listings');
    }
    if (!call.caller.equals(req.user._id)) {
        req.flash('error', 'Not allowed.');
        return res.redirect('/listings');
    }
    res.render('calls/waiting.ejs', { call });
}));

router.get('/:id/status', isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const call = await CallRequest.findById(id);
    if (!call) {
        return res.status(404).json({ error: 'Call request not found' });
    }
    const allowed = call.owner.equals(req.user._id) || call.caller.equals(req.user._id);
    if (!allowed) {
        return res.status(403).json({ error: 'Not allowed' });
    }
    return res.json({
        status: call.status,
        listingId: call.listing,
        callId: call._id,
    });
}));

router.post('/:id/cancel', isLoggedIn, wrapAsync(async (req, res) => {
    const call = await CallRequest.findById(req.params.id);
    if (!call) {
        req.flash('error', 'Call request not found.');
        return res.redirect('/listings');
    }
    if (!call.caller.equals(req.user._id)) {
        req.flash('error', 'Not allowed.');
        return res.redirect('/listings');
    }
    if (call.status === 'ringing') {
        call.status = 'cancelled';
        await call.save();
    }
    req.flash('success', 'Call request cancelled.');
    return res.redirect(`/listings/${call.listing}`);
}));

module.exports = router;
