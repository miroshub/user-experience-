const { buildContainer } = require("./container");
const createApp = require("./app");

// Node 20.12+ reads .env by itself, so no dotenv package is needed
try {
    process.loadEnvFile();
} catch {
    console.error("No .env file found. Copy .env.example to .env and fill it in.");
    process.exit(1);
}

const port = process.env.PORT || 3001;

async function start() {
    const container = buildContainer();
    await container.database.connect();

    const app = createApp(container);
    // Express and Socket.io share one port: app.listen returns the HTTP server the socket attaches to
    const httpServer = app.listen(port, () => console.log(`server is live on http://localhost:${port}`));
    container.socketServer.start(httpServer);
    container.scheduler.start();
}

start().catch(err => {
    // only the message: a full error object could include connection details
    console.error("Server could not start:", err.message);
    process.exit(1);
});
