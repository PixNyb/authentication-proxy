const express = require("express");
const { addRedirectQuery, getRedirectUrl, redirect } = require("../utils/helpers");
const { verifyToken } = require("../utils/jwt");
const { getTemplateStrategies, getLocalEndpoints } = require("../passport/strategies");

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

const templateStrategies = getTemplateStrategies();
const localEndpoints = getLocalEndpoints();

const router = express.Router({ mergeParams: true });

router.route('/refresh').get(async (req, res) => {
    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/refresh`));

    const refreshToken = req.cookies[REFRESH_TOKEN_NAME];

    try {
        if (!refreshToken)
            throw new Error("No refresh token found");

        const decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
        if (!decoded) throw new Error("Invalid refresh token");

        setLoginCookies(req, res,
            decoded.user,
            decoded.strategy,
            getRedirectUrl(req),
        );
    } catch (err) {
        console.error(err);
        clearLoginCookies(req, res);
    }
});

router.route('/logout').get((req, res) => {
    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/logout`));

    clearLoginCookies(req, res);
});

router.route('/login').get((req, res) => {
    if (req.user) return redirect(res, addRedirectQuery(req, `/`));

    req.session.redirect_url = getRedirectUrl(req);

    if (AUTH_HOST && req.headers.host !== AUTH_HOST)
        return redirect(res, addRedirectQuery(req, `/login`));

    res.status(200).render("login", {
        title: FORM_TITLE,
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
        if (refreshToken)
            return redirect(res, addRedirectQuery(req, `/refresh`));
        else
            return redirect(res, addRedirectQuery(req, `/login`));
    }

    res.render("logged-in", {
        title: "Logged In",
        longLivedTokensEnabled: LONG_LIVED_TOKENS_ENABLED,
        longLivedTokens: LONG_LIVED_TOKENS,
        show_credit: !FORM_DISABLE_CREDITS,
    });
});

module.exports = router;