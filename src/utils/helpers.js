const jwt = require("jsonwebtoken");
const { AUTH_PREFIX, AUTH_HOST } = require("../config/constants");

const getRedirectUrl = (req) => {
    const redirect_url = req.query.redirect_url || req.session.redirect_url;
    if (redirect_url) return redirect_url;

    const {
        host,
        protocol,
        uri,
    } = req.forward;

    if (!host || !protocol || !uri) return null;

    const destination = `${protocol}://${host}${uri}`;
    return destination;
}

const addRedirectQuery = (req, url) => {
    const redirectUrl = getRedirectUrl(req);

    if (url && !url.startsWith("http"))
        url = `${req.protocol}://${AUTH_HOST}${AUTH_PREFIX}/${url.replace(/^\/+/, "")}`;

    if (redirectUrl)
        return `${url}?redirect_url=${encodeURIComponent(redirectUrl)}`;

    return url;
};

const generateSignedData = (payload, secret) => {
    const token = jwt.sign(
        payload, secret, { expiresIn: "5m" }
    );

    return token;
};

const verifySignedData = (token, secret) => {
    try {
        const decoded = jwt.verify(token, secret);
        return decoded;
    } catch {
        return null;
    }
};

module.exports = {
    getRedirectUrl,
    addRedirectQuery,
    generateSignedData,
    verifySignedData,
};