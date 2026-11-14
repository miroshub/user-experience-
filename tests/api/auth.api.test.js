const request = require("supertest");
const { startTestApp } = require("../helpers/testApp");

// A tiny valid PNG (1x1 pixel), so uploads can be tested without files on disk
const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);

describe("accounts API", () => {
    let app;
    let stop;

    beforeAll(async () => {
        ({ app, stop } = await startTestApp());
    });

    afterAll(async () => {
        await stop();
    });

    async function signUp(body) {
        return request(app).post("/api/auth/signup").send(body);
    }

    async function tokenFor(body) {
        const res = await signUp(body);
        return res.body.data.token;
    }

    it("signs up a seeker without returning the password", async () => {
        const res = await signUp({ role: "seeker", fullName: "Salma", email: "salma@example.com", password: "longenough" });
        expect(res.status).toBe(201);
        expect(res.body.data.user).toMatchObject({ role: "seeker", email: "salma@example.com", isVerified: false });
        expect(res.body.data.token).toEqual(expect.any(String));
        expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    });

    it("refuses the same email twice", async () => {
        const res = await signUp({ role: "company", fullName: "Other", email: "SALMA@example.com", password: "longenough" });
        expect(res.status).toBe(409);
    });

    it("logs in by email or phone, with no hint on failure", async () => {
        await signUp({ role: "company", fullName: "Acme HR", phone: "+201001234567", password: "longenough" });

        const byEmail = await request(app).post("/api/auth/login").send({ login: "salma@example.com", password: "longenough" });
        const byPhone = await request(app).post("/api/auth/login").send({ login: "+201001234567", password: "longenough" });
        const wrong = await request(app).post("/api/auth/login").send({ login: "salma@example.com", password: "wrongwrong" });
        const ghost = await request(app).post("/api/auth/login").send({ login: "ghost@example.com", password: "longenough" });

        expect(byEmail.status).toBe(200);
        expect(byPhone.body.data.user.role).toBe("company");
        expect(wrong.status).toBe(401);
        expect(ghost.body).toEqual(wrong.body);
    });

    it("protects /me", async () => {
        expect((await request(app).get("/api/users/me")).status).toBe(401);
        expect((await request(app).get("/api/users/me").set("Authorization", "Bearer fake.token.here")).status).toBe(401);
    });

    it("reads and updates the logged-in profile", async () => {
        const token = await tokenFor({ role: "seeker", fullName: "Omar", email: "omar@example.com", password: "longenough" });
        const auth = { Authorization: `Bearer ${token}` };

        const me = await request(app).get("/api/users/me").set(auth);
        expect(me.body.data.fullName).toBe("Omar");

        const patched = await request(app).patch("/api/users/me").set(auth).send({ city: "Cairo", skills: ["React", "Node"] });
        expect(patched.status).toBe(200);
        expect(patched.body.data).toMatchObject({ city: "Cairo", skills: ["React", "Node"] });

        const bad = await request(app).patch("/api/users/me").set(auth).send({ role: "admin" });
        expect(bad.status).toBe(400);
    });

    it("verifies once with an ID upload, and keeps the file private", async () => {
        const token = await tokenFor({ role: "seeker", fullName: "Nour", email: "nour@example.com", password: "longenough" });
        const otherToken = await tokenFor({ role: "seeker", fullName: "Spy", email: "spy@example.com", password: "longenough" });

        const first = await request(app).post("/api/users/me/verify").set("Authorization", `Bearer ${token}`)
            .attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
        expect(first.status).toBe(200);
        expect(first.body.data.isVerified).toBe(true);

        const again = await request(app).post("/api/users/me/verify").set("Authorization", `Bearer ${token}`)
            .attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
        expect(again.status).toBe(409);

        const wrongType = await request(app).post("/api/users/me/verify").set("Authorization", `Bearer ${otherToken}`)
            .attach("idDocument", Buffer.from("hello"), { filename: "id.txt", contentType: "text/plain" });
        expect(wrongType.status).toBe(400);
    });

    it("serves a company logo to others, but never someone's private file", async () => {
        const companyToken = await tokenFor({ role: "company", fullName: "Nile HR", email: "hr@nile.co", password: "longenough" });
        const seekerToken = await tokenFor({ role: "seeker", fullName: "Hana", email: "hana@example.com", password: "longenough" });

        const logo = await request(app).post("/api/users/me/logo").set("Authorization", `Bearer ${companyToken}`)
            .attach("logo", PNG, { filename: "logo.png", contentType: "image/png" });
        expect(logo.status).toBe(200);

        const seen = await request(app).get(`/api/files/${logo.body.data.logoId}`).set("Authorization", `Bearer ${seekerToken}`);
        expect(seen.status).toBe(200);
        expect(seen.headers["content-type"]).toMatch(/image\/png/);

        const seekerLogo = await request(app).post("/api/users/me/logo").set("Authorization", `Bearer ${seekerToken}`)
            .attach("logo", PNG, { filename: "logo.png", contentType: "image/png" });
        expect(seekerLogo.status).toBe(403);

        // the seeker uploads an ID; the company must not be able to read it
        await request(app).post("/api/users/me/verify").set("Authorization", `Bearer ${seekerToken}`)
            .attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
        const { UserModel } = require("../../models/UserModel");
        const stored = await UserModel.findOne({ email: "hana@example.com" });
        const peek = await request(app).get(`/api/files/${stored.idDocumentId}`).set("Authorization", `Bearer ${companyToken}`);
        expect(peek.status).toBe(404);
        const own = await request(app).get(`/api/files/${stored.idDocumentId}`).set("Authorization", `Bearer ${seekerToken}`);
        expect(own.status).toBe(200);
    });

    it("blocks a suspended account at once, even with a valid token", async () => {
        const token = await tokenFor({ role: "seeker", fullName: "Bad", email: "bad@example.com", password: "longenough" });
        const { UserModel } = require("../../models/UserModel");
        await UserModel.updateOne({ email: "bad@example.com" }, { accountState: "suspended" });

        const me = await request(app).get("/api/users/me").set("Authorization", `Bearer ${token}`);
        expect(me.status).toBe(403);
        const login = await request(app).post("/api/auth/login").send({ login: "bad@example.com", password: "longenough" });
        expect(login.status).toBe(403);
    });
});
