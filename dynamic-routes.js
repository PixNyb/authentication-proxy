const jwt = require('jsonwebtoken');
const express = require('express');
const passport = require('passport');
const { REFRESH_TOKEN_SECRET, ACCESS_TOKEN_SECRET, ACCESS_TOKEN_NAME, REFRESH_TOKEN_NAME, AUTH_HOST, AUTH_PREFIX, COOKIE_CONFIG } = require('./constants');
const { path } = require('./app');

const createRoutes = (app, strategies) => {
    Object.entries(strategies).forEach(([name, strategyConfig]) => {
        const { loginURL, callbackURL, callbackMethod } = strategyConfig.params;
        if (typeof strategyConfig.strategy === 'function') {
            passport.use(name, new strategyConfig.strategy(strategyConfig.params, strategyConfig.verify));

            app.get(loginURL, passport.authenticate(name));
            console.debug(`Registered route: GET ${loginURL}`);

            app[callbackMethod.toLowerCase()](callbackURL, (req, res, next) => {
                passport.authenticate(name, (err, user, info) => {
                    if (err)
                        return req.xhr ? res.status(500).json({ error: err.message }) : next(err);

                    if (!user)
                        return req.xhr ? res.status(401).json({ error: info.message }) : res.redirect('/?error=Invalid%20credentials');

                    // Apply domain and user whitelists
                    if (strategyConfig.params.domainWhitelist && user.id.includes('@')) {
                        const domainWhitelist = strategyConfig.params.domainWhitelist.split(',');

                        if (!domainWhitelist.includes(emailDomain))
                            return req.xhr ? res.status(401).json({ error: 'Unauthorized domain' }) : res.redirect('/?error=Unauthorized%20domain');
                    }

                    if (strategyConfig.params.userWhitelist) {
                        const userWhitelist = strategyConfig.params.userWhitelist.split(',');

                        if (!userWhitelist.includes(user.id))
                            return req.xhr ? res.status(401).json({ error: 'Unauthorized user' }) : res.redirect('/?error=Unauthorized%20user');
                    }

                    // Log user in
                    req.logIn(user, (err) => {
                        if (err)
                            return req.xhr ? res.status(500).json({ error: err.message }) : next(err);

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

                        if (req.xhr)
                            res.status(200).json(user);
                        else {
                            res.status(301).render('redirect', {
                                redirectUrl: `${AUTH_HOST}${AUTH_PREFIX}/`,
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