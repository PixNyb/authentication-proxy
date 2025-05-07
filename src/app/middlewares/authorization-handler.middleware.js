const { verifyToken } = require("../utils/jwt");
const { getStrategies } = require("../passport/strategies");
const { unauthorizedRequestsCounter, authorizedRequestsCounter } = require('../metrics');

const {
    ACCESS_TOKEN_NAME,
    ACCESS_TOKEN_SECRET,
    AUTH_PREFIX,
} = require("../utils/constants");

const strategies = getStrategies();

module.exports = (req, res) => {
    const path = (req.forward?.uri || req.url).split("?")[0];
    let applicationRoutes = [
        `/healthz`,
        `${AUTH_PREFIX}/`,
        `${AUTH_PREFIX}/login`,
        `${AUTH_PREFIX}/refresh`,
        `${AUTH_PREFIX}/logout`,
        `${AUTH_PREFIX}/set-cookies`,
        `${AUTH_PREFIX}/remove-cookies`
    ];
    let providerRoutes = [];
    Object.entries(strategies).forEach(([, strategyConfig]) => {
        const { loginURL, callbackURL } = strategyConfig.params;
        providerRoutes.push(loginURL);
        providerRoutes.push(callbackURL);
    });

    applicationRoutes = [...new Set(applicationRoutes)];
    providerRoutes = [...new Set(providerRoutes)];

    if (providerRoutes.includes(path) || applicationRoutes.includes(path)) {
        authorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        return res.sendStatus(200);
    }

    const { [ACCESS_TOKEN_NAME]: token } = req.cookies;

    if (!token) {
        unauthorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        return res.sendStatus(401);
    }

    try {
        const decoded = verifyToken(token, ACCESS_TOKEN_SECRET);

        authorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        res.set("X-Forwarded-User", decoded.user)
            .sendStatus(200);
    } catch {
        unauthorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        res.sendStatus(401);
    }
};
