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

router.route("/:id")
.get(wrapAsync(listingController.showlisting))
.put( isLoggedIn,isOwner,upload.single('listing[image]'),validateListing,wrapAsync(listingController.updatelisting))
.delete(isLoggedIn, isOwner, wrapAsync(listingController.destroylisting));

// EDIT ROUTE
router.get("/:id/edit", isLoggedIn,isOwner, wrapAsync(listingController.editlisting));

module.exports = router;