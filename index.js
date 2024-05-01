require('dotenv').config();
const express = require('express');
const passport = require('passport');
const Discord = require('passport-discord');
const session = require('express-session');
const memorystore = require('memorystore')(session);
const url = require('node:url');
const path = require('node:path');

const app = express();

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((id, done) => {
    done(null, id)
});

passport.use(new Discord({
    clientID: process.env.client_id,
    clientSecret: process.env.client_secret,
    callbackURL: process.env.redirect_uri,
    scope: ["identify", "guilds"]
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(()=>done(null, profile));
}));

app.use(session({
    store: new memorystore({ checkPeriod: 86400000 }),
    secret: "%/%/%//%/%//%/%%%%==%//%",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize());
app.use(passport.session());

app.engine('html', require('ejs').renderFile)
app.set('views', path.join(__dirname, '/views/'));

app.use('/static', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index.html', {
        user: req.isAuthenticated() ? req.user : null
    })
});

app.get('/api/login', (req, res, next) => {
    if (req.session.backURL) {
        req.session.backURL = req.session.backURL;
    } else if (req.headers.referer) {
        const parse = url.parse(req.headers.referer);
        req.session.backURL = parse.path;
    } else {
        req.session.backURL = "/"
    }

    next();
}, passport.authenticate('discord'));

app.get('/api/callback', passport.authenticate('discord', { failureRedirect: "/" }), (req, res) => {
    if (req.session.backURL) {
        const backURL = req.session.backURL;
        req.session.backURL = null;
        res.redirect(backURL);
    } else {
        res.redirect('/')
    }
});

app.get('/dashboard', checkAuth, (req, res) => {
    res.render('dashboard/index.html', {
        user: req.user
    })
});

/**
 * @param {Express.Request} req 
 * @param {Express.Response} res 
 */
function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        next()
    } else {
        res.redirect('/api/login');
    }
}

app.listen(3000, () => {
    console.log('Alive.');
})
