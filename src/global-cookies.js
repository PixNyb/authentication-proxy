const {
  COOKIE_HOSTS,
  COOKIE_HOSTS_USE_ROOT,
  AUTH_PREFIX,
} = require("./config/constants");
const redirect = require("./redirect");

const setGlobalCookies = (req, res, redirectUrl, cookies) => {
  const cookieUrls = COOKIE_HOSTS.map((domain, index) => {
    const url = new URL(`${AUTH_PREFIX}/set-cookies`, `${req.protocol}://${domain}`);
    url.searchParams.append("c", JSON.stringify(cookies));
    url.searchParams.append("u", redirectUrl);
    url.searchParams.append("i", index);

    return url.toString();
  });

  if (req.xhr) {
    res.status(200).json({ cookieUrls });
  } else {
    res.status(200).redirect(cookieUrls[0]);
  }
};

const removeGlobalCookies = (req, res, redirectUrl, cookies) => {
  const cookieUrls = COOKIE_HOSTS.map((domain, index) => {
    const url = new URL(`${AUTH_PREFIX}/remove-cookies`, `${req.protocol}://${domain}`);
    url.searchParams.append("c", JSON.stringify(cookies));
    url.searchParams.append("u", redirectUrl);
    url.searchParams.append("i", index);

    return url.toString();
  });

  if (req.xhr) {
    res.status(200).json({ cookieUrls });
  } else {
    res.status(200).redirect(cookieUrls[0]);
  }
};

const createCookieRoutes = (app) => {
  app.get(`${AUTH_PREFIX}/set-cookies`, (req, res) => {
    const { c, u, i } = req.query; // c = cookies, u = redirect_url, i = index
    const index = parseInt(i);
    const cookies = JSON.parse(c);
    const redirect_url = u;

    let domain = req.hostname;
    if (COOKIE_HOSTS_USE_ROOT) {
      let parts = req.hostname.split(".");
      domain = "." + parts.slice(parts.length - 2).join(".");
    }

    cookies.forEach((cookie) => {
      res.cookie(cookie.name, cookie.value, {
        ...cookie.options,
        domain,
      });
    });

    if (index == COOKIE_HOSTS.length - 1) {
      redirect(res, redirect_url || `${AUTH_PREFIX}/`);
    } else {
      const next_domain = COOKIE_HOSTS[index + 1];
      const url = new URL(`${AUTH_PREFIX}/set-cookies`, `http://${next_domain}`);
      url.searchParams.append("c", c);
      url.searchParams.append("i", index + 1);
      url.searchParams.append("u", u);

      redirect(res, url.toString());
    }
  });

  app.get(`${AUTH_PREFIX}/remove-cookies`, (req, res) => {
    const { c, u, i } = req.query; // c = cookies, u = redirect_url, i = index
    const index = parseInt(i);
    const cookies = JSON.parse(c);
    const redirect_url = u;

    let domain = req.hostname;
    if (COOKIE_HOSTS_USE_ROOT) {
      let parts = req.hostname.split(".");
      domain = "." + parts.slice(parts.length - 2).join(".");
    }

    cookies.forEach((cookie) => {
      res.clearCookie(cookie.name, {
        ...cookie.options,
        domain,
      });
    });

    if (index == COOKIE_HOSTS.length - 1) {
      redirect(res, redirect_url || `${AUTH_PREFIX}/`);
    } else {
      const next_domain = COOKIE_HOSTS[index + 1];
      const url = new URL(`${AUTH_PREFIX}/remove-cookies`, `http://${next_domain}`);
      url.searchParams.append("c", c);
      url.searchParams.append("i", index + 1);
      url.searchParams.append("u", u);

      redirect(res, url.toString());
    }
  });
};

module.exports = {
  setGlobalCookies,
  removeGlobalCookies,
  createCookieRoutes,
};
