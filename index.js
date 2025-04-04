require("dotenv").config();
const app = require("./src/app/app");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const stop = async () => {
    console.log("Stopping server...");
    await new Promise((resolve) => {
        server.close(() => {
            resolve();
        });
    });
};

process.on("SIGTERM", stop);

module.exports = {
    app,
    server,
    stop,
};