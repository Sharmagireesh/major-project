if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const dBurl = process.env.ATLASDB_URL;
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate'); 
const path = require('path');
const ExpressError = require('./utils/ExpressError.js');
const listingsRouter = require("./routes/listing.js");
const reviewsRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');

main().then(() => {
    console.log('Connected to MongoDB');
})
.catch(err => {
    console.log(err);
});

async function main() {
    mongoose.connect(dBurl);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method', { methods: ['POST', 'GET'] }));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public')));

const store = MongoStore.create({
    mongoUrl: dBurl,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 60 * 60,

});
store.on("error", function(e){
    console.log(" MONGO SESSION STORE ERROR", e);
});


const sessionOptions = { 
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
    },
};

/*app.get('/', (req, res) => {
    res.send('hii ,iam the root');
});*/

app.use(session(sessionOptions));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user;
    next();
});

/*app.get('/demouser', async (req, res) => {
    let fakeUser = new User({ username: 'chirag', email: 'sharma@gmail.com' });
    let registeredUser = await User.register(fakeUser, 'chira@1234');
    res.send(registeredUser);
});*/

app.use('/listings', listingsRouter);
app.use("/listings/:id/reviews",reviewsRouter);
app.use('/', userRouter);

app.get('/', (req, res) => {
    res.redirect('/listings');
});

app.all(/.*/, (req, res ,next) => {
    next(new ExpressError(404, 'Page Not Found !'));
});


// Global error handler - must be last
app.use((err, req, res, next) => {
    let {statusCode = 500, message = "something went wrong!"} = err;
    res.status(statusCode).render('error.ejs', { message});

   // res.status(statusCode).send(message);
});

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});
