const request = require("supertest");
const { startTestApp } = require("../helpers/testApp");
const { UserModel } = require("../../models/UserModel");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);
const DAY_MS = 24 * 60 * 60 * 1000;

// Follows Activity diagram 1 "swipe to match", end to end
describe("jobs, swipes and matches API", () => {
    let app;
    let stop;
    const tokens = {};
    const ids = {};

    const as = name => ({ Authorization: `Bearer ${tokens[name]}` });

    async function signUp(name, body) {
        const res = await request(app).post("/api/auth/signup").send({ password: "longenough", ...body });
        tokens[name] = res.body.data.token;
        ids[name] = res.body.data.user.id;
    }

    // make accounts look older than a day, so only the rules a test wants are hit
    async function age(name) {
        await UserModel.collection.updateOne({ _id: UserModel.castObject({ _id: ids[name] })._id }, { $set: { createdAt: new Date(Date.now() - 3 * DAY_MS) } });
    }

    async function verify(name) {
        await request(app).post("/api/users/me/verify").set(as(name)).attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
    }

    beforeAll(async () => {
        ({ app, stop } = await startTestApp());
        await signUp("nile", { role: "company", fullName: "Nile HR", email: "hr@nile.co", companyName: "Nile Tech" });
        await signUp("delta", { role: "company", fullName: "Delta HR", email: "hr@delta.co" });
        await signUp("salma", { role: "seeker", fullName: "Salma", email: "salma@x.co" });
        await signUp("spammy", { role: "seeker", fullName: "Spammy", email: "spam@x.co" });
        await request(app).patch("/api/users/me").set(as("salma")).send({ headline: "Junior dev", skills: ["React", "CSS"] });
        await age("salma");
        await age("nile");
    });

    afterAll(async () => {
        await stop();
    });

    it("lets only companies post jobs, and checks them", async () => {
        const seekerTry = await request(app).post("/api/jobs").set(as("salma")).send({ title: "x" });
        expect(seekerTry.status).toBe(403);

        const bad = await request(app).post("/api/jobs").set(as("nile")).send({ title: "Dev", salaryMin: 5, salaryMax: 1, workMode: "remote", skills: ["React"] });
        expect(bad.status).toBe(400);

        const res = await request(app).post("/api/jobs").set(as("nile")).send({
            title: "Junior Frontend Developer", salaryMin: 14000, salaryMax: 18000,
            workMode: "hybrid", city: "Maadi", skills: ["React", "JavaScript"]
        });
        expect(res.status).toBe(201);
        ids.frontend = res.body.data.id;

        const second = await request(app).post("/api/jobs").set(as("nile")).send({
            title: "Data Analyst", salaryMin: 10000, salaryMax: 12000, workMode: "remote", skills: ["SQL"]
        });
        ids.analyst = second.body.data.id;
    });

    it("shows job cards with % fit, best fit first, and filters them", async () => {
        const feed = await request(app).get("/api/feed/jobs").set(as("salma"));
        expect(feed.status).toBe(200);
        expect(feed.body.data.map(j => j.title)).toEqual(["Junior Frontend Developer", "Data Analyst"]);
        expect(feed.body.data[0]).toMatchObject({ fit: 50, whyItFits: ["React"], missingSkills: ["JavaScript"] });
        expect(feed.body.data[0].company.name).toBe("Nile Tech");

        const remote = await request(app).get("/api/feed/jobs?workMode=remote").set(as("salma"));
        expect(remote.body.data.map(j => j.title)).toEqual(["Data Analyst"]);
        const rich = await request(app).get("/api/feed/jobs?minSalary=15000").set(as("salma"));
        expect(rich.body.data.map(j => j.title)).toEqual(["Junior Frontend Developer"]);
        const regexTrick = await request(app).get("/api/feed/jobs?role=.*").set(as("salma"));
        expect(regexTrick.body.data).toEqual([]);
        expect((await request(app).get("/api/feed/jobs?workMode=space").set(as("salma"))).status).toBe(400);
    });

    it("asks for ID on the first Interested (FR-03)", async () => {
        const res = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: ids.frontend, interested: true });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe("VERIFY_REQUIRED");

        const skip = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: ids.analyst, interested: false });
        expect(skip.status).toBe(201);
    });

    it("undo brings back the last card (FR-14)", async () => {
        const undo = await request(app).post("/api/swipes/undo").set(as("salma"));
        expect(undo.body.data.title).toBe("Data Analyst");
        expect((await request(app).post("/api/swipes/undo").set(as("salma"))).status).toBe(404);
    });

    it("matches when both say yes (FR-17), once", async () => {
        await verify("salma");
        await verify("nile");

        const seekerYes = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: ids.frontend, interested: true });
        expect(seekerYes.status).toBe(201);
        expect(seekerYes.body.data.match).toBeNull();

        const again = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: ids.frontend, interested: true });
        expect(again.status).toBe(409);

        const cards = await request(app).get(`/api/feed/candidates?jobId=${ids.frontend}`).set(as("nile"));
        expect(cards.body.data.candidates.map(c => c.fullName)).toContain("Salma");

        const companyYes = await request(app).post("/api/swipes").set(as("nile")).send({ jobId: ids.frontend, seekerId: ids.salma, interested: true });
        expect(companyYes.body.data.match).toMatchObject({ status: "matched", job: { title: "Junior Frontend Developer" } });

        const salmaMatches = await request(app).get("/api/matches").set(as("salma"));
        const nileMatches = await request(app).get("/api/matches").set(as("nile"));
        expect(salmaMatches.body.data[0].with.name).toBe("Nile Tech");
        expect(nileMatches.body.data[0].with.name).toBe("Salma");
        expect((await request(app).get("/api/matches").set(as("delta"))).body.data).toEqual([]);

        const undo = await request(app).post("/api/swipes/undo").set(as("salma"));
        expect(undo.status).toBe(409);
    });

    it("puts likely spam in Check later (FR-18)", async () => {
        // a brand-new account with an empty profile = 2 rules hit
        await verify("spammy");
        await request(app).post("/api/swipes").set(as("spammy")).send({ jobId: ids.frontend, interested: true });

        const cards = await request(app).get(`/api/feed/candidates?jobId=${ids.frontend}`).set(as("nile"));
        expect(cards.body.data.candidates.map(c => c.fullName)).not.toContain("Spammy");
        expect(cards.body.data.checkLater[0]).toMatchObject({
            fullName: "Spammy",
            spamReasons: ["Account less than 1 day old", "Empty profile"]
        });
    });

    it("only the owner edits, pauses and closes a job (FR-31, FR-32)", async () => {
        expect((await request(app).patch(`/api/jobs/${ids.analyst}`).set(as("delta")).send({ title: "Mine now" })).status).toBe(404);

        const edited = await request(app).patch(`/api/jobs/${ids.analyst}`).set(as("nile")).send({ salaryMax: 13000 });
        expect(edited.body.data.salaryMax).toBe(13000);

        await request(app).post(`/api/jobs/${ids.analyst}/pause`).set(as("nile"));
        const feed = await request(app).get("/api/feed/jobs").set(as("salma"));
        expect(feed.body.data.map(j => j.title)).not.toContain("Data Analyst");
        expect((await request(app).get(`/api/jobs/${ids.analyst}`).set(as("salma"))).status).toBe(404);

        const resumed = await request(app).post(`/api/jobs/${ids.analyst}/resume`).set(as("nile"));
        expect(resumed.body.data.status).toBe("live");
        const closed = await request(app).post(`/api/jobs/${ids.analyst}/close`).set(as("nile"));
        expect(closed.body.data.status).toBe("closed");

        const mine = await request(app).get("/api/jobs/mine").set(as("nile"));
        expect(mine.body.data).toHaveLength(2);

        const image = await request(app).post(`/api/jobs/${ids.frontend}/image`).set(as("nile"))
            .attach("image", PNG, { filename: "office.png", contentType: "image/png" });
        expect(image.body.data.imageUrl).toMatch(/^\/api\/files\//);
    });
});
