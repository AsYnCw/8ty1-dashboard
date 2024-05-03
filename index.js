require('dotenv').config();
const express = require('express');
const passport = require('passport');
const Discord = require('passport-discord');
const session = require('express-session');
const memorystore = require('memorystore')(session);
const url = require('node:url');
const path = require('node:path');
const API = require('./utils/API');
const modules = require('./utils/modules.json');
const { deflateRawSync } = require('node:zlib');

const config = {
    invite_uri: 'https://discord.com/oauth2/authorize?client_id=1220112684612190329&permissions=12096037842102&scope=bot',
}

console.log(new Array(["invite_uri", "a", "e"]).filter(v => !v.at(0)))

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

app.get('/dashboard/manage/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    const data = await API.guilds.get(id);

    if (!data.in) {
        return res.redirect(`/invite?prompt=true&gid=${id}`);
    }

    res.render('dashboard/manage/home.html', {
        guild: data.res ? data.res : null,
        user: req.user,
        modules: modules
    });
});

app.get('/dashboard/manage/:id/:module_name', checkAuth, async (req, res) => {
    const { id, module_name } = req.params;
    const data = await API.guilds.get(id);

    if (!data.in) {
      return res.redirect(`/invite?prompt=true&text=${encodeURI("You don't have the bot in this guild, do you want to add it?")}`);
    }

    if (!modules[0].includes(module_name)) {
        return res.redirect(`/error?text=${encodeURI('Invalid module name')}&type=warn`);
    }

    res.render(`dashboard/manage/${module_name}.html`, {
        user: req.user,
        guild: data.res
    })
});

app.get('/invite', (req, res) => {
    const { prompt, gid } = req.query;
    if (prompt === "true") {
        res.render('invite.html', {
            gid: gid ? gid : null
        });
    } else {
        res.redirect(config.invite_uri)
    }
});

app.get('/error', (req, res) => {
    const { type, text } = req.query;

    if (typeof type != "string") {
        return res.json('Invalid type.')
    }

    res.render('error.html', {
        text: text ? text : null,
        type: type
    });
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
