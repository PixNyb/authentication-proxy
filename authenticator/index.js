const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

const apiPath = process.env.API_PATH || '';
const cookiePrefix = process.env.COOKIE_PREFIX || '';

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
    if (userCredentials[username] === password) {
        const accessToken = jwt.sign({ username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign({ username }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true });
        res.cookie(`${cookiePrefix}refresh_token`, refreshToken, { httpOnly: true });

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

        const accessToken = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });

        res.cookie(`${cookiePrefix}access_token`, accessToken, { httpOnly: true });

        res.sendStatus(200);
    });
});

app.listen(3000, '0.0.0.0', () => {
    console.log('Server is running on port 3000');
});