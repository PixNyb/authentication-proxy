const express = require('express');
const expressEjsLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const promBundle = require('express-prom-bundle');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('./passport/setup');

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
const { AUTH_HOST, SESSION_SECRET, LONG_LIVED_TOKENS_ENABLED, AUTH_PREFIX } = require('./utils/constants');

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

app.use(
    promBundle({
        includePath: true,
        includeMethod: true,
        metricsPath: '/metrics',
    })
);

app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(
    session({
        secret: SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
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
app.use(AUTH_PREFIX, cookieRoutes);
app.use(providerRoutes);

app.use(authorizationHandlerMiddleware);
app.use(errorHandlerMiddleware);

module.exports = app;
