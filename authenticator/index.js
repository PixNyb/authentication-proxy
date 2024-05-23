const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const apacheMd5 = require('apache-md5');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const promBundle = require('express-prom-bundle');
const app = express();

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true });
app.use(metricsMiddleware);

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

const apiPath = process.env.API_PATH || '';
const cookiePrefix = process.env.COOKIE_PREFIX || '';

const accessTokenLifetime = process.env.ACCESS_TOKEN_LIFETIME || '15m';
const refreshTokenLifetime = process.env.REFRESH_TOKEN_LIFETIME || '7d';

let authorisedUsers = (process.env.AUTHORISED_USERS || '').split(',');
let authorisedUsersFile = process.env.AUTHORISED_USERS_FILE || '';
if (authorisedUsersFile) {
    authorisedUsers = fs.readFileSync(path.resolve(__dirname, authorisedUsersFile), 'utf-8').split('\n');
}

const userCredentials = {};
authorisedUsers.forEach(user => {
    const [username, password] = user.split(':');
    userCredentials[username] = password;
});

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

app.post(`${apiPath}/auth`, (req, res) => {
    const { username, password } = req.body;
    const hash = userCredentials[username];
    if (hash === apacheMd5(password, hash)) {
        const accessToken = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: accessTokenLifetime });
        const refreshToken = jwt.sign({ username }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: refreshTokenLifetime });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true, maxAge: tokenTimeToMilliseconds(accessTokenLifetime) });
        res.cookie(`${cookiePrefix}refresh_token`, refreshToken, { httpOnly: true, maxAge: tokenTimeToMilliseconds(refreshTokenLifetime) });

        res.redirect(req.query.uri || '/');
    } else {
        res.status(401).redirect(req.query.uri || '/');
    }
});

app.get(`${apiPath}/validate`, (req, res) => {
    console.debug(req);
    const token = req.cookies[`${cookiePrefix}access_token`]
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        res.sendStatus(200);
    });
});

app.get(`${apiPath}/refresh`, (req, res) => {
    const refreshToken = req.cookies[`${cookiePrefix}refresh_token`]
    if (!refreshToken) return res.sendStatus(401);
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: accessTokenLifetime });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true });

        res.sendStatus(200);
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});

function tokenTimeToMilliseconds(tokenTime) {
    const [value, unit] = tokenTime.match(/([a-zA-Z]+)|(\d+)/g);
    return unitToMilliseconds(unit) * value;
}

function unitToMilliseconds(unit) {
    switch (unit) {
        case 's':
            return 1000;
        case 'm':
            return 60000;
        case 'h':
            return 3600000;
        case 'd':
            return 86400000;
        default:
            throw new Error('Invalid unit');
    }
}