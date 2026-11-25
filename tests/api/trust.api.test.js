const request = require("supertest");
const { startTestApp } = require("../helpers/testApp");
const UserFactory = require("../../domain/UserFactory");
const WarningModel = require("../../models/WarningModel");
const ReviewModel = require("../../models/ReviewModel");

const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    "base64"
);
const DAY = 24 * 60 * 60 * 1000;
const PASSWORD = "longenough";

// Phase 5: reviews (FR-38 to FR-43, NFR-08), Trust centre (FR-05 to FR-07), admin (FR-33 to FR-37)
describe("trust, reviews and admin API", () => {
    let app;
    let container;
    let stop;
    const tokens = {};
    const ids = {};
    let jobId;
    let matchId;

    const as = name => ({ Authorization: `Bearer ${tokens[name]}` });

    async function signUp(name, body) {
        const res = await request(app).post("/api/auth/signup").send({ password: PASSWORD, ...body });
        tokens[name] = res.body.data.token;
        ids[name] = res.body.data.user.id;
    }

    async function verify(name) {
        await request(app).post("/api/users/me/verify").set(as(name))
            .attach("idDocument", PNG, { filename: "id.png", contentType: "image/png" });
    }

    async function makeAdmin(name, adminRole) {
        const admin = UserFactory.createUser("admin", { fullName: name, email: `${name}@wuzzufny.test`, adminRole, isVerified: true });
        await container.userRepository.create(admin, await container.passwordHasher.hash(PASSWORD));
        const res = await request(app).post("/api/auth/login").send({ login: `${name}@wuzzufny.test`, password: PASSWORD });
        tokens[name] = res.body.data.token;
        ids[name] = res.body.data.user.id;
    }

    async function matchBetween(seeker, company, job) {
        await request(app).post("/api/swipes").set(as(company)).send({ jobId: job, seekerId: ids[seeker], interested: true });
        const res = await request(app).post("/api/swipes").set(as(seeker)).send({ jobId: job, interested: true });
        return res.body.data.match.id;
    }

    beforeAll(async () => {
        ({ app, container, stop } = await startTestApp());
        await signUp("nile", { role: "company", fullName: "Nile HR", email: "hr@nile.co", companyName: "Nile Tech" });
        await signUp("salma", { role: "seeker", fullName: "Salma Ali", email: "salma@x.co", headline: "Frontend dev", skills: ["React"] });
        await signUp("omar", { role: "seeker", fullName: "Omar Hassan", email: "omar@x.co", headline: "Dev", skills: ["Node"] });
        for (const name of ["nile", "salma", "omar"]) await verify(name);
        await makeAdmin("mona", "moderator");
        await makeAdmin("sami", "support");

        const job = await request(app).post("/api/jobs").set(as("nile")).send({
            title: "Junior Frontend Developer", salaryMin: 14000, salaryMax: 18000,
            workMode: "hybrid", city: "Maadi", skills: ["React"]
        });
        jobId = job.body.data.id;
        matchId = await matchBetween("salma", "nile", jobId);
    });

    afterAll(async () => {
        await stop();
    });

    describe("reviews (NFR-08 integrity)", () => {
        it("rejects an early review: no interview result and the match is open", async () => {
            const res = await request(app).post(`/api/matches/${matchId}/reviews`).set(as("salma")).send({ stars: 5 });
            expect(res.status).toBe(409);
            expect(res.body.code).toBe("TOO_EARLY");
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("salma"));
            expect(box.body.data.canReview).toBe(false);
        });

        it("rejects a review from a stranger", async () => {
            await request(app).post(`/api/matches/${matchId}/close`).set(as("nile")).send({ reason: "Role filled" });
            const res = await request(app).post(`/api/matches/${matchId}/reviews`).set(as("omar")).send({ stars: 1 });
            expect(res.status).toBe(404);
        });

        it("keeps the first review hidden from the other side until both post", async () => {
            const res = await request(app).post(`/api/matches/${matchId}/reviews`).set(as("salma"))
                .send({ stars: 2, tags: ["Ghosted"], comment: "No reply for weeks" });
            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe("hidden");
            expect(res.body.data.revieweeId).toBe(ids.nile);

            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            expect(box.body.data).toMatchObject({ canReview: true, theirs: null, theyReviewed: true });
        });

        it("rejects a second review from the same side", async () => {
            const res = await request(app).post(`/api/matches/${matchId}/reviews`).set(as("salma")).send({ stars: 5 });
            expect(res.status).toBe(409);
        });

        it("rejects bad stars and unknown tags", async () => {
            expect((await request(app).post(`/api/matches/${matchId}/reviews`).set(as("nile")).send({ stars: 9 })).status).toBe(400);
            expect((await request(app).post(`/api/matches/${matchId}/reviews`).set(as("nile")).send({ stars: 3, tags: ["Lazy"] })).status).toBe(400);
        });

        it("shows both reviews once the second side posts", async () => {
            await request(app).post(`/api/matches/${matchId}/reviews`).set(as("nile")).send({ stars: 5, comment: "Great candidate" });
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            expect(box.body.data.theirs).toMatchObject({ stars: 2, tags: ["Ghosted"], status: "visible", serious: true });
            expect(box.body.data.mine.status).toBe("visible");
        });

        it("shows the rating on the profile and the candidate card (FR-39)", async () => {
            const profile = await request(app).get(`/api/users/${ids.salma}/reviews`).set(as("omar"));
            expect(profile.body.data.rating).toEqual({ average: 5, count: 1 });
            expect(profile.body.data.reviews[0].reviewerName).toBe("Nile Tech");

            const job2 = await request(app).post("/api/jobs").set(as("nile")).send({
                title: "React Developer", salaryMin: 1, salaryMax: 2, workMode: "remote", city: "Cairo", skills: ["React"]
            });
            const cards = await request(app).get(`/api/feed/candidates?jobId=${job2.body.data.id}`).set(as("nile"));
            const card = cards.body.data.candidates.find(c => c.id === ids.salma);
            expect(card.rating).toEqual({ average: 5, count: 1 });
        });

        it("lets only the reviewed side reply, once (FR-40)", async () => {
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            const reviewId = box.body.data.theirs.id;
            expect((await request(app).post(`/api/reviews/${reviewId}/reply`).set(as("salma")).send({ text: "hi" })).status).toBe(404);
            const ok = await request(app).post(`/api/reviews/${reviewId}/reply`).set(as("nile")).send({ text: "We replied by email" });
            expect(ok.body.data.reply).toBe("We replied by email");
            expect((await request(app).post(`/api/reviews/${reviewId}/reply`).set(as("nile")).send({ text: "again" })).status).toBe(409);
        });

        it("a dispute goes to the moderators, who keep or remove it (FR-41, FR-43)", async () => {
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            const reviewId = box.body.data.theirs.id;
            const disputed = await request(app).post(`/api/reviews/${reviewId}/dispute`).set(as("nile"));
            expect(disputed.body.data.status).toBe("disputed");

            const queue = await request(app).get("/api/admin/reviews").set(as("mona"));
            expect(queue.body.data.map(r => r.id)).toContain(reviewId);
            expect(queue.body.data[0].reviewee.id).toBe(ids.nile);

            expect((await request(app).post(`/api/admin/reviews/${reviewId}`).set(as("sami")).send({ decision: "keep" })).status).toBe(403);
            expect((await request(app).post(`/api/admin/reviews/${reviewId}`).set(as("mona")).send({ decision: "keep" })).status).toBe(204);
            const after = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            expect(after.body.data.theirs.status).toBe("visible");
        });

        it("the daily job reveals a lone review after 14 days", async () => {
            const omarMatch = await matchBetween("omar", "nile", jobId);
            await request(app).post(`/api/matches/${omarMatch}/close`).set(as("omar")).send({ reason: "Took another offer" });
            await request(app).post(`/api/matches/${omarMatch}/reviews`).set(as("omar")).send({ stars: 4 });

            expect(await container.reviewService.revealExpired(new Date(Date.now() + 13 * DAY))).toBe(0);
            expect(await container.reviewService.revealExpired(new Date(Date.now() + 15 * DAY))).toBe(1);
            const box = await request(app).get(`/api/matches/${omarMatch}/reviews`).set(as("nile"));
            expect(box.body.data.theirs.stars).toBe(4);
        });
    });

    describe("admin flags, warnings and suspension (FR-33 to FR-36, FR-42)", () => {
        it("only admins can open the dashboard, and each role only its own tabs (FR-33)", async () => {
            expect((await request(app).get("/api/admin/flags").set(as("salma"))).status).toBe(403);
            expect((await request(app).get("/api/admin/flags").set(as("sami"))).status).toBe(403);
            expect((await request(app).get("/api/admin/tickets").set(as("mona"))).status).toBe(403);
            const me = await request(app).get("/api/users/me").set(as("sami"));
            expect(me.body.data.tabs).toEqual(["inbox"]);
        });

        it("a spam-flagged swipe puts the seeker on the flag list (FR-18 → FR-34)", async () => {
            await signUp("newbie", { role: "seeker", fullName: "New Person", email: "new@x.co" });
            await verify("newbie");
            await request(app).post("/api/swipes").set(as("newbie")).send({ jobId, interested: true });

            const flags = await request(app).get("/api/admin/flags").set(as("mona"));
            const flag = flags.body.data.find(f => f.user.id === ids.newbie);
            expect(flag).toMatchObject({ source: "spam", hits: 2, canSuspend: false });
            expect(flag.reasons).toEqual(["Account less than 1 day old", "Empty profile"]);

            const dismissed = await request(app).post(`/api/admin/flags/${flag.id}/dismiss`).set(as("mona"));
            expect(dismissed.body.data.status).toBe("dismissed");
            const after = await request(app).get("/api/admin/flags").set(as("mona"));
            expect(after.body.data.find(f => f.id === flag.id)).toBeUndefined();
        });

        it("bad reviews raise a review flag, with no automatic warning (FR-42)", async () => {
            const docs = [1, 2, 3].map(n => ({
                match: matchId, reviewer: `6560000000000000000000a${n}`, reviewee: ids.omar,
                stars: 3, tags: ["No-show"], status: "visible"
            }));
            // three reviews from other matches, written straight into the database
            await ReviewModel.insertMany(docs);

            expect(await container.reviewService.checkFlags(new Date())).toBe(1);
            const flags = await request(app).get("/api/admin/flags").set(as("mona"));
            const flag = flags.body.data.find(f => f.user.id === ids.omar && f.source === "review");
            expect(flag).toMatchObject({ source: "review", reasons: ["3+ serious-tag reviews in 30 days"] });
            expect(flag.warnings).toEqual([]);
            // running again does not add a second line
            expect(await container.reviewService.checkFlags(new Date())).toBe(1);
            const again = await request(app).get("/api/admin/flags").set(as("mona"));
            expect(again.body.data.filter(f => f.user.id === ids.omar && f.source === "review")).toHaveLength(1);
        });

        it("suspend is refused until a warning has passed its 7-day fix-by date (FR-35, FR-36)", async () => {
            const sent = await request(app).post(`/api/admin/users/${ids.omar}/warnings`).set(as("mona"))
                .send({ reason: "Missed three interviews" });
            expect(sent.status).toBe(201);
            expect(sent.body.data).toMatchObject({ status: "open", daysLeft: 7 });

            const early = await request(app).post(`/api/admin/users/${ids.omar}/suspend`).set(as("mona"));
            expect(early.status).toBe(409);
            expect(early.body.code).toBe("NO_EXPIRED_WARNING");

            // the 7 days pass
            await WarningModel.updateOne({ _id: sent.body.data.id }, { deadline: new Date(Date.now() - 1000) });
            const flags = await request(app).get("/api/admin/flags").set(as("mona"));
            expect(flags.body.data.find(f => f.user.id === ids.omar && f.source === "review").canSuspend).toBe(true);

            expect((await request(app).post(`/api/admin/users/${ids.omar}/suspend`).set(as("sami"))).status).toBe(403);
            const ok = await request(app).post(`/api/admin/users/${ids.omar}/suspend`).set(as("mona"));
            expect(ok.status).toBe(200);
            expect(ok.body.data[0].accountState).toBe("suspended");

            // the suspended account is locked out straight away
            expect((await request(app).get("/api/trust").set(as("omar"))).status).toBe(403);
        });

        it("a warning can link to a review only if it is about that user (FR-43)", async () => {
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            const reviewAboutNile = box.body.data.theirs.id;
            const bad = await request(app).post(`/api/admin/users/${ids.newbie}/warnings`).set(as("mona"))
                .send({ reason: "x", reviewId: reviewAboutNile });
            expect(bad.status).toBe(400);
            const ok = await request(app).post(`/api/admin/users/${ids.nile}/warnings`).set(as("mona"))
                .send({ reason: "Ghosting candidates", reviewId: reviewAboutNile });
            expect(ok.body.data.reviewId).toBe(reviewAboutNile);
        });

        it("lists warnings and finds users for the moderator", async () => {
            const warnings = await request(app).get("/api/admin/warnings").set(as("mona"));
            expect(warnings.body.data[0].user.id).toBe(ids.nile);
            const fixed = await request(app).post(`/api/admin/warnings/${warnings.body.data[0].id}/fixed`).set(as("mona"));
            expect(fixed.body.data.status).toBe("fixed");

            const found = await request(app).get("/api/admin/users?q=nile").set(as("mona"));
            expect(found.body.data.map(u => u.id)).toEqual([ids.nile]);
            const tricky = await request(app).get("/api/admin/users?q=.*").set(as("mona"));
            expect(tricky.body.data).toEqual([]);
        });
    });

    describe("Trust centre and support (FR-06, FR-07, FR-37)", () => {
        it("shows 'all good', then the open warning with its fix-by date", async () => {
            const good = await request(app).get("/api/trust").set(as("salma"));
            expect(good.body.data).toMatchObject({ health: "good", openWarning: null, warnings: [] });
            expect(good.body.data.user.isVerified).toBe(true);

            await request(app).post(`/api/admin/users/${ids.salma}/warnings`).set(as("mona")).send({ reason: "Profile photo is not you" });
            const warned = await request(app).get("/api/trust").set(as("salma"));
            expect(warned.body.data.health).toBe("warning");
            expect(warned.body.data.openWarning).toMatchObject({ reason: "Profile photo is not you", daysLeft: 7 });
        });

        it("a ticket goes to the support inbox, oldest first, and the reply shows in the Trust centre", async () => {
            const sent = await request(app).post("/api/trust/tickets").set(as("salma"))
                .send({ topic: "A warning", message: "That photo is really me" });
            expect(sent.status).toBe(201);
            expect(sent.body.data.replyPromise).toMatch(/under 24 hours/);
            await request(app).post("/api/trust/tickets").set(as("nile")).send({ topic: "Account", message: "Second" });
            expect((await request(app).post("/api/trust/tickets").set(as("nile")).send({ topic: "?", message: "x" })).status).toBe(400);

            const inbox = await request(app).get("/api/admin/tickets").set(as("sami"));
            expect(inbox.body.data.map(t => t.message)).toEqual(["That photo is really me", "Second"]);
            expect(inbox.body.data[0].user.id).toBe(ids.salma);

            const ticketId = sent.body.data.id;
            await request(app).post(`/api/admin/tickets/${ticketId}/reply`).set(as("sami")).send({ text: "Thanks, we removed the warning" });
            const closed = await request(app).post(`/api/admin/tickets/${ticketId}/close`).set(as("sami"));
            expect(closed.body.data.status).toBe("closed");

            const trust = await request(app).get("/api/trust").set(as("salma"));
            expect(trust.body.data.tickets[0]).toMatchObject({ reply: "Thanks, we removed the warning", status: "closed" });
            const inboxAfter = await request(app).get("/api/admin/tickets").set(as("sami"));
            expect(inboxAfter.body.data.map(t => t.id)).not.toContain(ticketId);
        });

        it("admins have no Trust centre of their own", async () => {
            expect((await request(app).get("/api/trust").set(as("mona"))).status).toBe(403);
        });
    });

    describe("Your data (FR-05)", () => {
        it("shows what is stored and gives one JSON download", async () => {
            const summary = await request(app).get("/api/me/data").set(as("salma"));
            expect(summary.body.data).toMatchObject({ matches: 1, reviewsWritten: 1, tickets: 1, warnings: 1 });
            expect(summary.body.data.files).toBe(1);

            const file = await request(app).get("/api/me/data/download").set(as("salma"));
            expect(file.headers["content-disposition"]).toMatch(/wuzzufny-my-data\.json/);
            expect(file.body.profile.email).toBe("salma@x.co");
            expect(file.body.reviewsWritten).toHaveLength(1);
            expect(JSON.stringify(file.body)).not.toMatch(/passwordHash/);
        });

        it("needs the password to delete the account", async () => {
            const res = await request(app).delete("/api/me").set(as("salma")).send({ password: "wrong-password" });
            expect(res.status).toBe(400);
            expect(res.body.code).toBe("WRONG_PASSWORD");
        });

        it("deletes the account: own data gone, shared data shows 'Deleted user'", async () => {
            const job = await request(app).post("/api/jobs").set(as("nile")).send({
                title: "Tester", salaryMin: 1, salaryMax: 2, workMode: "remote", city: "Cairo", skills: ["QA"]
            });
            const openMatch = await matchBetween("newbie", "nile", job.body.data.id);
            expect((await request(app).delete("/api/me").set(as("newbie")).send({ password: PASSWORD })).status).toBe(204);

            // logged out everywhere, and the login no longer works
            expect((await request(app).get("/api/trust").set(as("newbie"))).status).toBe(401);
            const login = await request(app).post("/api/auth/login").send({ login: "new@x.co", password: PASSWORD });
            expect(login.status).toBe(401);

            // the company still has the match, closed with a reason, and sees "Deleted user"
            const match = await request(app).get(`/api/matches/${openMatch}`).set(as("nile"));
            expect(match.body.data.status).toBe("closed");
            expect(match.body.data.closeReason).toBe("Account deleted");
            expect(JSON.stringify(match.body.data)).toMatch(/Deleted user/);

            // the email can be used for a new account
            const again = await request(app).post("/api/auth/signup")
                .send({ role: "seeker", fullName: "New Again", email: "new@x.co", password: PASSWORD });
            expect(again.status).toBe(201);
        });

        it("removes the reviews they wrote", async () => {
            const box = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            const before = box.body.data.mine.id;
            await request(app).delete("/api/me").set(as("salma")).send({ password: PASSWORD });
            const after = await request(app).get(`/api/matches/${matchId}/reviews`).set(as("nile"));
            expect(after.body.data.theirs).toBeNull();
            expect(after.body.data.mine.id).toBe(before);
        });
    });
});
