const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { AUTH_PREFIX } = require('../constants');

const googleProvider = (id, keyName) => ({
    name: `google_${id}`,
    type: 'google',
    strategy: GoogleStrategy,
    params: {
        clientID: process.env[`GOOGLE_${keyName}_CLIENT_ID`],
        clientSecret: process.env[`GOOGLE_${keyName}_CLIENT_SECRET`],
        loginURL: `${AUTH_PREFIX}/_google/${id}`,
        callbackURL: `${AUTH_PREFIX}/_google/${id}/callback`,
        callbackMethod: 'GET',
        scope: process.env[`GOOGLE_${keyName}_SCOPE`] || ['profile', 'email'],
        domainWhitelist: process.env[`GOOGLE_${keyName}_DOMAIN_WHITELIST`],
        userWhitelist: process.env[`GOOGLE_${keyName}_USER_WHITELIST`],
        displayName: process.env[`GOOGLE_${keyName}_DISPLAY_NAME`] || id,
        fontAwesomeIcon: 'fab fa-google',
    },
    verify: (accessToken, refreshToken, profile, done) => {
        // Handle Google user profile here
        return done(null, profile);
    }
});

module.exports = googleProvider;