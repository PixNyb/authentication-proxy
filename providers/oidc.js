const { Strategy: OpenIDConnectStrategy } = require('passport-openidconnect');
const { AUTH_PREFIX } = require('../constants');

const oidcProvider = (id, keyName) => ({
    name: `oidc_${id}`,
    type: 'oidc',
    strategy: OpenIDConnectStrategy,
    params: {
        issuer: process.env[`OIDC_${keyName}_ISSUER`],
        authorizationURL: process.env[`OIDC_${keyName}_AUTH_URL`],
        tokenURL: process.env[`OIDC_${keyName}_TOKEN_URL`],
        userURL: process.env[`OIDC_${keyName}_USER_URL`],
        clientID: process.env[`OIDC_${keyName}_CLIENT_ID`],
        clientSecret: process.env[`OIDC_${keyName}_CLIENT_SECRET`],
        scope: 'openid profile',
        loginURL: `${AUTH_PREFIX}/_oidc/${id}`,
        callbackURL: `${AUTH_PREFIX}/_oidc/${id}/callback`,
        callbackMethod: 'GET',
        domainWhitelist: process.env[`OIDC_${keyName}_DOMAIN_WHITELIST`],
        userWhitelist: process.env[`OIDC_${keyName}_USER_WHITELIST`],
        displayName: process.env[`OIDC_${keyName}_DISPLAY_NAME`] || id,
        fontAwesomeIcon: process.env[`OIDC_${keyName}_ICON`] || 'fas fa-user',
    },
    verify: (issuer, sub, profile, accessToken, refreshToken, done) => {
        // Handle OIDC user profile here
        return done(null, profile);
    }
});

module.exports = oidcProvider;