const csurf = require('tiny-csrf');
const { CSRF_SECRET } = require('../utils/constants');

module.exports = csurf(
    CSRF_SECRET,
    [
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
    ],
);