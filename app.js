const express = require("express");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const promBundle = require("express-prom-bundle");
const passport = require("./passport-setup");
const session = require("express-session");
const strategies = require("./strategies");
const createProviderRoutes = require("./dynamic-routes");
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
} = require("./constants");
const {
  removeGlobalCookies,
  setGlobalCookies,
  createCookieRoutes,
} = require("./global-cookies");
const helmet = require("helmet");
const expressEjsLayouts = require("express-ejs-layouts");
const redirect = require("./redirect");

// Initialize app
const app = express();
app.use(expressEjsLayouts);
app.set("layout", "./layouts/page");
app.set("view engine", "ejs");
app.set("layout extractScripts", true);

// Middleware
// app.use(
//   helmet.contentSecurityPolicy({
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", AUTH_HOST],
//       formAction: [AUTH_HOST],
//     },
//   }),
// );
app.use(
  promBundle({
    includeMethod: true,
    includePath: true,
    metricsPath: `${PROMETHEUS_PREFIX}/metrics`,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  session({
    secret: SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: true,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

// Health Check Route
app.get("/healthz", (req, res) => {
  res.send("OK");
});

// Middleware for handling forwarded headers
app.use((req, res, next) => {
  const headers = req.headers;
  req.headers.host = headers["x-forwarded-host"] || req.headers.host;
  req.protocol = headers["x-forwarded-proto"] || req.protocol;
  req.method = headers["x-forwarded-method"] || req.method;
  req.forwardedUri = headers["x-forwarded-uri"] || req.forwardedUri;
  req.ip = headers["x-forwarded-for"] || req.ip;
  next();
});

// Middleware for logging requests
app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] - ${req.method} ${req.url} - ${req.forwardedUri || "No forwarded URI"}`,
  );
  next();
});

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
  .filter(([id, strategyConfig]) => strategyConfig.type !== "local")
  .map(([id, strategyConfig]) => {
    const { loginURL, displayName, fontAwesomeIcon } = strategyConfig.params;
    return { displayName, loginURL, fontAwesomeIcon };
  });

const localEndpoints = Object.entries(strategies)
  .filter(([id, strategyConfig]) => strategyConfig.type === "local")
  .map(([id, strategyConfig]) => {
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
          : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
      );

  try {
    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const token = jwt.sign(
      { user: decoded.user, strategy: decoded.strategy },
      ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" },
    );

    setGlobalCookies(
      req,
      res,
      redirect_url
        ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
        : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
      [{ name: ACCESS_TOKEN_NAME, value: token, options: COOKIE_CONFIG }],
    );
  } catch (e) {
    removeGlobalCookies(
      req,
      res,
      redirect_url
        ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${redirect_url}`
        : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/`,
      [{ name: REFRESH_TOKEN_NAME, options: COOKIE_CONFIG }],
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
    ],
  );
});

// Authentication Route
app.get(`${AUTH_PREFIX}/`, (req, res) => {
  const { [ACCESS_TOKEN_NAME]: token, [REFRESH_TOKEN_NAME]: refreshToken } =
    req.cookies;
  const { redirect_url } = req.query;
  console.log("Cookies:", req.cookies);

  try {
    if (!token && !refreshToken) throw new Error("No token found");

    if (!token && refreshToken)
      return res
        .status(301)
        .redirect(
          redirect_url
            ? `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/refresh?redirect_url=${redirect_url}`
            : `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/refresh?redirect_url=${req.protocol}://${req.headers.host}${req.forwardedUri || ""}`,
        );

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    res.status(200).set("X-Forwarded-User", decoded.user);

    if (redirect_url) return redirect(res, redirect_url);

    res.render("logged-in", {
      title: "Logged In",
      show_credit: !FORM_DISABLE_CREDITS,
    });
  } catch (e) {
    req.session.redirect =
      req.query.redirect_url ||
      `${req.protocol}://${req.headers.host}${req.forwardedUri || ""}`;

    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
      return res.redirect(
        `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/?redirect_url=${req.session.redirect}`,
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

// Authorization Middleware
app.use((req, res, next) => {
  const path = (req.forwardedUri || req.url).split("?")[0];
  const providerRoutes = Object.values(strategies).reduce((acc, strategy) => {
    if (strategy.params.loginURL) acc.push(strategy.params.loginURL);
    if (strategy.params.callbackURL) acc.push(strategy.params.callbackURL);
    return acc;
  }, []);

  const appRoutes = ["/set-cookies", "/remove-cookies", "/refresh", "/logout"];

  // There's something funky going on with the access token cookie, it'll end up unsetting it and looping into /refresh where it fails to set a new cookie and thus looping back to /refresh
  // This doesn't interfere with anything, but doesn't do much either.
  if (providerRoutes.includes(path) || appRoutes.includes(path))
    return res.sendStatus(200);

  const { [ACCESS_TOKEN_NAME]: token } = req.cookies;

  if (!token) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    res.set("X-Forwarded-User", decoded.user).sendStatus(200);
  } catch (e) {
    res.sendStatus(401);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: err.message,
    stack: err.stack,
    url: `${req.protocol}://${req.headers.host}${req.forwardedUri || req.url}`.split(
      "?",
    )[0],
    back_url:
      session.redirect ||
      `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}`.split("?")[0],
    show_credit: !FORM_DISABLE_CREDITS,
  });
});

// Start the server
app.listen(3000, "0.0.0.0", () => {
  console.log("Server is running on port 3000");
});

module.exports = app;
