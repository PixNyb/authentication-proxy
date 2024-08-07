const { FORM_DISABLE_CREDITS } = require("./config/constants");

const redirect = (res, redirectUrl) => {
  res.status(301).render("redirect", {
    title: "Redirecting...",
    additional_head:
      "<meta http-equiv='refresh' content='0;url=" + redirectUrl + "'>",
    redirectUrl: redirectUrl,
    show_credit: !FORM_DISABLE_CREDITS,
  });
};

module.exports = redirect;
