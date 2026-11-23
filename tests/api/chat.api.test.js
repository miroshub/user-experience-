const request = require("supertest");
const { startTestApp } = require("../helpers/testApp");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// Phase 3: chat (FR-22), Activity diagram 2 "book an interview" (FR-23, FR-24),
// video call (FR-25), quick test (FR-26), status bar (FR-27), nudge (FR-28), close (FR-29)
describe("matches, chat and interviews API", () => {
    let app;
    let container;
    let stop;
    const tokens = {};
    const ids = {};
    let matchId;

    const as = name => ({ Authorization: `Bearer ${tokens[name]}` });

    async function signUp(name, body) {
        const res = await request(app).post("/api/auth/signup").send({ password: "longenough", ...body });
        tokens[name] = res.body.data.token;
        ids[name] = res.body.data.user.id;
    }

    async function messages() {
        const res = await request(app).get(`/api/matches/${matchId}/messages`).set(as("salma"));
        return res.body.data;
    }

    async function freeSlots(name = "nile") {
        const res = await request(app).get(`/api/matches/${matchId}/slots`).set(as(name));
        return res.body.data;
    }

    beforeAll(async () => {
        ({ app, container, stop } = await startTestApp());
        await signUp("nile", { role: "company", fullName: "Nile HR", email: "hr@nile.co", companyName: "Nile Tech" });
        await signUp("delta", { role: "company", fullName: "Delta HR", email: "hr@delta.co", companyName: "Delta" });
        await signUp("salma", { role: "seeker", fullName: "Salma Ali", email: "salma@x.co" });
        await signUp("omar", { role: "seeker", fullName: "Omar Hassan", email: "omar@x.co" });
        for (const name of ["salma", "nile"]) {
            await request(app).post("/api/users/me/verify").set(as(name)).attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
        }

        const job = await request(app).post("/api/jobs").set(as("nile")).send({
            title: "Junior Frontend Developer", salaryMin: 14000, salaryMax: 18000,
            workMode: "hybrid", city: "Maadi", skills: ["React"]
        });
        await request(app).post("/api/swipes").set(as("nile")).send({ jobId: job.body.data.id, seekerId: ids.salma, interested: true });
        const swipe = await request(app).post("/api/swipes").set(as("salma")).send({ jobId: job.body.data.id, interested: true });
        matchId = swipe.body.data.match.id;
    });

    afterAll(async () => {
        await stop();
    });

    it("lists the match for both sides, with the other person and the job", async () => {
        const seekerView = await request(app).get("/api/matches").set(as("salma"));
        expect(seekerView.body.data[0]).toMatchObject({ id: matchId, status: "matched", with: { name: "Nile Tech", role: "company" } });
        const one = await request(app).get(`/api/matches/${matchId}`).set(as("nile"));
        expect(one.body.data).toMatchObject({ mySide: "company", with: { name: "Salma Ali" }, job: { title: "Junior Frontend Developer" } });
        expect(one.body.data.callLink).toMatch(/^https:\/\/meet\.jit\.si\/wuzzufny-/);
    });

    it("NFR-03: people outside the match cannot read or write it", async () => {
        for (const name of ["omar", "delta"]) {
            expect((await request(app).get(`/api/matches/${matchId}`).set(as(name))).status).toBe(404);
            expect((await request(app).get(`/api/matches/${matchId}/messages`).set(as(name))).status).toBe(404);
            expect((await request(app).post(`/api/matches/${matchId}/messages`).set(as(name)).send({ text: "hi" })).status).toBe(404);
        }
        expect((await request(app).get(`/api/matches/${matchId}/messages`)).status).toBe(401);
        expect((await request(app).get("/api/matches/not-an-id").set(as("salma"))).status).toBe(404);
    });

    it("FR-22: a message is saved and the first one moves the status to Chatting", async () => {
        const empty = await request(app).post(`/api/matches/${matchId}/messages`).set(as("salma")).send({ text: "  " });
        expect(empty.status).toBe(400);

        const sent = await request(app).post(`/api/matches/${matchId}/messages`).set(as("salma")).send({ text: "Hi Nile! " });
        expect(sent.status).toBe(201);
        expect(sent.body.data).toMatchObject({ sender: ids.salma, text: "Hi Nile!", kind: "text" });
        await request(app).post(`/api/matches/${matchId}/messages`).set(as("nile")).send({ text: "Hi Salma!" });

        expect((await messages()).map(m => m.text)).toEqual(["Hi Nile!", "Hi Salma!"]);
        const match = await request(app).get(`/api/matches/${matchId}`).set(as("salma"));
        expect(match.body.data).toMatchObject({ status: "chatting", lastActor: "company", isWaiting: false });
    });

    it("FR-25: a video call posts a card and answers with the match's Jitsi room", async () => {
        const call = await request(app).post(`/api/matches/${matchId}/call`).set(as("salma"));
        expect(call.body.data.link).toMatch(/^https:\/\/meet\.jit\.si\/wuzzufny-/);
        expect((await messages()).at(-1)).toMatchObject({ sender: "system", kind: "call", text: "Salma Ali started a video call" });
    });

    it("FR-23: only the company books, on a free slot; the status bar moves to Interview", async () => {
        const slots = await freeSlots();
        expect(slots).toHaveLength(16);

        const bySeeker = await request(app).post(`/api/matches/${matchId}/interviews`).set(as("salma")).send({ type: "video", dateTime: slots[0] });
        expect(bySeeker.status).toBe(403);
        const offSlot = await request(app).post(`/api/matches/${matchId}/interviews`).set(as("nile"))
            .send({ type: "video", dateTime: new Date(Date.now() + 3 * DAY + 7 * MINUTE).toISOString() });
        expect(offSlot.status).toBe(409);

        const booked = await request(app).post(`/api/matches/${matchId}/interviews`).set(as("nile"))
            .send({ type: "video", dateTime: slots[1], note: "We'll talk about your project" });
        expect(booked.status).toBe(201);
        expect(booked.body.data).toMatchObject({ status: "invited", type: "video", dateTime: slots[1] });
        expect(booked.body.data.link).toMatch(/meet\.jit\.si/);

        expect((await messages()).at(-1)).toMatchObject({ kind: "interview", text: "Interview booked", interviewId: booked.body.data.id });
        const match = await request(app).get(`/api/matches/${matchId}`).set(as("salma"));
        expect(match.body.data.status).toBe("interview");
        expect(match.body.data.interviews).toHaveLength(1);
        // the slot is now taken
        expect(await freeSlots()).not.toContain(slots[1]);
    });

    it("FR-24 / Activity 2: another time → the company takes it → confirmed", async () => {
        const match = await request(app).get(`/api/matches/${matchId}`).set(as("salma"));
        const interviewId = match.body.data.interviews[0].id;
        const slots = await freeSlots("salma");

        expect((await request(app).post(`/api/interviews/${interviewId}/accept`).set(as("nile"))).status).toBe(403);
        const asked = await request(app).post(`/api/interviews/${interviewId}/new-time`).set(as("salma")).send({ dateTime: slots[2] });
        expect(asked.body.data).toMatchObject({ status: "new time asked", requestedTime: slots[2] });

        const taken = await request(app).post(`/api/interviews/${interviewId}/reschedule`).set(as("nile")).send({ dateTime: slots[2] });
        expect(taken.body.data).toMatchObject({ status: "confirmed", dateTime: slots[2], requestedTime: null });
        expect((await messages()).at(-1).text).toBe("Nile Tech took the new time");
        expect((await request(app).post(`/api/interviews/${interviewId}/accept`).set(as("salma"))).status).toBe(409);
    });

    it("FR-23: the reminder job sends one card 1 hour before, only once", async () => {
        const match = await request(app).get(`/api/matches/${matchId}`).set(as("salma"));
        const start = new Date(match.body.data.interviews[0].dateTime);

        expect(await container.interviewService.sendReminders(new Date(start.getTime() - 2 * 60 * MINUTE))).toBe(0);
        expect(await container.interviewService.sendReminders(new Date(start.getTime() - 50 * MINUTE))).toBe(1);
        expect(await container.interviewService.sendReminders(new Date(start.getTime() - 40 * MINUTE))).toBe(0);
        expect((await messages()).at(-1)).toMatchObject({ kind: "reminder", text: "Your interview starts in 1 hour" });
    });

    it("FR-26: the quick test hides questions until started and never shows the answers", async () => {
        const questions = [
            { question: "Which hook stores state?", options: ["useState", "useMemo"], correct: 0 },
            { question: "JSX turns into?", options: ["HTML files", "function calls"], correct: 1 }
        ];
        const bad = await request(app).post(`/api/matches/${matchId}/tests`).set(as("nile")).send({ title: "T", timeLimit: 10, questions: [] });
        expect(bad.status).toBe(400);
        const sent = await request(app).post(`/api/matches/${matchId}/tests`).set(as("nile")).send({ title: "React basics", timeLimit: 10, questions });
        expect(sent.status).toBe(201);
        const testId = sent.body.data.id;

        const before = (await request(app).get(`/api/matches/${matchId}`).set(as("salma"))).body.data.interviews.find(i => i.id === testId);
        expect(before).toMatchObject({ status: "sent", questionCount: 2, timeLimit: 10 });
        expect(before.questions).toBeUndefined();

        const started = await request(app).post(`/api/interviews/${testId}/start`).set(as("salma"));
        expect(started.body.data.questions).toEqual(questions.map(({ question, options }) => ({ question, options })));
        expect(started.body.data.secondsLeft).toBeGreaterThan(590);

        const done = await request(app).post(`/api/interviews/${testId}/submit`).set(as("salma")).send({ answers: [0, 0] });
        expect(done.body.data).toMatchObject({ status: "done", score: 1, result: "1/2" });
        expect((await messages()).map(m => m.text)).toContain("Salma Ali finished the test: 1/2");

        const companyView = (await request(app).get(`/api/matches/${matchId}`).set(as("nile"))).body.data.interviews.find(i => i.id === testId);
        expect(companyView.answers).toEqual([0, 0]);
    });

    it("FR-27: only the company moves the bar to Offer and Hired, forwards only", async () => {
        expect((await request(app).post(`/api/matches/${matchId}/status`).set(as("salma")).send({ status: "offer" })).status).toBe(403);
        expect((await request(app).post(`/api/matches/${matchId}/status`).set(as("nile")).send({ status: "chatting" })).status).toBe(400);
        const offer = await request(app).post(`/api/matches/${matchId}/status`).set(as("nile")).send({ status: "offer" });
        expect(offer.body.data.status).toBe("offer");
        expect((await messages()).map(m => m.text)).toContain("Nile Tech made an offer");
    });

    it("FR-28: the daily job nudges once when the company is quiet for 5 days", async () => {
        await request(app).post(`/api/matches/${matchId}/messages`).set(as("salma")).send({ text: "Any news?" });
        const sixDaysLater = new Date(Date.now() + 6 * DAY);

        expect(await container.matchService.sendNudges(new Date(Date.now() + 2 * DAY))).toBe(0);
        expect(await container.matchService.sendNudges(sixDaysLater)).toBe(1);
        expect(await container.matchService.sendNudges(new Date(Date.now() + 7 * DAY))).toBe(0);
        expect((await messages()).at(-1)).toMatchObject({
            kind: "nudge",
            text: "No reply for 6 days. Nile Tech, please answer or close this match with a reason."
        });
    });

    it("FR-29: closing needs a reason, the other side sees it, and the chat stops", async () => {
        expect((await request(app).post(`/api/matches/${matchId}/close`).set(as("nile")).send({ reason: " " })).status).toBe(400);
        const closed = await request(app).post(`/api/matches/${matchId}/close`).set(as("nile")).send({ reason: "Position filled" });
        expect(closed.body.data).toMatchObject({ status: "closed", closeReason: "Position filled", closedBy: "company" });

        expect((await messages()).map(m => m.text)).toContain("Nile Tech closed this match. Reason: Position filled");
        expect((await request(app).post(`/api/matches/${matchId}/messages`).set(as("salma")).send({ text: "Why?" })).status).toBe(409);
        expect((await request(app).post(`/api/matches/${matchId}/close`).set(as("salma")).send({ reason: "x" })).status).toBe(409);
    });
});
