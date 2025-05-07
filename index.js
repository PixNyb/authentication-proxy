require("dotenv").config();
const app = require("./src/app/app");
const { app: metricsApp } = require("./src/app/metrics");

const PORT = process.env.PORT || 3000;
const METRICS_PORT = process.env.METRICS_PORT || 9100;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const metricsServer = metricsApp.listen(METRICS_PORT, () => {
    console.log(`Metrics server is running on port ${METRICS_PORT}`);
});

const stop = async () => {
    console.log("Stopping server...");
    await new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });

    await new Promise((resolve) => {
        metricsServer.close(() => {
            resolve();
        });
    });
};

process.on("SIGTERM", stop);

module.exports = {
    app,
    server,
    metricsApp,
    metricsServer,
    stop,
};