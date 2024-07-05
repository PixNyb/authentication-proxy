const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { AUTH_PREFIX } = require("../config/constants");

const googleProvider = (id, keyName) => ({
  name: `google_${id}`,
  type: "google",
  strategy: GoogleStrategy,
  params: {
    clientID: process.env[`GOOGLE_${keyName}_CLIENT_ID`],
    clientSecret: process.env[`GOOGLE_${keyName}_CLIENT_SECRET`],
    loginURL: `${AUTH_PREFIX}/_google/${id}`,
    callbackURL: `${AUTH_PREFIX}/_google/${id}/callback`,
    callbackMethod: "GET",
    scope: process.env[`GOOGLE_${keyName}_SCOPE`] || ["profile", "email"],
    domainWhitelist: process.env[`GOOGLE_${keyName}_DOMAIN_WHITELIST`],
    userWhitelist: process.env[`GOOGLE_${keyName}_USER_WHITELIST`],
    displayName: process.env[`GOOGLE_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: process.env[`GOOGLE_${keyName}_ICON`] || "fab fa-google",
  },
  verify: (accessToken, refreshToken, profile, done) => {
    const userProfile = {
      googleId: profile.id,
      displayName: profile.displayName,
      email: profile.emails[0].value,
    };

    return done(null, {
      id: userProfile.email,
      strategy: `google_${id}`,
      profile: userProfile,
    });
  },
});

module.exports = googleProvider;
