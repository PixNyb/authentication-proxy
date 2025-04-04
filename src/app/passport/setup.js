const passport = require("passport");
const {
    initializeStrategies,
    getStrategies,
} = require("./strategies");

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

initializeStrategies();
const strategies = getStrategies();

strategies.forEach((strategyConfig) => {
    if (strategyConfig.strategy) {
        passport.use(
            strategyConfig.name,
            new strategyConfig.strategy(strategyConfig.params, strategyConfig.verify)
        );
    }
});

module.exports = passport;
