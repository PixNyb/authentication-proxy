const { hasPermission } = require("../utils/jwt");
const { RBAC_ENABLED } = require("../utils/constants");

/**
 * Middleware for checking if the user has the required permissions.
 * @param {string|Array} requiredPermissions - The permission(s) required to access the route.
 * @returns {Function} - Express middleware function.
 */
module.exports = (requiredPermissions) => {
    return (req, res, next) => {
        // If RBAC is disabled, allow all requests
        if (!RBAC_ENABLED) {
            return next();
        }

        // If user is not authenticated, deny access
        if (!req.user) {
            return res.status(401).json({
                error: "Unauthorized",
                message: "You must be logged in to access this resource",
            });
        }

        // Check if user has required permissions
        if (hasPermission(req.user, requiredPermissions)) {
            return next();
        }

        // Deny access if user doesn't have required permissions
        return res.status(403).json({
            error: "Forbidden",
            message: "You don't have permission to access this resource",
        });
    };
};
