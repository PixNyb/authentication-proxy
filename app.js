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
  FORM_ADMIN_EMAIL,
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
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  }),
);
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

app.get("/500", (req, res) => {
  throw new Error("This is a test error");
});

// Define routes
const defineRoutes = (app, strategies) => {
  try {
    createProviderRoutes(app, strategies);
  } catch (e) {
    console.error("Failed to create routes:", e);
  }

  try {
    createCookieRoutes(app);
  } catch (e) {
    console.error("Failed to create cookie routes:", e);
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

    if (redirect_url) redirect(res, redirect_url);

    res.render("success", {
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
  const { [ACCESS_TOKEN_NAME]: token } = req.cookies;

  if (!token) return res.status(401).send("Unauthorized");

  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.headers["x-forwarded-user"] = decoded.user;
    next();
  } catch (e) {
    res.status(401).send("Unauthorized");
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
