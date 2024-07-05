const jwt = require("jsonwebtoken");
const passport = require("passport");
const {
  REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_SECRET,
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  AUTH_HOST,
  AUTH_PREFIX,
  COOKIE_CONFIG,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
} = require("./config/constants");
const { setGlobalCookies } = require("./global-cookies");
const { get } = require("request");

const createProviderRoutes = (app, strategies) => {
  Object.entries(strategies).forEach(([name, strategyConfig]) => {
    const { loginURL, callbackURL, callbackMethod } = strategyConfig.params;
    if (typeof strategyConfig.strategy === "function") {
      passport.use(
        name,
        new strategyConfig.strategy(
          strategyConfig.params,
          strategyConfig.verify
        )
      );

      app.get(loginURL, (req, res, next) => {
        passport.authenticate(name)(req, res, next);
      });

      app[callbackMethod.toLowerCase()](callbackURL, (req, res, next) => {
        const { error } = req.query;
        if (error) throw new Error(`${error}`);

        passport.authenticate(name, (err, user, info) => {
          if (err) {
            return req.xhr
              ? res.status(500).json({ error: err.message })
              : next(err);
          }

          if (!user) {
            return req.xhr
              ? res.status(401).json({ error: info.message })
              : res.redirect("/?error=Invalid%20credentials");
          }

          // Apply domain and user whitelists
          if (strategyConfig.params.domainWhitelist && user.id.includes("@")) {
            const domainWhitelist =
              strategyConfig.params.domainWhitelist.split(",");
            const emailDomain = user.id.split("@")[1];

            if (!domainWhitelist.includes(emailDomain))
              return req.xhr
                ? res.status(401).json({ error: "Unauthorized domain" })
                : res.redirect("/?error=Unauthorized%20domain");
          }

          if (strategyConfig.params.userWhitelist) {
            const userWhitelist =
              strategyConfig.params.userWhitelist.split(",");

            if (!userWhitelist.includes(user.id))
              return req.xhr
                ? res.status(401).json({ error: "Unauthorized user" })
                : res.redirect("/?error=Unauthorized%20user");
          }

          let redirectUrl = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`;
          if (req.session && req.session.redirect) {
            redirectUrl = req.session.redirect;
            delete req.session.redirect;
          }

          // Log user in
          req.logIn(user, (err) => {
            if (err)
              return req.xhr
                ? res.status(500).json({ error: err.message })
                : next(err);

            // Generate a jwt token and refresh token
            const token = jwt.sign(
              {
                user: user.id,
                strategy: strategyConfig.name,
              },
              ACCESS_TOKEN_SECRET,
              { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
            );

            const refreshToken = jwt.sign(
              {
                user: user.id,
                strategy: strategyConfig.name,
              },
              REFRESH_TOKEN_SECRET,
              { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
            );

            setGlobalCookies(req, res, redirectUrl, [
              {
                name: ACCESS_TOKEN_NAME,
                value: token,
                options: {
                  maxAge: getAgeFromExpiresIn(ACCESS_TOKEN_EXPIRES_IN),
                  ...COOKIE_CONFIG,
                },
              },
              {
                name: REFRESH_TOKEN_NAME,
                value: refreshToken,
                options: {
                  maxAge: getAgeFromExpiresIn(REFRESH_TOKEN_EXPIRES_IN),
                  ...COOKIE_CONFIG,
                },
              },
            ]);
          });
        })(req, res, next);
      });
    }
  });
};

const getAgeFromExpiresIn = (expiresIn) => {
  // Take a token value like "15m" and return the number of seconds
  const [value, unit] = expiresIn.match(/(\d+)(\w+)/);
  if (!value || !unit) throw new Error("Invalid expiresIn format");
  const seconds = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
  }[unit[0].toLowerCase()];

  return parseInt(value) * seconds;
};

module.exports = createProviderRoutes;
