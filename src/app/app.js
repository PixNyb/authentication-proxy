const express = require('express');
const expressEjsLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('./passport/setup');
const { csrfProtectionMiddleware } = require('./middlewares');

const {
    authorizationHandler: authorizationHandlerMiddleware,
    errorHandler: errorHandlerMiddleware,
    forwardedHeaderParser: forwardedHeaderParserMiddleware,
    longLivedTokensHandler: longLivedTokensHandlerMiddleware,
    requestLogger: requestLoggerMiddleware,
    userDecoder: userDecoderMiddleware,
} = require('./middlewares');

const {
    authorization: authorizationRoutes,
    cookie: cookieRoutes,
    health: healthRoutes,
    provider: providerRoutes,
} = require('./routes');
const { AUTH_HOST, SESSION_SECRET, LONG_LIVED_TOKENS_ENABLED, AUTH_PREFIX, COOKIE_SECRET, COOKIE_CONFIG } = require('./utils/constants');

const app = express();

app.use(expressEjsLayouts);
app.use(express.static(__dirname + '/../public'));
app.set('views', __dirname + '/../views');
app.set('view engine', 'ejs');
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", AUTH_HOST],
            formAction: [AUTH_HOST],
        },
    })
);

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
    session({
        store: new FileStore({
            path: '/tmp/sessions',
            ttl: 86400,
            retries: 0,
        }),
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: COOKIE_CONFIG.secure,
            httpOnly: COOKIE_CONFIG.httpOnly,
            sameSite: COOKIE_CONFIG.sameSite,
            maxAge: 86400000,
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(healthRoutes);

app.use(forwardedHeaderParserMiddleware);
app.use(userDecoderMiddleware);

app.use(requestLoggerMiddleware);
if (LONG_LIVED_TOKENS_ENABLED) app.use(longLivedTokensHandlerMiddleware);

app.use(AUTH_PREFIX, authorizationRoutes);
app.use(AUTH_PREFIX, csrfProtectionMiddleware, cookieRoutes);
app.use(providerRoutes);

app.use(authorizationHandlerMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;
