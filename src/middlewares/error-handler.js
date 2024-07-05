const {
  AUTH_HOST,
  AUTH_PREFIX,
  FORM_DISABLE_CREDITS,
} = require("../config/constants");
const session = require("express-session");

module.exports = (err, req, res) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: err.message,
    stack: err.stack,
    url: `${req.protocol}://${req.headers.host}${
      req.forwardedUri || req.url
    }`.split("?")[0],
    back_url:
      session.redirect ||
      `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}`.split("?")[0],
    show_credit: !FORM_DISABLE_CREDITS,
  });
};
