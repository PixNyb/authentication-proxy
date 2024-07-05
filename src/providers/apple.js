const { Strategy: AppleStrategy } = require("passport-apple");
const { AUTH_PREFIX } = require("../config/constants");
const { jwt } = require("jsonwebtoken");

const appleProvider = (id, keyName) => ({
  name: `apple_${id}`,
  type: "apple",
  strategy: AppleStrategy,
  params: {
    clientID: process.env[`APPLE_${keyName}_CLIENT_ID`],
    teamID: process.env[`APPLE_${keyName}_TEAM_ID`],
    keyID: process.env[`APPLE_${keyName}_KEY_ID`],
    privateKeyLocation:
      process.env[`APPLE_${keyName}_PRIVATE_KEY_LOCATION`] ||
      "/etc/auth/apple.p8",
    loginURL: `${AUTH_PREFIX}/_apple/${id}`,
    callbackURL: `${AUTH_PREFIX}/_apple/${id}/callback`,
    callbackMethod: "GET",
    domainWhitelist: process.env[`APPLE_${keyName}_DOMAIN_WHITELIST`],
    userWhitelist: process.env[`APPLE_${keyName}_USER_WHITELIST`],
    displayName: process.env[`APPLE_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: process.env[`APPLE_${keyName}_ICON`] || "fab fa-apple",
  },
  verify: (req, accessToken, refreshToken, idToken, profile, done) => {
    // TODO: Implement the profile when apple has support for it
    const decodedIdToken = jwt.decode(idToken);

    const userProfile = {
      appleId: decodedIdToken.sub,
      email: decodedIdToken.email,
    };

    return done(null, {
      id: userProfile.email,
      strategy: `apple_${id}`,
      profile: userProfile,
    });
  },
});

module.exports = appleProvider;
