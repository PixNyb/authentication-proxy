const { Strategy: OAuth2Strategy } = require('passport-oauth2');
const { AUTH_PREFIX } = require('../constants');

const oauth2Provider = (id, keyName) => ({
    name: `oauth2_${id}`,
    type: 'oauth2',
    strategy: OAuth2Strategy,
    params: {
        authorizationURL: process.env[`OAUTH2_${keyName}_AUTH_URL`],
        tokenURL: process.env[`OAUTH2_${keyName}_TOKEN_URL`],
        userURL: process.env[`OAUTH2_${keyName}_USER_URL`],
        clientID: process.env[`OAUTH2_${keyName}_CLIENT_ID`],
        clientSecret: process.env[`OAUTH2_${keyName}_CLIENT_SECRET`],
        loginURL: `${AUTH_PREFIX}/_oauth2/${id}`,
        callbackURL: `${AUTH_PREFIX}/_oauth2/${id}/callback`,
        callbackMethod: 'GET',
        domainWhitelist: process.env[`OAUTH2_${keyName}_DOMAIN_WHITELIST`],
        userWhitelist: process.env[`OAUTH2_${keyName}_USER_WHITELIST`],
        displayName: process.env[`OAUTH2_${keyName}_DISPLAY_NAME`] || id,
        fontAwesomeIcon: process.env[`OAUTH2_${keyName}_ICON`] || 'fas fa-key',
    },
    verify: (accessToken, refreshToken, profile, done) => {
        // Get the user profile from the OAuth2 provider using the userURL if it's set
        const userURL = process.env[`OAUTH2_${keyName}_USER_URL`] || process.env[`OAUTH2_${keyName}_PROFILE_URL`];
        const userField = process.env[`OAUTH2_${keyName}_USER_FIELD`] || 'email'; // The field to use as the user identifier
        if (userURL) {
            console.debug(`Fetching user profile from ${userURL}`);
            const request = require('request');
            request.get({
                url: userURL,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'User-Agent': 'Request-Promise',
                },
            }, (error, response, body) => {
                console.debug(`Received response from ${userURL}: ${response.statusCode}`);
                if (error)
                    return done(error);

                if (response.statusCode !== 200)
                    return done(new Error(`Failed to fetch user profile: ${response.statusCode}`));

                try {
                    console.log(body)
                    const user = JSON.parse(body);
                    return done(null, {
                        id: user[userField],
                        strategy: `oauth2_${id}`,
                        profile: user,
                    });
                } catch (e) {
                    return done(new Error('Failed to parse user profile'));
                }
            });
        } else
            return done(null, {
                id: profile.id,
                strategy: `oauth2_${id}`,
                profile,
            });
    }
});

module.exports = oauth2Provider;