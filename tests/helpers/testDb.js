const { MongoMemoryServer } = require("mongodb-memory-server");

// Every test file gets its own throwaway MongoDB in memory, never the real Atlas data
async function startTestDb() {
    const server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri("wuzzufny-test");
    return server;
}

module.exports = { startTestDb };
