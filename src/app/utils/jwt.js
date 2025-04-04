const jwt = require("jsonwebtoken");
const {
    ACCESS_TOKEN_SECRET,
    REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRATION,
    REFRESH_TOKEN_EXPIRATION,
} = require("./constants");

/**
 * Generate an access token.
 * @param {Object} payload - The payload to include in the token.
 * @returns {string} - The signed JWT.
 */
const generateAccessToken = (payload) => {
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

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
    decodeToken,
};