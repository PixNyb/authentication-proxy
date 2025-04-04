const express = require("express");
const passport = require("passport");
const { setLoginCookies } = require("../utils/cookies");
const { redirect } = require("../utils/helpers");
const { getStrategies } = require("../passport/strategies");

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

        router.route(loginURL).get((req, res, next) => {
            try {
                passport.authenticate(name)(req, res, next);
            } catch (err) {
                return next(err);
            }
        });

        router.route(callbackURL)[callbackMethod.toLowerCase()]((req, res, next) => {
            const { error } = req.query;
            if (error) throw new Error(`${error}`);

            passport.authenticate(name, (err, user, info) => {
                if (err) return next(err);

                if (!user) {
                    return req.xhr
                        ? res.status(401).json({ error: info.message })
                        : redirect(res, `${AUTH_PREFIX}/login?error=Invalid%20credentials`);
                }

                // Apply domain and user whitelists
                if (strategyConfig.params.domainWhitelist && user.id.includes("@")) {
                    const domainWhitelist =
                        strategyConfig.params.domainWhitelist.split(",");
                    const emailDomain = user.id.split("@")[1];

                    if (!domainWhitelist.includes(emailDomain))
                        return req.xhr
                            ? res.status(401).json({ error: "Unauthorized domain" })
                            : redirect(res, `${AUTH_PREFIX}/login?error=Unauthorized%20domain`);
                }

                if (strategyConfig.params.userWhitelist) {
                    const userWhitelist =
                        strategyConfig.params.userWhitelist.split(",");

                    if (!userWhitelist.includes(user.id))
                        return req.xhr
                            ? res.status(401).json({ error: "Unauthorized user" })
                            : redirect(res, `${AUTH_PREFIX}/login?error=Unauthorized%20user`);
                }

                let redirectUrl = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`;
                if (req.session && req.session.redirect_url) {
                    redirectUrl = req.session.redirect_url;
                    delete req.session.redirect_url;
                }

                // Log user in
                req.logIn(user, (err) => {
                    if (err) return next(err);
                    setLoginCookies(req, res, user.id, strategyConfig.name, redirectUrl);
                });
            })(req, res, next);
        });
    }
});

module.exports = router;