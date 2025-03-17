require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const promBundle = require("express-prom-bundle");
const passport = require("./src/passport-setup");
const session = require("express-session");
const strategies = require("./src/strategies");
const createProviderRoutes = require("./src/dynamic-routes");
const helmet = require("helmet");
const {
  ACCESS_TOKEN_NAME,
  REFRESH_TOKEN_NAME,
  ACCESS_TOKEN_SECRET,
  AUTH_PREFIX,
  AUTH_HOST,
  COOKIE_CONFIG,
  REFRESH_TOKEN_SECRET,
  FORM_TITLE,
  SESSION_SECRET,
  FORM_ADMIN_TEXT,
  PROMETHEUS_PREFIX,
  FORM_DISABLE_CREDITS,
  LONG_LIVED_TOKENS,
  LONG_LIVED_TOKENS_ENABLED,
} = require("./src/config/constants");
const {
  removeGlobalCookies,
  setGlobalCookies,
  createCookieRoutes,
} = require("./src/global-cookies");
const expressEjsLayouts = require("express-ejs-layouts");
const redirect = require("./src/redirect");
const forwardedHeaders = require("./src/middlewares/forwarded-headers");
const requestLogger = require("./src/middlewares/request-logger");
const longLivedTokens = require("./src/middlewares/long-lived-tokens");
const errorHandler = require("./src/middlewares/error-handler");
const authorization = require("./src/middlewares/authorization");

// Initialize app
const app = express();
app.use(expressEjsLayouts);
app.use(express.static(__dirname + '/public'));
app.set("layout", "./layouts/page");
app.set("view engine", "ejs");
app.set("layout extractScripts", true);

// Security Middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", AUTH_HOST],
      formAction: [AUTH_HOST],
    },
  })
);

// Monitoring Middleware
app.use(
  promBundle({
    includeMethod: true,
    includePath: true,
    metricsPath: `${PROMETHEUS_PREFIX}/metrics`,
  })
);

// Other Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Health Check Route
app.get("/healthz", (req, res) => {
  res.send("OK");
});

app.use(forwardedHeaders);
app.use(requestLogger);

if (LONG_LIVED_TOKENS_ENABLED) app.use(longLivedTokens);

// Define routes
const defineRoutes = (app, strategies) => {
  try {
    createCookieRoutes(app);
  } catch (e) {
    console.error("Failed to create cookie routes:", e);
  }

  try {
    createProviderRoutes(app, strategies);
  } catch (e) {
    console.error("Failed to create routes:", e);
  }
};

// Extract strategy details
const templateStrategies = Object.entries(strategies)
  .filter(([, strategyConfig]) => strategyConfig.type !== "local")
  .map(([, strategyConfig]) => {
    const { loginURL, displayName, fontAwesomeIcon } = strategyConfig.params;
    return { displayName, loginURL, fontAwesomeIcon };
  });

const localEndpoints = Object.entries(strategies)
  .filter(([, strategyConfig]) => strategyConfig.type === "local")
  .map(([, strategyConfig]) => {
    const { displayName, loginURL } = strategyConfig.params;
    return { displayName, loginURL };
  });

// Refresh Token Route
app.get(`${AUTH_PREFIX}/refresh`, async (req, res) => {
  if (AUTH_HOST && req.headers.host !== AUTH_HOST)
    return res.redirect(`${req.protocol}://${AUTH_HOST}${req.url}`);

  const { [REFRESH_TOKEN_NAME]: refreshToken } = req.cookies;
  const { redirect_url } = req.query;

  if (!refreshToken)
    return res
      .status(401)
      .redirect(
        redirect_url
          ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
          : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`
      );

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const token = jwt.sign(
      { user: decoded.user, strategy: decoded.strategy },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    setGlobalCookies(
      req,
      res,
      redirect_url
        ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
        : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
      [{ name: ACCESS_TOKEN_NAME, value: token, options: COOKIE_CONFIG }]
    );
  } catch (error) {
    console.error("Error verifying refresh token:", error);
    removeGlobalCookies(
      req,
      res,
      redirect_url
        ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
        : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
      [{ name: REFRESH_TOKEN_NAME, options: COOKIE_CONFIG }]
    );
  }
});

// Logout Route
app.get(`${AUTH_PREFIX}/logout`, (req, res) => {
  if (AUTH_HOST && req.headers.host !== AUTH_HOST)
    return res.redirect(`${req.protocol}://${AUTH_HOST}${req.url}`);

  const { redirect_url } = req.query;
  removeGlobalCookies(
    req,
    res,
    redirect_url
      ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
      : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
    [
      { name: ACCESS_TOKEN_NAME, options: COOKIE_CONFIG },
      { name: REFRESH_TOKEN_NAME, options: COOKIE_CONFIG },
    ]
  );
});

// Authentication Route
app.get(`${AUTH_PREFIX}/`, (req, res) => {
  const { [ACCESS_TOKEN_NAME]: token, [REFRESH_TOKEN_NAME]: refreshToken } =
    req.cookies;
  const { redirect_url } = req.query;

  try {
    if (!token && !refreshToken) throw new Error("No token found");

    if (!token && refreshToken)
      return res
        .status(301)
        .redirect(
          redirect_url
            ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/refresh?redirect_url=${redirect_url}`
            : `${req.protocol
            }://${AUTH_HOST}${AUTH_PREFIX}/refresh?redirect_url=${req.protocol
            }://${req.headers.host}${req.forwardedUri || ""}`
        );

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    res.status(200).set("X-Forwarded-User", decoded.user);

    if (redirect_url) return redirect(res, redirect_url);

    res.render("logged-in", {
      title: "Logged In",
      longLivedTokensEnabled: LONG_LIVED_TOKENS_ENABLED,
      longLivedTokens: LONG_LIVED_TOKENS,
      show_credit: !FORM_DISABLE_CREDITS,
    });
  } catch (error) {
    console.error("Error verifying access token:", error);
    req.session.redirect =
      req.query.redirect_url ||
      `${req.protocol}://${req.headers.host}${req.forwardedUri || ""}`;

    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
      return res.redirect(
        `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${req.session.redirect}`
      );

    res.status(401).render("form", {
      title: FORM_TITLE,
      strategies: templateStrategies,
      endpoints: localEndpoints,
      initialEndpoint: localEndpoints[0] ? localEndpoints[0].loginURL : null,
      admin_text: FORM_ADMIN_TEXT,
      show_credit: !FORM_DISABLE_CREDITS,
    });
  }
});

defineRoutes(app, strategies);

app.use(authorization);
app.use(errorHandler);

let server;
const start = () => {
  server = app.listen(3000, "0.0.0.0", () => {
    console.log("Server is running on port 3000");
  });
};

const stop = () => {
  server.close();
};

process.on("SIGTERM", stop);

start();

module.exports = { app, server, start, stop };