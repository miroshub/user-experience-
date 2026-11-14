const request = require("supertest");
const { startTestDb } = require("./helpers/testDb");
const { buildContainer } = require("../container");
const createApp = require("../app");

describe("GET /api/health", () => {
    let mongoServer;
    let container;
    let app;

    beforeAll(async () => {
        mongoServer = await startTestDb();
        container = buildContainer();
        await container.database.connect();
        app = createApp(container);
    });

    afterAll(async () => {
        await container.database.disconnect();
        await mongoServer.stop();
    });

    it("reports the database as connected", async () => {
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ data: { status: "ok", database: "connected" } });
    });

    it("returns 503 when the database is down", async () => {
        await container.database.disconnect();
        const res = await request(app).get("/api/health");
        expect(res.status).toBe(503);
        expect(res.body.data.database).toBe("disconnected");
        await container.database.connect();
    });
});
