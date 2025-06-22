const jwt = require("jsonwebtoken");
const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRATION,
    REFRESH_TOKEN_EXPIRATION,
    RBAC_ENABLED,
    DEFAULT_ROLE,
    ROLES_CONFIG
} = require("./constants");

/**
 * Generate an access token.
 * @param {Object} payload - The payload to include in the token.
 * @returns {string} - The signed JWT.
 */
const generateAccessToken = (payload) => {
    // Add role information if RBAC is enabled
    if (RBAC_ENABLED) {
        const role = payload.role || DEFAULT_ROLE;
        const permissions = ROLES_CONFIG[role]?.permissions || [];
        payload = { ...payload, role, permissions };
    }

    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRATION,
    });
};

/**
 * Generate a refresh token.
 * @param {Object} payload - The payload to include in the token.
 * @returns {string} - The signed JWT.
 */
const generateRefreshToken = (payload) => {
    // Add role information if RBAC is enabled
    if (RBAC_ENABLED) {
        const role = payload.role || DEFAULT_ROLE;
        payload = { ...payload, role };
    }

    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRATION,
    });
};

/**
 * Verify a token.
 * @param {string} token - The token to verify.
 * @param {string} secret - The secret to verify the token against.
 * @returns {Object} - The decoded token payload.
 * @throws {Error} - If the token is invalid or expired.
 */
const verifyToken = (token, secret) => {
    return jwt.verify(token, secret);
};

/**
 * Decode a token without verifying its signature.
 * @param {string} token - The token to decode.
 * @returns {Object} - The decoded token payload.
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

/**
 * Check if a token has the required permission.
 * @param {Object} decoded - The decoded token.
 * @param {string|Array} requiredPermissions - The permission(s) required.
 * @returns {boolean} - Whether the token has the required permission.
 */
const hasPermission = (decoded, requiredPermissions) => {
    if (!RBAC_ENABLED) return true; // If RBAC is disabled, allow everything

    // If no permissions required, allow
    if (!requiredPermissions || (Array.isArray(requiredPermissions) && requiredPermissions.length === 0)) {
        return true;
    }

    // Check for admin with wildcard permission
    if (decoded.permissions && decoded.permissions.includes('*')) {
        return true;
    }

    // Convert single permission to array for consistent processing
    const permissionsToCheck = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // Check if user has all required permissions
    return permissionsToCheck.every(permission =>
        decoded.permissions && decoded.permissions.includes(permission)
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    decodeToken,
    hasPermission
};