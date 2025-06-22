const { verifyToken } = require("../utils/jwt");

const {
    ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_NAME,
    RBAC_ENABLED
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

    // Set forwarded user header
    if (req.user) {
        const headers = { "X-Forwarded-User": req.user.user };

        // Add role and permissions info to the forwarded headers if RBAC is enabled
        if (RBAC_ENABLED) {
            if (req.user.role) headers["X-Forwarded-Role"] = req.user.role;
            if (req.user.permissions) headers["X-Forwarded-Permissions"] = JSON.stringify(req.user.permissions);
        }

        res.set(headers);
    }

    next();
};
