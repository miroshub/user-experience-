// Interface: how one kind of user makes a swipe. JS has no "interface" keyword,
// so this class cannot be created directly and every method must be overridden.
class SwipeHandler {
    constructor() {
        if (new.target === SwipeHandler) throw new Error("SwipeHandler is an interface");
    }

    // Whose swipe completes a match: "company" for a seeker, "seeker" for a company
    get otherSide() {
        throw new Error("otherSide not implemented");
    }

    // Returns the new (not yet saved) Swipe
    async makeSwipe(user, job, body, now) {
        throw new Error("makeSwipe not implemented");
    }
}

module.exports = SwipeHandler;
