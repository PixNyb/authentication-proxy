const express = require("express");
const { addRedirectQuery, getRedirectUrl, redirect } = require("../utils/helpers");
const { verifyToken } = require("../utils/jwt");
const { getTemplateStrategies, getLocalEndpoints } = require("../passport/strategies");
const { csrfProtectionMiddleware } = require("../middlewares");

const {
    AUTH_HOST,
    REFRESH_TOKEN_NAME,
    REFRESH_TOKEN_SECRET,
    FORM_TITLE,
    FORM_ADMIN_TEXT,
    FORM_DISABLE_CREDITS,
    LONG_LIVED_TOKENS_ENABLED,
    LONG_LIVED_TOKENS
} = require("../utils/constants");
const { setLoginCookies, clearLoginCookies } = require("../utils/cookies");
const { refreshCounter, logoutCounter, unauthorizedRequestsCounter, authorizedRequestsCounter } = require("../metrics");

const templateStrategies = getTemplateStrategies();
const localEndpoints = getLocalEndpoints();

const router = express.Router({ mergeParams: true });

router.route('/refresh').get(csrfProtectionMiddleware, async (req, res) => {
    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/refresh`));

    const refreshToken = req.cookies[REFRESH_TOKEN_NAME];

    try {
        if (!refreshToken)
            throw new Error("No refresh token found");

        const decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
        if (!decoded) throw new Error("Invalid refresh token");

        refreshCounter.inc({ status: "success" });
        setLoginCookies(req, res,
            decoded.user,
            decoded.strategy,
            getRedirectUrl(req),
        );
    } catch (err) {
        console.error(err);
        refreshCounter.inc({ status: "failure" });
        clearLoginCookies(req, res);
    }
});

router.route('/logout').get(csrfProtectionMiddleware, (req, res) => {
    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/logout`));

    if (!req.user) return redirect(res, addRedirectQuery(req, `/login`));
    logoutCounter.inc({ status: "success" });
    clearLoginCookies(req, res);
});

router.route('/login').get(csrfProtectionMiddleware, (req, res) => {
    if (req.user) return redirect(res, addRedirectQuery(req, `/`));

    req.session.redirect_url = getRedirectUrl(req);

    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/login`));

    res.status(200).render("login", {
        title: FORM_TITLE,
        additional_head:
            "<meta name='csrf-token' content='" + req.csrfToken() + "'>",
        strategies: templateStrategies,
        endpoints: localEndpoints,
        initialEndpoint: localEndpoints[0] ? localEndpoints[0].loginURL : null,
        admin_text: FORM_ADMIN_TEXT,
        show_credit: !FORM_DISABLE_CREDITS,
    });
});

router.route('/').all((req, res) => {
    const refreshToken = req.cookies[REFRESH_TOKEN_NAME]

    if (!req.user) {
        unauthorizedRequestsCounter.inc({
            host: req.forward?.host || req.headers.host,
            path: req.forward?.uri || req.url,
        });

        if (req.method != "GET") {
            return res.status(401).json({
                error: "Unauthorized",
                message: "You are not logged in",
            });
        }

        if (refreshToken)
            return redirect(res, addRedirectQuery(req, `/refresh`));
        else
            return redirect(res, addRedirectQuery(req, `/login`));
    }

    authorizedRequestsCounter.inc({
        host: req.forward?.host || req.headers.host,
        path: req.forward?.uri || req.url,
    });

    res.render("logged-in", {
        title: "Logged In",
        longLivedTokensEnabled: LONG_LIVED_TOKENS_ENABLED,
        longLivedTokens: LONG_LIVED_TOKENS,
        show_credit: !FORM_DISABLE_CREDITS,
    });
});

module.exports = router;