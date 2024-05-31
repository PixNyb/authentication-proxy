function parseBoolean(str) {
  if (typeof str !== "string") return false;
  const falsy = ["false", "0", "no", "null", "undefined", ""];
  return !falsy.includes(str.toLowerCase());
}

module.exports = {
  AUTH_PREFIX: process.env.AUTH_PREFIX || "",
  AUTH_HOST: process.env.AUTH_HOST || "localhost",

  // JWT tokens
  ACCESS_TOKEN_NAME: process.env.ACCESS_TOKEN_NAME || "_access_token",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || "secret",
  REFRESH_TOKEN_NAME: process.env.REFRESH_TOKEN_NAME || "_refresh_token",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || "refresh",

  COOKIE_CONFIG: {
    httpOnly: true,
    secure: parseBoolean(process.env.COOKIE_SECURE) || false,
    sameSite: "lax",
    path: "/",
  },

  COOKIE_HOSTS: process.env.COOKIE_HOSTS
    ? process.env.COOKIE_HOSTS.split(",")
    : [process.env.AUTH_HOST || "localhost"],
  COOKIE_HOSTS_USE_ROOT:
    parseBoolean(process.env.COOKIE_HOSTS_USE_ROOT) || false,
};
