// Interface: one rule that can flag an account. JS has no "interface" keyword,
// so this class cannot be created directly and every method must be overridden.
class FlagRule {
    constructor() {
        if (new.target === FlagRule) throw new Error("FlagRule is an interface");
    }

    // Short text the moderators see, e.g. "Account less than 1 day old"
    get reason() {
        throw new Error("reason not implemented");
    }

    isHit(user, data) {
        throw new Error("isHit not implemented");
    }
}

module.exports = FlagRule;
