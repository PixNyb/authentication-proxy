const { LONG_LIVED_TOKENS } = require("../config/constants");

module.exports = (req, res, next) => {
  const forwardedQuery = req.forwardedUri?.split("?")[1];
  const query = req.url.split("?")[1] || forwardedQuery;
  const queryObj = new URLSearchParams(query);

  const token =
    req.query.tkn ||
    queryObj.get("tkn") ||
    req.body.token ||
    req.headers.authorization?.split(" ")[1];
  if (!token) return next();

  const tokenExists = Object.values(LONG_LIVED_TOKENS).includes(token);
  if (tokenExists) return res.sendStatus(200);
  else return next();
};
