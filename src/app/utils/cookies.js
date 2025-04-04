const { COOKIE_HOSTS, AUTH_PREFIX, COOKIE_MODIFY_SECRET, ACCESS_TOKEN_NAME, COOKIE_CONFIG, REFRESH_TOKEN_NAME } = require("./constants");
const { generateSignedData, addRedirectQuery } = require("./helpers");
const { generateAccessToken, generateRefreshToken } = require("./jwt");

/**
 * Set global (multi-domain) cookies on all cookie hosts
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} redirectUrl - The URL to redirect to after setting cookies
 * @param {Array} cookies - The cookies to set
 */
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

/**
 * Remove global (multi-domain) cookies on all cookie hosts
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {string} redirectUrl - The URL to redirect to after removing cookies
 * @param {Array} cookies - The cookies to remove
 */
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

/**
 * Set login cookies for the user.
 * It generates access and refresh tokens, then sets them as cookies in the response.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Object} user - The user object
 * @param {Object} strategy - The authentication strategy
 */
const setLoginCookies = (req, res, user, strategy, redirect_url = addRedirectQuery(req, `/`)) => {
    const accessToken = generateAccessToken({
        user,
        strategy,
    });

    const refreshToken = generateRefreshToken({
        user: user,
        strategy: strategy,
    });

    setGlobalCookies(
        req,
        res,
        redirect_url,
        [
            { name: ACCESS_TOKEN_NAME, value: accessToken, options: COOKIE_CONFIG },
            { name: REFRESH_TOKEN_NAME, value: refreshToken, options: COOKIE_CONFIG },
        ]
    );
}

/**
 * Clear login cookies from the response.
 * It removes the access and refresh tokens by setting them with empty values.
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
const clearLoginCookies = (req, res, redirect_url = addRedirectQuery(req, `/`)) => {
    removeGlobalCookies(
        req,
        res,
        redirect_url,
        [
            { name: ACCESS_TOKEN_NAME, options: COOKIE_CONFIG },
            { name: REFRESH_TOKEN_NAME, options: COOKIE_CONFIG },
        ]
    );
}

module.exports = {
    setGlobalCookies,
    removeGlobalCookies,
    setLoginCookies,
    clearLoginCookies,
};