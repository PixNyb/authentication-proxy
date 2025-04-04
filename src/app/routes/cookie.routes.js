const { COOKIE_MODIFY_SECRET, COOKIE_HOSTS_USE_ROOT, AUTH_PREFIX, COOKIE_HOSTS } = require("../utils/constants");
const { verifySignedData, generateSignedData, redirect } = require("../utils/helpers");
const express = require("express");

const router = express.Router({ mergeParams: true });

router.route('/set-cookies').get((req, res) => {
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

router.route('/remove-cookies').get((req, res) => {
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

module.exports = router;