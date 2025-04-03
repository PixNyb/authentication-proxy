module.exports = (req, res, next) => {
  const headers = req.headers;

  req.forward = {
    host: headers["x-forwarded-host"],
    protocol: headers["x-forwarded-proto"] || req.protocol,
    method: headers["x-forwarded-method"] || req.method,
    uri: headers["x-forwarded-uri"] || req.forwardedUri,
    ip: headers["x-forwarded-for"],
  };

  next();
};
