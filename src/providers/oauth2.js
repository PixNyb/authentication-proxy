const { Strategy: OAuth2Strategy } = require("passport-oauth2");
const { AUTH_PREFIX } = require("../config/constants");
const { default: axios } = require("axios");

const oauth2Provider = (id, keyName) => ({
  name: `oauth2_${id}`,
  type: "oauth2",
  strategy: OAuth2Strategy,
  params: {
    authorizationURL: process.env[`OAUTH2_${keyName}_AUTH_URL`],
    tokenURL: process.env[`OAUTH2_${keyName}_TOKEN_URL`],
    userURL: process.env[`OAUTH2_${keyName}_USER_URL`],
    clientID: process.env[`OAUTH2_${keyName}_CLIENT_ID`],
    clientSecret: process.env[`OAUTH2_${keyName}_CLIENT_SECRET`],
    loginURL: `${AUTH_PREFIX}/_oauth2/${id}`,
    callbackURL: `${AUTH_PREFIX}/_oauth2/${id}/callback`,
    callbackMethod: "GET",
    domainWhitelist: process.env[`OAUTH2_${keyName}_DOMAIN_WHITELIST`],
    userWhitelist: process.env[`OAUTH2_${keyName}_USER_WHITELIST`],
    displayName: process.env[`OAUTH2_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: process.env[`OAUTH2_${keyName}_ICON`] || "fas fa-key",
  },
  verify: (accessToken, refreshToken, profile, done) => {
    // Get the user profile from the OAuth2 provider using the userURL if it's set
    const userURL = process.env[`OAUTH2_${keyName}_USER_URL`];
    const userField = process.env[`OAUTH2_${keyName}_USER_FIELD`] || "email"; // The field to use as the user identifier
    if (userURL) {
      axios.get(userURL,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "User-Agent": "Request-Promise",
          },
        }).then((response) => {
          if (response.status !== 200)
            return done(
              new Error(`Failed to fetch user profile: ${response.status}`)
            );

          try {
            const user = response.data;
            return done(null, {
              id: user[userField],
              strategy: `oauth2_${id}`,
              profile: user,
            });
          } catch {
            return done(new Error("Failed to parse user profile"));
          }
        }).catch((error) => {
          return done(error);
        });
    } else
      return done(null, {
        id: profile.id,
        strategy: `oauth2_${id}`,
        profile,
      });
  },
});

module.exports = oauth2Provider;
