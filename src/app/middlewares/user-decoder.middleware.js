const { verifyToken } = require("../utils/jwt");

const {
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_NAME
} = require("../utils/constants");

module.exports = (req, res, next) => {
    const accessToken = req.cookies[ACCESS_TOKEN_NAME];

    if (accessToken)
        try {
            req.user = verifyToken(accessToken, ACCESS_TOKEN_SECRET);
        } catch {
            req.user = null;
        }
    else req.user = null;

    res.set("X-Forwarded-User", req.user);

    next();
};
