const {
  COOKIE_HOSTS,
  COOKIE_HOSTS_USE_ROOT,
  AUTH_PREFIX,
  COOKIE_MODIFY_SECRET,
} = require("./config/constants");
const redirect = require("./redirect");
const { generateSignedData, verifySignedData } = require("./utils/helpers");

const setGlobalCookies = (req, res, redirectUrl, cookies) => {
  const cookieUrls = COOKIE_HOSTS.map((domain, index) => {
    const url = new URL(`${AUTH_PREFIX}/set-cookies`, `${req.protocol}://${domain}`);
    const token = generateSignedData(
      { cookies: JSON.stringify(cookies), redirectUrl, index },
      COOKIE_MODIFY_SECRET
    );

    url.searchParams.append("t", token);

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
    const token = generateSignedData(
      { cookies: JSON.stringify(cookies), redirectUrl, index },
      COOKIE_MODIFY_SECRET
    );

    url.searchParams.append("t", token);

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
    const token = req.query.t;
    const decoded = verifySignedData(token, COOKIE_MODIFY_SECRET);
    if (!decoded)
      return res.status(400).json({ error: "Invalid token" });

    let { cookies, redirectUrl, index } = decoded;
    index = parseInt(index);
    cookies = JSON.parse(cookies);

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
      redirect(res, redirectUrl || `${AUTH_PREFIX}/`);
    } else {
      const next_domain = COOKIE_HOSTS[index + 1];
      const url = new URL(`${AUTH_PREFIX}/set-cookies`, `http://${next_domain}`);
      const token = generateSignedData(
        { cookies: JSON.stringify(cookies), redirectUrl, index: index + 1 },
        COOKIE_MODIFY_SECRET
      );

      url.searchParams.append("t", token);

      redirect(res, url.toString());
    }
  });

  app.get(`${AUTH_PREFIX}/remove-cookies`, (req, res) => {
    const token = req.query.t;
    const decoded = verifySignedData(token, COOKIE_MODIFY_SECRET);
    if (!decoded)
      return res.status(400).json({ error: "Invalid token" });

    let { cookies, redirectUrl, index } = decoded;
    index = parseInt(index);
    cookies = JSON.parse(cookies);

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
      redirect(res, redirectUrl || `${AUTH_PREFIX}/`);
    } else {
      const next_domain = COOKIE_HOSTS[index + 1];
      const url = new URL(`${AUTH_PREFIX}/remove-cookies`, `http://${next_domain}`);
      const token = generateSignedData(
        { cookies: JSON.stringify(cookies), redirectUrl, index: index + 1 },
        COOKIE_MODIFY_SECRET
      );

      url.searchParams.append("t", token);

      redirect(res, url.toString());
    }
  });
};

module.exports = {
  setGlobalCookies,
  removeGlobalCookies,
  createCookieRoutes,
};
