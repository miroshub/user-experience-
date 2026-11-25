const SeekerSwipeHandler = require("../../../services/swipe/SeekerSwipeHandler");
const JobSeeker = require("../../../domain/JobSeeker");
const Job = require("../../../domain/Job");

const LIMIT = 50;
const now = new Date("2026-11-15T12:00:00");

// Fakes stand in for the database and the spam checker (Dependency Inversion)
function makeHandler(interestedEarlierToday, flagged = false) {
    const spamCalls = [];
    const raised = [];
    const flagService = { raise: async (...args) => raised.push(args) };
    const swipeRepository = { countInterestedSince: async () => interestedEarlierToday };
    const spamChecker = {
        evaluate: (user, data) => {
            spamCalls.push(data);
            return flagged ? { flagged: true, reasons: ["A", "B"] } : { flagged: false, reasons: [] };
        }
    };
    return { handler: new SeekerSwipeHandler(swipeRepository, spamChecker, LIMIT, flagService), spamCalls, raised };
}

const seeker = new JobSeeker({ userId: "s1", fullName: "Salma", email: "s@x.co", isVerified: true });
const job = new Job({
    jobId: "j1", companyId: "c1", title: "Dev", salaryMin: 1, salaryMax: 2,
    workMode: "remote", skills: ["React"], status: "live"
});

describe("SeekerSwipeHandler daily limit", () => {
    it("allows the 50th Interested swipe and passes the count to the spam check", async () => {
        const { handler, spamCalls } = makeHandler(LIMIT - 1);
        const swipe = await handler.makeSwipe(seeker, job, { interested: true }, now);
        expect(swipe.getIsInterested()).toBe(true);
        expect(spamCalls[0].interestedToday).toBe(LIMIT);
    });

    it("refuses the 51st Interested swipe with 429 DAILY_LIMIT", async () => {
        const { handler } = makeHandler(LIMIT);
        await expect(handler.makeSwipe(seeker, job, { interested: true }, now))
            .rejects.toMatchObject({ status: 429, code: "DAILY_LIMIT" });
    });

    it("still allows skips after the limit is reached", async () => {
        const { handler, spamCalls } = makeHandler(LIMIT);
        const swipe = await handler.makeSwipe(seeker, job, { interested: false }, now);
        expect(swipe.getIsInterested()).toBe(false);
        expect(spamCalls).toHaveLength(0);
    });

    it("puts a flagged seeker on the moderator flag list (FR-34)", async () => {
        const { handler, raised } = makeHandler(0, true);
        const swipe = await handler.makeSwipe(seeker, job, { interested: true }, now);
        expect(swipe.getIsSpam()).toBe(true);
        expect(raised).toEqual([["s1", "spam", ["A", "B"], now]]);
    });

    it("does not flag a clean swipe", async () => {
        const { handler, raised } = makeHandler(0);
        await handler.makeSwipe(seeker, job, { interested: true }, now);
        expect(raised).toHaveLength(0);
    });

    it("tells SwipeService that a company swipe completes the match", () => {
        expect(makeHandler(0).handler.otherSide).toBe("company");
    });
});
