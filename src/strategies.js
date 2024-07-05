const path = require("path");
const fs = require("fs");

const strategies = [];
const availableStrategies = fs.readdirSync(path.resolve(__dirname, "providers")).map((file) => file.replace(".js", "").toUpperCase());

const normalizeStrategyName = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "-");

Object.keys(process.env).forEach((key) => {
  const [strategy, id] = key.split("_");

  if (availableStrategies.includes(strategy) && id) {
    const normalizedStrategyId = normalizeStrategyName(id);
    if (!strategies[normalizedStrategyId]) {
      const providerPath = path.resolve(
        __dirname,
        "providers",
        `${strategy.toLowerCase()}.js`,
      );
      const strategyModule = require(providerPath);
      strategies[normalizedStrategyId] = strategyModule(
        normalizedStrategyId,
        id,
      );
    }
  }
});

module.exports = strategies;
