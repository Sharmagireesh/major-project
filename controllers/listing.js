const Listing = require("../models/listing");


module.exports.index = async (req, res) => {
    const { category, q } = req.query;
    const filter = {};

    if (category) {
        filter.category = category;
    }

    if (q) {
        // Search across title, location, and country, case-insensitively
        filter.$or = [
            { title: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
            { country: { $regex: q, $options: "i" } }
        ];
    }

    const alllistings = await Listing.find(filter);

    if (alllistings.length === 0 && (category || q)) {
        req.flash("error", "No listings found for your criteria.");
    }
    
    res.render("listings/index.ejs", { alllistings, category, searchQuery: q });
};

module.exports.myBookings = async (req, res) => {
    const alllistings = await Listing.find({ "bookings.user": req.user._id });
    res.render("listings/bookings.ejs", { alllistings });
};

module.exports.renderNewForm = (req, res) => {
    console.log(req.user);
    res.render('listings/new.ejs');
}

module.exports.showlisting = async (req, res) => {
    let { id } = req.params;
    id = id.trim();
    const listing = await Listing.findById(id).populate({path:'reviews',
        populate:{path:'author'}}).populate('owner');
    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }
    let hasBooked = false;
    if (req.user) {
        hasBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing, hasBooked });
};


module.exports.createListing = async (req, res, next) => {
    let url = req.file.path;
    let filename = req.file.filename;
    
    const newListing = new Listing(req.body.listing);
    newListing.image = { url, filename };
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash('success', 'Successfully made a new listing!');
    res.redirect("/listings");
};

module.exports.editlisting = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }
    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace('/upload', '/upload/,w_250,e_blur:100');
    res.render('listings/edit.ejs', { listing , originalImageUrl});
};

module.exports.updatelisting = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});
    if (typeof req.file !== 'undefined') {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
    }
    console.log(`Updated listing: ${listing}`);
    req.flash('success', 'Successfully updated the listing!');
    res.redirect(`/listings/${id}`);
};

module.exports.destroylisting = async (req, res) => {
    let { id } = req.params;
    let deletedlisting = await Listing.findByIdAndDelete(id);
    console.log(`Deleted listing: ${deletedlisting}`);
    req.flash('success', 'Successfully deleted the listing!');
    res.redirect('/listings');
};

module.exports.bookListing = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }

    const alreadyBooked = listing.bookings.some((booking) => booking.user.equals(req.user._id));
    if (alreadyBooked) {
        req.flash('error', 'You have already booked this listing.');
        return res.redirect(`/listings/${id}`);
    }

    listing.bookings.push({ user: req.user._id });
    await listing.save();
    req.flash('success', 'Booking confirmed!');
    res.redirect(`/listings/${id}`);
};

module.exports.cancelBooking = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash('error', 'Cannot find that listing!');
        return res.redirect('/listings');
    }

    const initialCount = listing.bookings.length;
    listing.bookings = listing.bookings.filter((booking) => !booking.user.equals(req.user._id));

    if (listing.bookings.length === initialCount) {
        req.flash('error', 'You do not have an active booking for this listing.');
        return res.redirect(`/listings/${id}`);
    }

    await listing.save();
    req.flash('success', 'Booking cancelled successfully.');
    res.redirect(req.get('referer') || `/listings/${id}`);
};
