const { LONG_LIVED_TOKENS } = require("../utils/constants");

module.exports = (req, res, next) => {
  let query = null;
  try {
    const urlObj = new URL(req.forward.uri, `${req.forward.protocol}://${req.forward.host}`);
    query = urlObj.searchParams;
  } catch {
    query = req.query;
  }

  const token = req.query.tkn
    || query.get("tkn")
    || req.body?.token
    || req.headers?.authorization?.split(" ")[1];

  if (!token) return next();

  const tokenExists = Object.values(LONG_LIVED_TOKENS).includes(token);
  if (tokenExists)
    return res.sendStatus(200);
  else
    return next();
};
