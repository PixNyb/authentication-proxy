const express = require("express");
const passport = require("passport");
const { setLoginCookies } = require("../utils/cookies");
const { redirect } = require("../utils/helpers");
const { getStrategies } = require("../passport/strategies");
const { csrfProtectionMiddleware } = require("../middlewares");
const { loginCounter } = require('../metrics');

const {
    AUTH_HOST,
    AUTH_PREFIX,
} = require("../utils/constants");

const router = express.Router({ mergeParams: true });
const strategies = getStrategies();

Object.entries(strategies).forEach(([name, strategyConfig]) => {
    const { loginURL, callbackURL, callbackMethod } = strategyConfig.params;
    if (typeof strategyConfig.strategy === "function") {
        passport.use(
            name,
            new strategyConfig.strategy(
                strategyConfig.params,
                strategyConfig.verify
            )
        );

        router.route(loginURL).get(csrfProtectionMiddleware, (req, res, next) => {
            try {
                // Preserve redirect URL by passing it through OAuth state parameter
                const redirectUrl = req.query.redirect_url || req.session.redirect_url;
                const authOptions = {};

                if (redirectUrl && (strategyConfig.type === 'oauth2' || strategyConfig.type === 'oidc' || strategyConfig.type === 'google' || strategyConfig.type === 'apple')) {
                    authOptions.state = Buffer.from(JSON.stringify({ redirect_url: redirectUrl })).toString('base64');
                }

                passport.authenticate(name, authOptions)(req, res, next);
            } catch (err) {
                return next(err);
            }
        });

        router.route(callbackURL)[callbackMethod.toLowerCase()](csrfProtectionMiddleware, (req, res, next) => {
            const { error } = req.query;
            if (error) throw new Error(`${error}`);

            passport.authenticate(name, (err, user, info) => {
                if (err) {
                    loginCounter.inc({ provider: name, status: "failure" });
                    return next(err);
                }

                if (!user) {
                    loginCounter.inc({ provider: name, status: "failure" });
                    return req.xhr
                        ? res.status(401).json({ error: info.message })
                        : redirect(res, `${AUTH_PREFIX}/login?error=Invalid%20credentials`);
                }

                // Apply domain and user whitelists
                if (strategyConfig.params.domainWhitelist && user.id.includes("@")) {
                    const domainWhitelist =
                        strategyConfig.params.domainWhitelist.split(",");
                    const emailDomain = user.id.split("@")[1];

                    if (!domainWhitelist.includes(emailDomain)) {
                        loginCounter.inc({ provider: name, status: "failure" });
                        return req.xhr
                            ? res.status(401).json({ error: "Unauthorized domain" })
                            : redirect(res, `${AUTH_PREFIX}/login?error=Unauthorized%20domain`);
                    }
                }

                if (strategyConfig.params.userWhitelist) {
                    const userWhitelist =
                        strategyConfig.params.userWhitelist.split(",");

                    if (!userWhitelist.includes(user.id)) {
                        loginCounter.inc({ provider: name, status: "failure" });
                        return req.xhr
                            ? res.status(401).json({ error: "Unauthorized user" })
                            : redirect(res, `${AUTH_PREFIX}/login?error=Unauthorized%20user`);
                    }
                }

                let redirectUrl = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`;

                // Try to get redirect URL from OAuth state parameter first
                if (req.query.state) {
                    try {
                        const stateData = JSON.parse(Buffer.from(req.query.state, 'base64').toString());
                        if (stateData.redirect_url) {
                            redirectUrl = stateData.redirect_url;
                        }
                    } catch (e) {
                        // If state parsing fails, fall back to session
                        console.warn('Failed to parse OAuth state parameter:', e);
                    }
                }

                // Fallback to session if state doesn't contain redirect URL
                if (redirectUrl === `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/` && req.session && req.session.redirect_url) {
                    redirectUrl = req.session.redirect_url;
                    delete req.session.redirect_url;
                }

                // Log user in
                req.logIn(user, (err) => {
                    loginCounter.inc({ provider: name, status: err ? "failure" : "success" });
                    if (err) return next(err);
                    setLoginCookies(req, res, user.id, strategyConfig.name, redirectUrl);
                });
            })(req, res, next);
        });
    }
});

module.exports = router;