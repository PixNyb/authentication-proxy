const jwt = require('jsonwebtoken');
const express = require('express');
const passport = require('passport');
const { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_NAME, REFRESH_TOKEN_NAME, AUTH_HOST, AUTH_PREFIX, COOKIE_CONFIG } = require('./constants');
const { path } = require('./app');

const createRoutes = (app, strategies) => {
    const authMiddleware = (req, res, next) => {
        const bypassRoutes = Object.values(strategies).map(strategy => strategy.params.loginURL).concat(
            Object.values(strategies).map(strategy => strategy.params.callbackURL)
        );

        if (bypassRoutes.includes(req.path.split('?')[0]))
            res.status(200);

        next();
    };

    app.use(authMiddleware);

    Object.entries(strategies).forEach(([name, strategyConfig]) => {
        const { loginURL, callbackURL, callbackMethod } = strategyConfig.params;
        if (typeof strategyConfig.strategy === 'function') {
            passport.use(name, new strategyConfig.strategy(strategyConfig.params, strategyConfig.verify));

            app.get(loginURL, (req, res, next) => {
                passport.authenticate(name)(req, res, next);
            });
            console.debug(`Registered route: GET ${loginURL}`);

            app[callbackMethod.toLowerCase()](callbackURL, (req, res, next) => {
                console.debug(`Received callback from ${name}`);
                passport.authenticate(name, (err, user, info) => {
                    if (err) {
                        console.debug(`Error authenticating with ${name}:`, err);
                        return req.xhr ? res.status(500).json({ error: err.message }) : next(err);
                    }

                    if (!user) {
                        console.debug(`Failed to authenticate with ${name}:`, info);
                        return req.xhr ? res.status(401).json({ error: info.message }) : res.redirect('/?error=Invalid%20credentials');
                    }

                    // Apply domain and user whitelists
                    if (strategyConfig.params.domainWhitelist && user.id.includes('@')) {
                        const domainWhitelist = strategyConfig.params.domainWhitelist.split(',');

                        if (!domainWhitelist.includes(emailDomain)) {
                            console.debug(`Unauthorized domain for ${name}: ${emailDomain}`);
                            return req.xhr ? res.status(401).json({ error: 'Unauthorized domain' }) : res.redirect('/?error=Unauthorized%20domain');
                        }
                    }

                    if (strategyConfig.params.userWhitelist) {
                        const userWhitelist = strategyConfig.params.userWhitelist.split(',');

                        if (!userWhitelist.includes(user.id)) {
                            console.debug(`Unauthorized user for ${name}: ${user.id}`);
                            return req.xhr ? res.status(401).json({ error: 'Unauthorized user' }) : res.redirect('/?error=Unauthorized%20user');
                        }
                    }

                    let url = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`;
                    if (req.session && req.session.redirect) {
                        url = req.session.redirect;
                        delete req.session.redirect;
                    }

                    // Log user in
                    req.logIn(user, (err) => {
                        if (err) {
                            console.debug(`Failed to log in user with ${name}:`, err);
                            return req.xhr ? res.status(500).json({ error: err.message }) : next(err);
                        }

                        // Generate a jwt token and refresh token
                        const token = jwt.sign(
                            {
                                user: user.id,
                                strategy: strategyConfig.name,
                            },
                            ACCESS_TOKEN_SECRET, { expiresIn: '15m' }
                        );

                        const refreshToken = jwt.sign(
                            {
                                user: user.id,
                                strategy: strategyConfig.name,
                            },
                            REFRESH_TOKEN_SECRET, { expiresIn: '7d' }
                        );

                        // Set the cookies
                        res.cookie(ACCESS_TOKEN_NAME, token, {
                            maxAge: 1000 * 60 * 15,
                            ...COOKIE_CONFIG
                        });

                        res.cookie(REFRESH_TOKEN_NAME, refreshToken, {
                            maxAge: 1000 * 60 * 60 * 24 * 7,
                            ...COOKIE_CONFIG
                        });

                        if (req.xhr) {
                            res.status(200).json(user);
                        } else {
                            res.status(301).render('redirect', {
                                redirectUrl: url,
                            });
                        }
                    });
                })(req, res, next);
            });
            console.debug(`Registered route: ${callbackMethod} ${callbackURL}`);
        }
    });
};

module.exports = createRoutes;