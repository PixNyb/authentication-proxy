const { verifyToken, hasPermission } = require("../utils/jwt");
const { getStrategies } = require("../passport/strategies");
const { unauthorizedRequestsCounter, authorizedRequestsCounter } = require('../metrics');

const {
    ACCESS_TOKEN_NAME,
    ACCESS_TOKEN_SECRET,
    AUTH_PREFIX,
    RBAC_ENABLED,
} = require("../utils/constants");

const strategies = getStrategies();

module.exports = (req, res) => {
    const path = (req.forward?.uri || req.url).split("?")[0];
    let applicationRoutes = [
        `/healthz`,
        `${AUTH_PREFIX}/`,
        `${AUTH_PREFIX}/login`,
        `${AUTH_PREFIX}/refresh`,
        `${AUTH_PREFIX}/logout`,
        `${AUTH_PREFIX}/set-cookies`,
        `${AUTH_PREFIX}/remove-cookies`
    ];
    let providerRoutes = [];
    Object.entries(strategies).forEach(([, strategyConfig]) => {
        const { loginURL, callbackURL } = strategyConfig.params;
        providerRoutes.push(loginURL);
        providerRoutes.push(callbackURL);
    });

    applicationRoutes = [...new Set(applicationRoutes)];
    providerRoutes = [...new Set(providerRoutes)];

    if (providerRoutes.includes(path) || applicationRoutes.includes(path)) {
        authorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        return res.sendStatus(200);
    }

    const { [ACCESS_TOKEN_NAME]: token } = req.cookies;

    if (!token) {
        unauthorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        return res.sendStatus(401);
    }

    try {
        const decoded = verifyToken(token, ACCESS_TOKEN_SECRET);

        // Check for required permissions if RBAC is enabled
        if (RBAC_ENABLED) {
            // Extract required permissions from headers or query parameters
            const requiredPermission = req.headers['x-required-permission'] || req.query.requiredPermission;
            const requiredPermissions = req.headers['x-required-permissions'] || req.query.requiredPermissions;

            // Parse permissions array if provided as JSON string
            const parsedPermissions = requiredPermissions ?
                (typeof requiredPermissions === 'string' ? JSON.parse(requiredPermissions) : requiredPermissions) :
                [];

            // Combine single permission with permissions array if both are provided
            const allRequiredPermissions = requiredPermission ?
                [...parsedPermissions, requiredPermission] :
                parsedPermissions;

            // Check if user has required permissions
            if (allRequiredPermissions && allRequiredPermissions.length > 0 &&
                !hasPermission(decoded, allRequiredPermissions)) {
                unauthorizedRequestsCounter.inc({
                    host: req.forward.host || req.headers.host,
                    path: req.forward.uri || req.url,
                    reason: "insufficient_permissions"
                });
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Insufficient permissions"
                });
            }
        }

        authorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });

        // Add role and permissions info to the forwarded headers if RBAC is enabled
        const headers = { "X-Forwarded-User": decoded.user };
        if (RBAC_ENABLED) {
            if (decoded.role) headers["X-Forwarded-Role"] = decoded.role;
            if (decoded.permissions) headers["X-Forwarded-Permissions"] = JSON.stringify(decoded.permissions);
        }

        res.set(headers).sendStatus(200);
    } catch {
        unauthorizedRequestsCounter.inc({ host: req.forward.host || req.headers.host, path: req.forward.uri || req.url });
        res.sendStatus(401);
    }
};
