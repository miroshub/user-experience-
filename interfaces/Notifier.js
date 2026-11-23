// Interface: how services tell people that something changed, live.
// Services only know this, not Socket.io, so tests can pass a fake (Dependency Inversion).
class Notifier {
    constructor() {
        if (new.target === Notifier) throw new Error("Notifier is an interface");
    }

    // event: "match:new", "message:new", "match:status" or "notice:new"
    toUsers(userIds, event, data) {
        throw new Error("toUsers not implemented");
    }

    // Everyone looking at this match chat, plus its two members wherever they are in the app
    toMatch(match, event, data) {
        throw new Error("toMatch not implemented");
    }
}

module.exports = Notifier;
