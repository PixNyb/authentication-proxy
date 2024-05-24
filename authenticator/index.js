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

app.use(express.json())
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
    console.log(`[${new Date().toISOString()}] - ${req.method} ${req.url}`);
    next();
});

app.post(`${apiPath}/auth`, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send(400).send('Missing username or password');

    const hash = userCredentials[username];
    if (hash === apacheMd5(password, hash)) {
        const accessToken = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: accessTokenLifetime });
        const refreshToken = jwt.sign({ username }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: refreshTokenLifetime });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true, maxAge: tokenTimeToMilliseconds(accessTokenLifetime), sameSite: 'strict' });
        res.cookie(`${cookiePrefix}refresh_token`, refreshToken, { httpOnly: true, maxAge: tokenTimeToMilliseconds(refreshTokenLifetime), sameSite: 'strict' });

        res.status(200).send('Successfully authenticated');
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.get(`${apiPath}/validate`, (req, res) => {
    const token = req.cookies[`${cookiePrefix}access_token`]
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(401);

        res.sendStatus(200);
    });
});

app.get(`${apiPath}/refresh`, (req, res) => {
    const refreshToken = req.cookies[`${cookiePrefix}refresh_token`]
    console.log('Refresh token:', refreshToken);
    console.log('URI:', req.query.uri)
    if (!refreshToken) return res.sendStatus(401);
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: accessTokenLifetime });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true, maxAge: tokenTimeToMilliseconds(accessTokenLifetime), sameSite: 'strict' });

        res.status(200).redirect(req.query.uri);
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