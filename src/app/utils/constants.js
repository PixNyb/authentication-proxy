const crypto = require("crypto");

function parseBoolean(str) {
  if (typeof str !== "string") return false;
  const falsy = ["false", "0", "no", "null", "undefined", ""];
  return !falsy.includes(str.toLowerCase());
}

function processTokens(tokens) {
  return tokens.split(",").reduce((acc, key) => {
    const [name, value] = key.split(":");
    acc[name] = value;
    return acc;
  }, {});
}

function generateTokens() {
  const tokens = {};
  const numTokens = parseInt(process.env.LONG_LIVED_TOKENS_NUMBER) || 6;
  for (let i = 0; i < numTokens; i++) {
    tokens[`Token ${i + 1}`] =
      "token_" + crypto.randomBytes(64).toString("hex");
  }
  return tokens;
}

const normalizeHost = (host) => {
  if (!host) return "localhost";
  try {
    const url = new URL(host.includes("://") ? host : `http://${host}`);
    return url.port ? `${url.hostname}:${url.port}` : url.hostname;
  } catch {
    return "localhost";
  }
};

module.exports = {
  AUTH_PREFIX: process.env.AUTH_PREFIX || "",
  AUTH_HOST: normalizeHost(process.env.AUTH_HOST || "localhost"),
  SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(64).toString("hex"),

  // JWT tokens
  ACCESS_TOKEN_NAME: process.env.ACCESS_TOKEN_NAME || "_access_token",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET || crypto.randomBytes(64).toString("hex"),
  ACCESS_TOKEN_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION || "15m",
  REFRESH_TOKEN_NAME: process.env.REFRESH_TOKEN_NAME || "_refresh_token",
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || crypto.randomBytes(64).toString("hex"),
  REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || "7d",

  COOKIE_CONFIG: {
    httpOnly: true,
    secure: parseBoolean(process.env.COOKIE_SECURE) || false,
    sameSite: "lax",
    path: "/",
  },

  COOKIE_HOSTS: process.env.COOKIE_HOSTS
    ? process.env.COOKIE_HOSTS.split(",").map(normalizeHost)
    : [normalizeHost(process.env.AUTH_HOST || "localhost")],
  COOKIE_HOSTS_USE_ROOT:
    parseBoolean(process.env.COOKIE_HOSTS_USE_ROOT) || false,
  COOKIE_MODIFY_SECRET:
    process.env.COOKIE_MODIFY_SECRET || crypto.randomBytes(64).toString("hex"),

  // Form properties
  FORM_TITLE: process.env.FORM_TITLE || "Login",
  FORM_ADMIN_EMAIL: process.env.FORM_ADMIN_EMAIL || "",
  FORM_ADMIN_TEXT: process.env.FORM_ADMIN_EMAIL
    ? `Please contact the administrator at <a href="mailto:${process.env.FORM_ADMIN_EMAIL || ""
    }">${process.env.FORM_ADMIN_EMAIL || ""}</a> for access.`
    : "You're on your own!",
  FORM_DISABLE_CREDITS: parseBoolean(process.env.FORM_DISABLE_CREDITS) || false,

  // API keys
  LONG_LIVED_TOKENS_ENABLED:
    parseBoolean(process.env.LONG_LIVED_TOKENS_ENABLED) || false,
  LONG_LIVED_TOKENS_NUMBER: parseInt(process.env.LONG_LIVED_TOKENS_NUMBER) || 6,
  LONG_LIVED_TOKENS: process.env.LONG_LIVED_TOKENS
    ? processTokens(process.env.LONG_LIVED_TOKENS)
    : generateTokens()
};
