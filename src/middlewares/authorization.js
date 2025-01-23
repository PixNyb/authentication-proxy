// There's something funky going on with the access token cookie, it'll end up unsetting it and looping into /refresh where it fails to set a new cookie and thus looping back to /refresh
// This doesn't interfere with anything, but doesn't do much either.

// const strategies = require("../strategies");
const jwt = require("jsonwebtoken");
const {
  ACCESS_TOKEN_NAME,
  ACCESS_TOKEN_SECRET,
  AUTH_PREFIX,
  PROMETHEUS_PREFIX,
} = require("../config/constants");
const strategies = require("../strategies");

module.exports = (req, res) => {
  const path = (req.forwardedUri || req.url).split("?")[0];
  let applicationRoutes = [
    `/healthz`,
    `${AUTH_PREFIX}/`,
    `${AUTH_PREFIX}/refresh`,
    `${AUTH_PREFIX}/logout`,
    `${AUTH_PREFIX}/set-cookies`,
    `${AUTH_PREFIX}/remove-cookies`,
    `${PROMETHEUS_PREFIX}/metrics`
  ]
  let providerRoutes = [];
  Object.entries(strategies).forEach(([, strategyConfig]) => {
    const { loginURL, callbackURL } = strategyConfig.params;
    providerRoutes.push(loginURL);
    providerRoutes.push(callbackURL);
  });

  applicationRoutes = [...new Set(applicationRoutes)];
  providerRoutes = [...new Set(providerRoutes)];

  if (providerRoutes.includes(path) || applicationRoutes.includes(path)) {
    return res.sendStatus(200);
  }

  const { [ACCESS_TOKEN_NAME]: token } = req.cookies;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    res.set("X-Forwarded-User", decoded.user).sendStatus(200);
  } catch {
    res.sendStatus(401);
  }
};
