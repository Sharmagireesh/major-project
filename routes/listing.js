const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapasync.js');
const Listing = require('../models/listing.js');
const { isLoggedIn , isOwner , validateListing} = require('../middleware.js');
const listingController = require('../controllers/listing.js');
const multer  = require('multer')
const {storage} = require('../cloudConfig.js');
const upload = multer({ storage })


router.route("/")
.get(wrapAsync(listingController.index))
.post( isLoggedIn,upload.single('listing[image]'),validateListing,wrapAsync(listingController.createListing));

// NEW ROUTE 
router.get("/new", isLoggedIn, listingController.renderNewForm);
router.get("/bookings/me", isLoggedIn, wrapAsync(listingController.myBookings));

// Geocode listing address for maps (server-side; Nominatim requires identifiable User-Agent)
router.get("/geocode", wrapAsync(async (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) {
        return res.status(400).json({ error: "Missing q" });
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, {
        headers: {
            Accept: "application/json",
            "User-Agent": process.env.NOMINATIM_USER_AGENT || "HimStays/1.0 (university project; +https://example.com/contact)",
        },
    });
    if (!r.ok) {
        return res.status(502).json({ error: "Geocoder unavailable" });
    }
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) {
        return res.json({
            lat: 31.1048,
            lon: 77.1734,
            display_name: "Shimla, Himachal Pradesh (approximate)",
            fallback: true,
        });
    }
    return res.json({
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        fallback: false,
    });
}));

router.post("/:id/book", isLoggedIn, wrapAsync(listingController.bookListing));
router.post("/:id/cancel-booking", isLoggedIn, wrapAsync(listingController.cancelBooking));

router.route("/:id")
.get(wrapAsync(listingController.showlisting))
.put( isLoggedIn,isOwner,upload.single('listing[image]'),validateListing,wrapAsync(listingController.updatelisting))
.delete(isLoggedIn, isOwner, wrapAsync(listingController.destroylisting));

// EDIT ROUTE
router.get("/:id/edit", isLoggedIn,isOwner, wrapAsync(listingController.editlisting));

module.exports = router;