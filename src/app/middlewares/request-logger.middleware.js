module.exports = (req, res, next) => {
  const isForwarded = req.headers["x-forwarded-for"] || req.headers["x-forwarded-host"];
  const logTemplate = '[%s] (%s) %s - %s %s - %s';
  const urlWithoutQuery = req.url.split('?')[0];

  const logArgs = [
    new Date().toISOString(),
    isForwarded ? req.forward.host : 'local',
    isForwarded ? req.forward.ip : req.ip,
    isForwarded ? req.forward.method : req.method,
    urlWithoutQuery,
    req.forward.uri || "N/A",
  ];

  console.log(logTemplate, ...logArgs);

  next();
};
