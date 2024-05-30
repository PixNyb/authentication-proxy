const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const promBundle = require('express-prom-bundle');
const passport = require('./passport-setup');
const session = require('express-session');
const strategies = require('./strategies');
const createRoutes = require('./dynamic-routes');
const { ACCESS_TOKEN_NAME, REFRESH_TOKEN_NAME, ACCESS_TOKEN_SECRET, AUTH_PREFIX, AUTH_HOST, COOKIE_CONFIG, REFRESH_TOKEN_SECRET } = require('./constants');

const { FORM_TITLE, FORM_ADMIN_EMAIL, SESSION_SECRET } = process.env;

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true });
app.use(metricsMiddleware);

app.use(express.json())
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
    secret: SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.get('/healthz', (req, res) => {
    res.send('OK');
});

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] - ${req.method} ${req.url}`);
    next();
});

try {
    createRoutes(app, strategies);
} catch (e) {
    console.error('Failed to create routes:', e);
}

const templateStrategies = Object.entries(strategies).filter(([id, strategyConfig]) => strategyConfig.type !== 'local').map(([id, strategyConfig]) => {
    const { loginURL, displayName, fontAwesomeIcon } = strategyConfig.params;
    return {
        displayName,
        loginURL,
        fontAwesomeIcon,
    };
});

const localEndpoints = Object.entries(strategies).filter(([id, strategyConfig]) => strategyConfig.type === 'local').map(([id, strategyConfig]) => {
    const { displayName, loginURL } = strategyConfig.params;
    return {
        displayName,
        loginURL,
    };
});

app.get(`${AUTH_PREFIX}/`, (req, res) => {
    const {
        [ACCESS_TOKEN_NAME]: token,
        [REFRESH_TOKEN_NAME]: refreshToken
    } = req.cookies;

    try {
        if (!token && !refreshToken)
            throw new Error('No token found');

        if (!token && refreshToken)
            return res.status(301).redirect('/refresh');

        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);

        res.set('X-Forwarded-User', decoded.user).json(decoded);
    } catch (e) {
        res.status(401).render('form', {
            title: FORM_TITLE || 'Login',
            strategies: templateStrategies,
            endpoints: localEndpoints,
            initialEndpoint: localEndpoints[0] ? localEndpoints[0].loginURL : null,
            admin_text: FORM_ADMIN_EMAIL ? `Please contact the administrator at <a href="mailto:${FORM_ADMIN_EMAIL}">${FORM_ADMIN_EMAIL}</a> for access.` : 'You\'re on your own!',
        });
    }
});

app.get(`${AUTH_PREFIX}/refresh`, (req, res) => {
    const {
        [REFRESH_TOKEN_NAME]: refreshToken
    } = req.cookies;

    if (!refreshToken)
        return res.status(401).redirect('/');

    try {
        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const token = jwt.sign(
            {
                user: decoded.user,
                strategy: decoded.strategy,
            },
            ACCESS_TOKEN_SECRET, { expiresIn: '15m' }
        );

        res.cookie(ACCESS_TOKEN_NAME, token, {
            maxAge: 1000 * 60 * 15,
            ...COOKIE_CONFIG
        });

        res.status(200).json({ token });
    } catch (e) {
        // Remove the refresh token cookie if it's invalid
        res.clearCookie(REFRESH_TOKEN_NAME, COOKIE_CONFIG);

        res.status(401).render('redirect', {
            redirectUrl: `${AUTH_HOST}${AUTH_PREFIX}/`
        });
    }
});

app.get(`${AUTH_PREFIX}/logout`, (req, res) => {
    res.clearCookie(ACCESS_TOKEN_NAME, COOKIE_CONFIG);
    res.clearCookie(REFRESH_TOKEN_NAME, COOKIE_CONFIG);
    res.status(301).redirect('/');
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});

module.exports = app;