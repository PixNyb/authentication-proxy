const express = require("express");
const promClient = require('prom-client');

const app = express();

const register = new promClient.Registry();

const unauthorizedRequestsCounter = new promClient.Counter({
    name: 'auth_proxy_unauthorized_requests_total',
    help: 'Total number of unauthorized requests',
    labelNames: ['host', 'path'],
});
register.registerMetric(unauthorizedRequestsCounter);

const authorizedRequestsCounter = new promClient.Counter({
    name: 'auth_proxy_authorized_requests_total',
    help: 'Total number of authorized requests',
    labelNames: ['host', 'path'],
});
register.registerMetric(authorizedRequestsCounter);

const loginCounter = new promClient.Counter({
    name: 'auth_proxy_login_requests_total',
    help: 'Total number of login attempts',
    labelNames: ['provider', 'status'],
});
register.registerMetric(loginCounter);

const logoutCounter = new promClient.Counter({
    name: 'auth_proxy_logout_requests_total',
    help: 'Total number of logout attempts',
    labelNames: ['status'],
});
register.registerMetric(logoutCounter);

const refreshCounter = new promClient.Counter({
    name: 'auth_proxy_refresh_requests_total',
    help: 'Total number of refresh token attempts',
    labelNames: ['status'],
});
register.registerMetric(refreshCounter);

const tokenRequestsCounter = new promClient.Counter({
    name: 'auth_proxy_token_requests_total',
    help: 'Total number of token requests',
    labelNames: ['status', 'token'],
});
register.registerMetric(tokenRequestsCounter);

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

module.exports = {
    app,
    register,
    unauthorizedRequestsCounter,
    authorizedRequestsCounter,
    loginCounter,
    logoutCounter,
    refreshCounter,
    tokenRequestsCounter,
};