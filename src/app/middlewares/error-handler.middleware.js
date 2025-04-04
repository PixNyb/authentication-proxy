
const session = require("express-session");

const {
  AUTH_PREFIX,
  AUTH_HOST,
  FORM_DISABLE_CREDITS
} = require("../utils/constants");

module.exports = (err, req, res) => {
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
    res.status(500).render("error", {
      title: err.message,
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
