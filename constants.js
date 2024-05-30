function parseBoolean(str) {
    console.log(str);
    const falsy = ['false', '0', 'no', 'null', 'undefined', ''];
    return !falsy.includes(str.toLowerCase());
}

module.exports = {
    AUTH_PREFIX: process.env.AUTH_PREFIX || '',
    AUTH_HOST: process.env.AUTH_HOST || 'http://localhost',

    // JWT tokens
    ACCESS_TOKEN_NAME: process.env.ACCESS_TOKEN_NAME || '_access_token',
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || 'secret',
    REFRESH_TOKEN_NAME: process.env.REFRESH_TOKEN_NAME || '_refresh_token',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh',

    COOKIE_CONFIG: {
        httpOnly: true,
        secure: parseBoolean(process.env.COOKIE_SECURE) || false,
        sameSite: 'strict',
        path: '/',
        domain: process.env.COOKIE_DOMAIN || null,
    }
}