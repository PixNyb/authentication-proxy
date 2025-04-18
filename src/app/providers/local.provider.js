const LocalStrategy = require("passport-local").Strategy;
const apacheMd5 = require("apache-md5");
const fs = require("fs");
const path = require("path");
const { AUTH_PREFIX } = require("../utils/constants");

const localProvider = (id, keyName) => ({
  name: `local_${id}`,
  type: "local",
  strategy: LocalStrategy,
  params: {
    usernameField: "username",
    passwordField: "password",
    loginURL: `${AUTH_PREFIX}/_local/${id}`,
    callbackURL: `${AUTH_PREFIX}/_local/${id}`,
    callbackMethod: "POST",
    displayName: process.env[`LOCAL_${keyName}_DISPLAY_NAME`] || id,
    fontAwesomeIcon: process.env[`LOCAL_${keyName}_ICON`] || "fas fa-user",
  },
  verify: (username, password, done) => {
    const users = process.env[`LOCAL_${keyName}_USERS`];
    const usersFile = process.env[`LOCAL_${keyName}_USERS_FILE`];

    const parsedUsers = [];

    if (users) {
      users.split(",").forEach((user) => {
        const [username, password] = user.split(":");
        parsedUsers[username] = password;
      });
    }

    if (usersFile) {
      const usersPath = path.resolve(usersFile);
      const data = fs.readFileSync(usersPath, "utf8");
      const lines = data.split(/\r?\n/);

      lines.forEach((line) => {
        const [username, password] = line.split(":");
        parsedUsers[username] = password;
      });
    }

    const hash = parsedUsers[username];
    if (hash && apacheMd5(password, hash) === hash) {
      return done(null, {
        id: username,
        strategy: `local_${id}`,
        profile: {
          username,
        },
      });
    } else {
      return done(null, false, { error: "Invalid username or password" });
    }
  },
});

module.exports = localProvider;
