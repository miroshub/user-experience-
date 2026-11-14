const express = require("express");
const request = require("supertest");
const AppError = require("../errors/AppError");
const errorHandler = require("../middleware/errorHandler");

// A tiny app with routes that throw, so only the error handler is tested
function buildTestApp() {
    const app = express();
    app.use(express.json());
    app.get("/app-error", async () => {
        throw new AppError("Job not found", 404);
    });
    app.get("/crash", () => {
        throw new Error("secret internal detail");
    });
    app.post("/echo", (req, res) => res.json(req.body));
    app.use(errorHandler);
    return app;
}

describe("errorHandler", () => {
    const app = buildTestApp();

    it("turns an AppError into its status and message", async () => {
        const res = await request(app).get("/app-error");
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ message: "Job not found" });
    });

    it("hides unknown errors behind a 500", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const res = await request(app).get("/crash");
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ message: "Something went wrong" });
    });

    it("answers 400 for broken JSON", async () => {
        const res = await request(app)
            .post("/echo")
            .set("Content-Type", "application/json")
            .send("{ not json");
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ message: "Invalid JSON" });
    });
});
