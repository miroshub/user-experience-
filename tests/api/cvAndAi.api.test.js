const request = require("supertest");
const { startTestApp } = require("../helpers/testApp");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF");
const LONG = "I love building web apps that people use every day and learning new things. ".repeat(6).trim();

// Phase 4: H6 My CV (FR-08 to FR-10) and H7 Ask wuzzufny (FR-19 to FR-21), with AI_MODEL=mock
describe("CV and AI helper API", () => {
    let app;
    let stop;
    const tokens = {};
    const jobIds = {};

    const as = name => ({ Authorization: `Bearer ${tokens[name]}` });

    async function signUp(name, body) {
        const res = await request(app).post("/api/auth/signup").send({ password: "longenough", ...body });
        tokens[name] = res.body.data.token;
    }

    async function postJob(key, fields) {
        const res = await request(app).post("/api/jobs").set(as("nile")).send({ salaryMin: 10000, salaryMax: 15000, ...fields });
        jobIds[key] = res.body.data.id;
    }

    beforeAll(async () => {
        process.env.AI_MODEL = "mock";
        ({ app, stop } = await startTestApp());
        await signUp("nile", { role: "company", fullName: "Nile HR", email: "hr@nile.co", companyName: "Nile Tech" });
        await signUp("salma", { role: "seeker", fullName: "Salma Adel", email: "salma@x.co" });
        await signUp("omar", { role: "seeker", fullName: "Omar Hassan", email: "omar@x.co" });
        await request(app).patch("/api/users/me").set(as("salma")).send({ headline: "Frontend developer", city: "Cairo", skills: ["JavaScript", "CSS"] });
        await request(app).post("/api/users/me/verify").set(as("salma")).attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });

        await postJob("frontend", { title: "Junior Frontend Developer", workMode: "hybrid", city: "Maadi", skills: ["React", "JavaScript", "TypeScript"], salaryMin: 14000, salaryMax: 18000 });
        await postJob("react", { title: "React Developer", workMode: "remote", skills: ["React", "TypeScript"], salaryMin: 15000, salaryMax: 20000 });
        await postJob("senior", { title: "Senior React Developer", workMode: "remote", skills: ["React"], salaryMin: 30000, salaryMax: 40000 });
        await postJob("data", { title: "Data Analyst", workMode: "onsite", city: "Alexandria", skills: ["SQL"] });
        await postJob("cheap", { title: "Frontend Intern", workMode: "remote", skills: ["HTML"], salaryMin: 5000, salaryMax: 8000 });
    });

    afterAll(async () => {
        await stop();
    });

    describe("H6 My CV", () => {
        it("only seekers have a CV (NFR-03)", async () => {
            expect((await request(app).get("/api/cv")).status).toBe(401);
            expect((await request(app).get("/api/cv").set(as("nile"))).status).toBe(403);
        });

        it("a new seeker gets an empty CV checked against the open jobs", async () => {
            const res = await request(app).get("/api/cv").set(as("omar"));
            expect(res.status).toBe(200);
            expect(res.body.data.cv).toMatchObject({ id: null, fullName: "Omar Hassan", summary: "", experience: [] });
            expect(res.body.data.ats.checkedAgainst).toEqual({ count: 5, jobWord: "open jobs" });
            expect(res.body.data.ats.tips.map(t => t.key)).toContain("section:education");
        });

        it("saves the form sections and scores against the saved jobs (FR-08, FR-09)", async () => {
            await request(app).post("/api/swipes").set(as("salma")).send({ jobId: jobIds.frontend, interested: true });
            await request(app).post("/api/swipes").set(as("salma")).send({ jobId: jobIds.react, interested: true });

            const res = await request(app).patch("/api/cv").set(as("salma")).send({
                summary: LONG,
                experience: [
                    { title: "Frontend Intern", company: "Koshk Labs", startDate: "Jul 2026", endDate: "Sep 2026", bullets: ["Rebuilt the sign-up flow"] },
                    { title: "Freelance web projects", bullets: ["Bus-tracking app"] }
                ],
                education: [{ degree: "BSc Computer Science", school: "Cairo University", startYear: "2022", endYear: "2026" }]
            });

            expect(res.status).toBe(200);
            const { cv, ats } = res.body.data;
            expect(cv.id).toBeTruthy();
            expect(cv.summaryTooLong).toBe(true);
            expect(cv.rolesMissingDates).toEqual([1]);
            expect(ats.checkedAgainst).toEqual({ count: 2, jobWord: "saved jobs" });
            expect(ats.tips[0]).toMatchObject({ action: { type: "addSkill", skill: "React" }, text: "Add React to your skills. 2 of your saved jobs ask for it." });
            expect(ats.potential).toBeGreaterThan(ats.score);
        });

        it("refuses unknown sections and bad data", async () => {
            expect((await request(app).patch("/api/cv").set(as("salma")).send({ hobbies: "chess" })).status).toBe(400);
            expect((await request(app).patch("/api/cv").set(as("salma")).send({})).status).toBe(400);
            expect((await request(app).patch("/api/cv").set(as("salma")).send({ experience: "lots" })).status).toBe(400);
        });

        it("one-click fixes: add a skill, then shorten the About me (FR-09)", async () => {
            const before = (await request(app).get("/api/cv").set(as("salma"))).body.data.ats.score;

            const added = await request(app).post("/api/cv/fixes").set(as("salma")).send({ type: "addSkill", skill: "React" });
            expect(added.status).toBe(200);
            expect(added.body.data.cv.skills).toContain("React");
            expect(added.body.data.ats.score).toBeGreaterThan(before);
            // the skill is on the profile too, so the swipe cards use it
            expect((await request(app).get("/api/users/me").set(as("salma"))).body.data.skills).toContain("React");

            const shortened = await request(app).post("/api/cv/fixes").set(as("salma")).send({ type: "shortenSummary" });
            expect(shortened.body.data.cv.summaryTooLong).toBe(false);
            expect((await request(app).post("/api/cv/fixes").set(as("salma")).send({ type: "shortenSummary" })).status).toBe(409);
        });

        it("refuses unknown fixes", async () => {
            expect((await request(app).post("/api/cv/fixes").set(as("salma")).send({ type: "magic" })).status).toBe(400);
            expect((await request(app).post("/api/cv/fixes").set(as("salma")).send({ type: "addSkill" })).status).toBe(400);
        });

        it("skills can be saved from the form", async () => {
            const res = await request(app).patch("/api/cv").set(as("salma")).send({ skills: ["JavaScript", "CSS", "React", "Git"] });
            expect(res.body.data.cv.skills).toEqual(["JavaScript", "CSS", "React", "Git"]);
        });

        it("exports the CV as a PDF (FR-10)", async () => {
            const res = await request(app).get("/api/cv/export?download=1").set(as("salma")).buffer(true).parse((r, cb) => {
                const chunks = [];
                r.on("data", c => chunks.push(c));
                r.on("end", () => cb(null, Buffer.concat(chunks)));
            });
            expect(res.status).toBe(200);
            expect(res.headers["content-type"]).toContain("application/pdf");
            expect(res.headers["content-disposition"]).toContain('attachment; filename="Salma-Adel-CV.pdf"');
            expect(res.body.subarray(0, 4).toString()).toBe("%PDF");
        });

        it("uploads a PDF CV that only its owner can open (FR-08)", async () => {
            expect((await request(app).post("/api/cv/pdf").set(as("salma")).attach("cv", PNG, { filename: "cv.png", contentType: "image/png" })).status).toBe(400);

            const res = await request(app).post("/api/cv/pdf").set(as("salma")).attach("cv", PDF, { filename: "cv.pdf", contentType: "application/pdf" });
            expect(res.status).toBe(200);
            const url = res.body.data.cv.pdfUrl;
            expect(url).toMatch(/^\/api\/files\//);
            expect((await request(app).get(url).set(as("salma"))).status).toBe(200);
            expect((await request(app).get(url).set(as("omar"))).status).toBe(404);
        });
    });

    describe("H7 Ask wuzzufny", () => {
        it("only seekers can use it", async () => {
            expect((await request(app).get("/api/ai/chat").set(as("nile"))).status).toBe(403);
        });

        it("opens with no turns and every job that is not swiped yet", async () => {
            const res = await request(app).get("/api/ai/chat").set(as("salma"));
            expect(res.status).toBe(200);
            expect(res.body.data.turns).toEqual([]);
            // salma swiped on 2 of the 5 jobs
            expect(res.body.data.results.total).toBe(3);
        });

        it("turns words into filters and finds the jobs (FR-19)", async () => {
            const res = await request(app).post("/api/ai/chat").set(as("omar")).send({ text: "Remote junior React jobs. Cairo is fine too. At least 12k a month." });
            expect(res.status).toBe(200);
            const { filters, turns, results } = res.body.data;
            expect(filters).toEqual({ role: "Frontend", skills: ["React"], level: "Junior", places: ["Remote", "Cairo"], minPay: 12000 });
            expect(turns).toHaveLength(1);
            expect(turns[0].aiReply).toContain("Here are your filters");
            // senior, data and the 8k intern job are left out
            expect(results.jobs.map(j => j.title).sort()).toEqual(["Junior Frontend Developer", "React Developer"]);
            expect(results.jobs[0]).toHaveProperty("fit");
            expect(results.jobs[0].company.name).toBe("Nile Tech");
        });

        it("gives a CV tip for these jobs (FR-21)", async () => {
            const res = await request(app).get("/api/ai/chat").set(as("omar"));
            // both jobs ask for React and TypeScript, and Omar has neither
        const { tip } = res.body.data.results;
        expect(tip.count).toBe(2);
        expect(["React", "TypeScript"]).toContain(tip.skill);
        });

        it("a follow-up changes only what was said (FR-20)", async () => {
            const res = await request(app).post("/api/ai/chat").set(as("omar")).send({ text: "only remote" });
            expect(res.body.data.filters).toMatchObject({ role: "Frontend", level: "Junior", places: ["Remote"], minPay: 12000 });
            expect(res.body.data.turns).toHaveLength(2);
            expect(res.body.data.results.jobs.map(j => j.title)).toEqual(["React Developer"]);
        });

        it("the x on a chip changes the filters without asking the model", async () => {
            const res = await request(app).patch("/api/ai/filters").set(as("omar")).send({
                filters: { role: "Frontend", skills: ["React"], level: null, places: [], minPay: null }
            });
            expect(res.status).toBe(200);
            expect(res.body.data.turns).toHaveLength(2);
            // level, place and pay are gone: the senior and the intern jobs are back, the data job is not
        expect(res.body.data.results.total).toBe(4);
        });

        it("refuses empty questions and bad filters", async () => {
            expect((await request(app).post("/api/ai/chat").set(as("omar")).send({ text: " " })).status).toBe(400);
            expect((await request(app).patch("/api/ai/filters").set(as("omar")).send({ filters: "all" })).status).toBe(400);
        });
    });
});
