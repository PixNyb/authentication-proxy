const path = require("path");
const fs = require("fs");

let strategies = [];
let templateStrategies = [];
let localEndpoints = [];
let rolePermissionsMap = {}; // Map of roles to their permissions

const { RBAC_ENABLED, ROLES_CONFIG } = require("../utils/constants");

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

    // If RBAC is enabled, initialize the role-permissions map
    if (RBAC_ENABLED && ROLES_CONFIG) {
        rolePermissionsMap = ROLES_CONFIG;
    }

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

                // Add role mapping if provided in environment variables
                const roleMapping = process.env[`${strategy}_${id}_ROLES`];
                if (RBAC_ENABLED && roleMapping) {
                    try {
                        strategies[normalizedStrategyId].roleMapping = JSON.parse(
                            roleMapping
                        );
                    } catch (e) {
                        console.error(
                            `Error parsing role mapping for ${strategy}_${id}: ${e.message}`
                        );
                    }
                }
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

/**
 * Get the role permissions map.
 * @returns {Object} - The role permissions map.
 */
const getRolePermissionsMap = () => rolePermissionsMap;

/**
 * Map a user's identity to a role based on strategy configuration.
 * @param {string} strategy - The strategy identifier.
 * @param {Object} profile - The user profile from authentication.
 * @returns {string} - The assigned role.
 */
const mapUserToRole = (strategy, profile) => {
    if (!RBAC_ENABLED) return null;

    const strategyConfig = strategies[strategy];
    if (!strategyConfig || !strategyConfig.roleMapping) {
        return process.env.DEFAULT_ROLE || "user";
    }

    // Check if there's a specific role mapping for this user
    for (const [roleKey, mapping] of Object.entries(strategyConfig.roleMapping)) {
        if (mapping.type === "email" && mapping.pattern && profile.email) {
            // Email pattern matching
            const regex = new RegExp(mapping.pattern);
            if (regex.test(profile.email)) {
                return roleKey;
            }
        } else if (
            mapping.type === "attribute" &&
            mapping.attribute &&
            mapping.value
        ) {
            // Attribute exact matching
            if (profile[mapping.attribute] === mapping.value) {
                return roleKey;
            }
        }
    }

    // Use default role if no mapping matched
    return process.env.DEFAULT_ROLE || "user";
};

module.exports = {
    initializeStrategies,
    getStrategies,
    getTemplateStrategies,
    getLocalEndpoints,
    getRolePermissionsMap,
    mapUserToRole,
};