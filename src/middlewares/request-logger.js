module.exports = (req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] - ${req.method} ${req.url} - ${
      req.forwardedUri || "No forwarded URI"
    }`
  );
  next();
};
