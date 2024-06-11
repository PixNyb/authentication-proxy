const crypto = require("crypto");

function parseBoolean(str) {
  if (typeof str !== "string") return false;
  const falsy = ["false", "0", "no", "null", "undefined", ""];
  return !falsy.includes(str.toLowerCase());
}

function processApiKeys(keys) {
  return keys.split(",").reduce((acc, key) => {
    const [name, value] = key.split(":");
    acc[name] = value;
    return acc;
  }, {});
}

function generateApiKeys() {
  const keys = {};
  const numKeys = parseInt(process.env.API_KEYS_NUMBER) || 5;
  for (let i = 0; i < numKeys; i++) {
    keys[`Key ${i + 1}`] = "auth_key_" + crypto.randomBytes(64).toString('hex');
  }
  return keys;
}

module.exports = {
  AUTH_PREFIX: process.env.AUTH_PREFIX || "",
  AUTH_HOST: process.env.AUTH_HOST || "localhost",
  SESSION_SECRET: process.env.SESSION_SECRET || "keyboard cat",

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

  // Form properties
  FORM_TITLE: process.env.FORM_TITLE || "Login",
  FORM_ADMIN_EMAIL: process.env.FORM_ADMIN_EMAIL || "",
  FORM_ADMIN_TEXT: process.env.FORM_ADMIN_EMAIL
    ? `Please contact the administrator at <a href="mailto:${process.env.FORM_ADMIN_EMAIL || ""}">${process.env.FORM_ADMIN_EMAIL || ""}</a> for access.`
    : "You're on your own!",
  FORM_DISABLE_CREDITS: parseBoolean(process.env.FORM_DISABLE_CREDITS) || false,

  // API keys
  API_KEYS_ENABLED: parseBoolean(process.env.API_KEYS_ENABLED) || false,
  API_KEYS_NUMBER: parseInt(process.env.API_KEYS_NUMBER) || 5,
  API_KEYS: process.env.API_KEYS ? processApiKeys(process.env.API_KEYS) : generateApiKeys(),

  // Metrics
  PROMETHEUS_PREFIX: process.env.PROMETHEUS_PREFIX || "",
};
