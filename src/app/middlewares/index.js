const authorizationHandler = require('./authorization-handler.middleware');
const errorHandler = require('./error-handler.middleware');
const forwardedHeaderParser = require('./forwarded-header-parser.middleware');
const longLivedTokensHandler = require('./long-lived-tokens-handler.middleware');
const requestLogger = require('./request-logger.middleware');
const userDecoder = require('./user-decoder.middleware');

module.exports = {
    authorizationHandler,
    errorHandler,
    forwardedHeaderParser,
    longLivedTokensHandler,
    requestLogger,
    userDecoder,
};