const { startTestDb } = require("./testDb");
const { buildContainer } = require("../../container");
const createApp = require("../../app");

// A full app on a throwaway in-memory MongoDB. Fast bcrypt and a fake secret, test-only.
async function startTestApp() {
    process.env.JWT_SECRET = "test-secret-not-for-real-use";
    process.env.BCRYPT_ROUNDS = "4";
    const mongoServer = await startTestDb();
    const container = buildContainer();
    await container.database.connect();
    const app = createApp(container);

    async function stop() {
        await container.database.disconnect();
        await mongoServer.stop();
    }
    return { app, container, stop };
}

module.exports = { startTestApp };
