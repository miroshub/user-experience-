const FlagRule = require("../../../interfaces/FlagRule");
const FlagChecker = require("../../../rules/FlagChecker");
const SeriousTagsRule = require("../../../rules/review/SeriousTagsRule");
const LowAverageRule = require("../../../rules/review/LowAverageRule");
const Review = require("../../../domain/Review");
const JobSeeker = require("../../../domain/JobSeeker");

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-25T10:00:00Z");
const user = new JobSeeker({ userId: "u1", fullName: "S", email: "s@x.co" });

function review(stars, tags = [], daysAgo = 1) {
    return new Review({ matchId: "m", reviewerId: "x", revieweeId: "u1", stars, tags, createdAt: new Date(now.getTime() - daysAgo * DAY) });
}

// FR-42 uses the same FlagChecker as spam, with minHits = 1
const checker = new FlagChecker([new SeriousTagsRule(3, 30), new LowAverageRule(2, 5)], 1);

describe.each([SeriousTagsRule, LowAverageRule])("%o follows FlagRule (Liskov)", RuleClass => {
    it("has a reason and answers true or false", () => {
        const rule = new RuleClass();
        expect(rule).toBeInstanceOf(FlagRule);
        expect(typeof rule.reason).toBe("string");
        expect(typeof rule.isHit(user, { now, reviews: [] })).toBe("boolean");
    });
});

describe("FR-42 review flags", () => {
    it("3 serious-tag reviews in 30 days flag the account", () => {
        const reviews = [review(4, ["Ghosted"]), review(5, ["No-show"]), review(3, ["Fake job / fake profile"])];
        expect(checker.evaluate(user, { now, reviews })).toEqual({ flagged: true, reasons: ["3+ serious-tag reviews in 30 days"] });
    });

    it("2 serious ones, or 3 with one older than 30 days, do not", () => {
        expect(checker.check(user, { now, reviews: [review(4, ["Ghosted"]), review(4, ["No-show"])] })).toBe(false);
        const old = [review(4, ["Ghosted"]), review(4, ["No-show"]), review(4, ["Ghosted"], 31)];
        expect(checker.check(user, { now, reviews: old })).toBe(false);
    });

    it("Rude is not serious", () => {
        const rude = [review(4, ["Rude"]), review(4, ["Rude"]), review(4, ["Rude"])];
        expect(checker.check(user, { now, reviews: rude })).toBe(false);
    });

    it("an average under 2 stars from at least 5 reviews flags the account", () => {
        const low = [review(1), review(1), review(2), review(2), review(3)]; // 1.8
        expect(checker.evaluate(user, { now, reviews: low }).reasons).toEqual(["Average under 2 stars from 5+ reviews"]);
    });

    it("exactly 2.0, or fewer than 5 reviews, does not", () => {
        expect(checker.check(user, { now, reviews: [review(1), review(1), review(2), review(3), review(3)] })).toBe(false);
        expect(checker.check(user, { now, reviews: [review(1), review(1), review(1), review(1)] })).toBe(false);
    });
});
