const request = require("supertest");
const { startTestApp } = require("./helpers/testApp");

describe("GET /api/health", () => {
    let app;
    let container;
    let stop;

    beforeAll(async () => {
        ({ app, container, stop } = await startTestApp());
    });

    afterAll(async () => {
        await stop();
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
