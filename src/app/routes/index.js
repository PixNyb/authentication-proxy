const authorization = require('./authorization.routes');
const cookie = require('./cookie.routes');
const health = require('./health.routes');
const provider = require('./provider.routes');

module.exports = {
    authorization,
    cookie,
    health,
    provider,
};