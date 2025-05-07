
const session = require("express-session");

const {
  AUTH_PREFIX,
  AUTH_HOST,
  FORM_DISABLE_CREDITS,
  NODE_ENV
} = require("../utils/constants");

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  console.error(err);

  try {
    if (req.session) {
      req.session.destroy();
    }
  }
  catch (error) {
    console.error("Error destroying session:", error);
  }

  try {
    res.render("error", {
      title: err.code || "Oops!",
      message: NODE_ENV === "development" && err.message ? err.message : "Something went wrong",
      stack: err.stack,
      url: `${req.protocol}://${req.headers.host}${req.forwardedUri || req.url}`.split("?")[0],
      back_url:
        session.redirect ||
        `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}`.split("?")[0],
      show_credit: !FORM_DISABLE_CREDITS,
    });
  }
  catch (error) {
    console.error("Error rendering error page:", error);
    res.status(500).send("Internal Server Error");
  }
};
