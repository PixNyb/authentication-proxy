const jwt = require("jsonwebtoken");
const { AUTH_PREFIX, AUTH_HOST, FORM_DISABLE_CREDITS } = require("./constants");

/**
 * Get the redirect URL from the request.
 * It checks the query parameters and session for a redirect URL.
 * If not found, it constructs a URL using the request's forward information.
 * @param {Object} req - The request object
 * @returns {string|null} - The redirect URL or null if not found
 */
const getRedirectUrl = (req) => {
    const redirect_url = req.query.redirect_url || req.session.redirect_url;
    if (redirect_url) return redirect_url;
    if (!req.forward) return redirect_url;

    const {
        host,
        protocol,
        uri,
    } = req.forward;

    if (!host || !protocol || !uri) return null;

    const destination = `${protocol}://${host}${uri}`;
    return destination;
}

/**
 * Add redirect query to a URL.
 * If the URL is not absolute, it constructs a full URL using the request's protocol and host.
 * If a redirect URL is present, it appends it as a query parameter.
 * @param {Object} req - The request object
 * @param {string} url - The URL to which to add the redirect query
 * @return {string} - The URL with the redirect query added
 */
const addRedirectQuery = (req, url) => {
    const redirectUrl = getRedirectUrl(req);

    if (url && !url.startsWith("http"))
        url = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/${url.replace(/^\/+/, "")}`;

    if (redirectUrl)
        return `${url}?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return url;
};

/**
 * Redirect the response to a specified URL.
 * If the request is an XMLHttpRequest (XHR), it sends a JSON response with the redirect URL.
 * Otherwise, it renders a redirect page with a meta refresh tag.
 * @param {Object} res - The response object
 * @param {string} redirectUrl - The URL to redirect to
 * @param {boolean} permanent - Whether the redirect is permanent (301) or temporary (302)
 */
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

/**
 * Generate a signed JWT token with a payload and secret.
 * The token expires in 5 minutes.
 * @param {Object} payload - The payload to sign
 * @param {string} secret - The secret key to sign the token
 * @returns {string} - The signed JWT token
 */
const generateSignedData = (payload, secret) => {
    const token = jwt.sign(
        payload, secret, { expiresIn: "5m" }
    );

    return token;
};

/**
 * Verify a signed JWT token using a secret.
 * If the token is valid, it returns the decoded payload.
 * If the token is invalid or expired, it returns null.
 * @param {string} token - The token to verify
 * @param {string} secret - The secret key to verify the token
 * @returns {Object|null} - The decoded payload or null if invalid
 */
const verifySignedData = (token, secret) => {
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch {
        return null;
    }
};

/**
 * Get the age in seconds from an expiresIn string.
 * The string should be in the format of a number followed by a unit (s, m, h, d).
 * @param {string} expiresIn - The expiresIn string
 * @returns {number} - The age in seconds
 */
const getAgeFromExpiresIn = (expiresIn) => {
    const [value, unit] = expiresIn.match(/(\d+)(\w+)/);
    if (!value || !unit) throw new Error("Invalid expiresIn format");
    const seconds = {
        s: 1,
        m: 60,
        h: 60 * 60,
        d: 60 * 60 * 24,
    }[unit[0].toLowerCase()];

    return parseInt(value) * seconds;
};



module.exports = {
    getRedirectUrl,
    addRedirectQuery,
    redirect,
    generateSignedData,
    verifySignedData,
    getAgeFromExpiresIn
};