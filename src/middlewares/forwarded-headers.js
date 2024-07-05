module.exports = (req, res, next) => {
  const headers = req.headers;
  req.headers.host = headers["x-forwarded-host"] || req.headers.host;
  req.protocol = headers["x-forwarded-proto"] || req.protocol;
  req.method = headers["x-forwarded-method"] || req.method;
  req.forwardedUri = headers["x-forwarded-uri"] || req.forwardedUri;
  req.ip = headers["x-forwarded-for"] || req.ip;
  next();
};
