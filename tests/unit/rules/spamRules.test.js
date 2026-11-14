const FlagRule = require("../../../interfaces/FlagRule");
const FlagChecker = require("../../../rules/FlagChecker");
const NewAccountRule = require("../../../rules/spam/NewAccountRule");
const NotVerifiedRule = require("../../../rules/spam/NotVerifiedRule");
const MassApplyRule = require("../../../rules/spam/MassApplyRule");
const EmptyProfileRule = require("../../../rules/spam/EmptyProfileRule");
const JobSeeker = require("../../../domain/JobSeeker");

const now = new Date("2026-11-14T12:00:00Z");
const hoursAgo = h => new Date(now.getTime() - h * 60 * 60 * 1000);

function seeker(overrides = {}) {
    return new JobSeeker({
        fullName: "S", email: "s@s.co", isVerified: true, headline: "Dev", skills: ["React"],
        createdAt: hoursAgo(72), ...overrides
    });
}

describe("FlagRule is an interface", () => {
    it("cannot be created directly", () => {
        expect(() => new FlagRule()).toThrow("FlagRule is an interface");
    });

    it("a rule that forgets a method fails loudly", () => {
        class Lazy extends FlagRule {}
        const lazy = new Lazy();
        expect(() => lazy.isHit()).toThrow("isHit not implemented");
        expect(() => lazy.reason).toThrow("reason not implemented");
    });
});

// Liskov: every rule can stand in for FlagRule, the checker never needs to know which one it has
describe.each([NewAccountRule, NotVerifiedRule, MassApplyRule, EmptyProfileRule])("%o follows FlagRule", RuleClass => {
    it("has a reason and answers true or false", () => {
        const rule = new RuleClass();
        expect(rule).toBeInstanceOf(FlagRule);
        expect(typeof rule.reason).toBe("string");
        expect(typeof rule.isHit(seeker(), { now, interestedToday: 1 })).toBe("boolean");
    });
});

describe("each spam rule (FR-18)", () => {
    it("NewAccountRule: under 1 day old", () => {
        const rule = new NewAccountRule();
        expect(rule.isHit(seeker({ createdAt: hoursAgo(2) }), { now })).toBe(true);
        expect(rule.isHit(seeker({ createdAt: hoursAgo(30) }), { now })).toBe(false);
        expect(rule.isHit(seeker({ createdAt: null }), { now })).toBe(false);
    });

    it("NotVerifiedRule", () => {
        expect(new NotVerifiedRule().isHit(seeker({ isVerified: false }))).toBe(true);
        expect(new NotVerifiedRule().isHit(seeker())).toBe(false);
    });

    it("MassApplyRule: 50 or more today", () => {
        expect(new MassApplyRule().isHit(seeker(), { interestedToday: 50 })).toBe(true);
        expect(new MassApplyRule().isHit(seeker(), { interestedToday: 49 })).toBe(false);
    });

    it("EmptyProfileRule: no headline and no skills", () => {
        expect(new EmptyProfileRule().isHit(seeker({ headline: "", skills: [] }))).toBe(true);
        expect(new EmptyProfileRule().isHit(seeker({ headline: "", skills: ["SQL"] }))).toBe(false);
    });
});

describe("FlagChecker", () => {
    const checker = new FlagChecker([new NewAccountRule(), new NotVerifiedRule(), new MassApplyRule(), new EmptyProfileRule()], 2);

    it("one rule hit is not enough", () => {
        const user = seeker({ createdAt: hoursAgo(1) });
        expect(checker.countHits(user, { now, interestedToday: 1 })).toBe(1);
        expect(checker.check(user, { now, interestedToday: 1 })).toBe(false);
    });

    it("two rules hit = Check later, with the reasons", () => {
        const user = seeker({ createdAt: hoursAgo(1), headline: "", skills: [] });
        expect(checker.evaluate(user, { now, interestedToday: 1 })).toEqual({
            flagged: true,
            reasons: ["Account less than 1 day old", "Empty profile"]
        });
    });

    it("a new rule plugs in without changing the checker (Open/Closed)", () => {
        class AlwaysRule extends FlagRule {
            get reason() { return "Always"; }
            isHit() { return true; }
        }
        const strict = new FlagChecker([new AlwaysRule()], 1);
        expect(strict.check(seeker(), { now })).toBe(true);
    });
});
