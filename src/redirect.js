const { FORM_DISABLE_CREDITS } = require("./config/constants");

const redirect = (res, redirectUrl, permanent = false) => {
  if (res.xhr) {
    res.status(200).json({ redirectUrl });
    return;
  }

  const statusCode = permanent ? 301 : 302;
  res.status(statusCode).render("redirect", {
    title: "Redirecting...",
    additional_head:
      "<meta http-equiv='refresh' content='0;url=" + redirectUrl + "'>",
    redirectUrl: redirectUrl,
    show_credit: !FORM_DISABLE_CREDITS,
  });
};

module.exports = redirect;
