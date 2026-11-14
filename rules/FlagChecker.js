// Runs a list of FlagRules. It never needs to change when a rule is added (Open/Closed):
// spam uses minHits = 2 (FR-18), review flags will use minHits = 1 (FR-42).
class FlagChecker {
    #rules;
    #minHits;

    constructor(rules, minHits) {
        this.#rules = rules;
        this.#minHits = minHits;
    }

    hitRules(user, data) {
        return this.#rules.filter(rule => rule.isHit(user, data));
    }

    countHits(user, data) {
        return this.hitRules(user, data).length;
    }

    check(user, data) {
        return this.countHits(user, data) >= this.#minHits;
    }

    // check() plus the reasons, so the swipe can store why it was flagged
    evaluate(user, data) {
        const reasons = this.hitRules(user, data).map(rule => rule.reason);
        return { flagged: reasons.length >= this.#minHits, reasons };
    }
}

module.exports = FlagChecker;
