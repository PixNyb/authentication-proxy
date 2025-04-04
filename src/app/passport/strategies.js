const path = require("path");
const fs = require("fs");

let strategies = [];
let templateStrategies = [];
let localEndpoints = [];

/**
 * Initialize the strategies by loading provider files and setting up strategies.
 * It reads all provider files from the providers directory, normalizes their names,
 * and initializes them based on environment variables.
 */
const initializeStrategies = () => {
    const availableStrategies = fs
        .readdirSync(path.resolve(__dirname, "../providers"))
        .map((file) => file.replace(".provider.js", "").toUpperCase());

    const normalizeStrategyName = (name) =>
        name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    Object.keys(process.env).forEach((key) => {
        const [strategy, id] = key.split("_");

        if (availableStrategies.includes(strategy) && id) {
            const normalizedStrategyId = normalizeStrategyName(id);
            if (!strategies[normalizedStrategyId]) {
                const providerPath = path.resolve(
                    __dirname,
                    "../providers",
                    `${strategy.toLowerCase()}.provider.js`
                );
                const strategyModule = require(providerPath);
                strategies[normalizedStrategyId] = strategyModule(
                    normalizedStrategyId,
                    id
                );
            }
        }
    });

    // Generate template strategies and local endpoints
    templateStrategies = Object.entries(strategies)
        .filter(([, strategyConfig]) => strategyConfig.type !== "local")
        .map(([, strategyConfig]) => {
            const { loginURL, displayName, fontAwesomeIcon } =
                strategyConfig.params;
            return { displayName, loginURL, fontAwesomeIcon };
        });

    localEndpoints = Object.entries(strategies)
        .filter(([, strategyConfig]) => strategyConfig.type === "local")
        .map(([, strategyConfig]) => {
            const { displayName, loginURL } = strategyConfig.params;
            return { displayName, loginURL };
        });
};

/**
 * Get the strategies array.
 * @returns {Array} - The strategies array.
 */
const getStrategies = () => strategies;

/**
 * Get the template strategies.
 * @returns {Array} - The template strategies.
 */
const getTemplateStrategies = () => templateStrategies;

/**
 * Get the local endpoints.
 * @returns {Array} - The local endpoints.
 */
const getLocalEndpoints = () => localEndpoints;

module.exports = {
    initializeStrategies,
    getStrategies,
    getTemplateStrategies,
    getLocalEndpoints,
};