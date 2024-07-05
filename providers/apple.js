const { Strategy: AppleStrategy } = require("passport-apple");
const { AUTH_PREFIX } = require("../constants");

const appleProvider = (id, keyName) => ({
  name: `apple_${id}`,
  type: "apple",
  strategy: AppleStrategy,
  params: {
    clientID: process.env[`APPLE_${keyName}_CLIENT_ID`],
    clientSecret: process.env[`APPLE_${keyName}_TEAM_ID`],
    loginURL: `${AUTH_PREFIX}/_apple/${id}`,
    callbackURL: `${AUTH_PREFIX}/_apple/${id}/callback`,
    callbackMethod: "GET",
    domainWhitelist: process.env[`APPLE_${keyName}_DOMAIN_WHITELIST`],
    userWhitelist: process.env[`APPLE_${keyName}_USER_WHITELIST`],
    displayName: process.env[`APPLE_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: "fab fa-apple",
  },
  verify: (req, accessToken, refreshToken, idToken, profile, done) => {
    console.log(
      "appleProvider verify",
      profile,
      idToken,
      accessToken,
      refreshToken
    );

    const userProfile = {
      email: null,
    };

    return done(null, {
      id: userProfile.email,
      strategy: `apple_${id}`,
      profile: userProfile,
    });
  },
});

module.exports = appleProvider;
