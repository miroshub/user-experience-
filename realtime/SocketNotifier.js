const Notifier = require("../interfaces/Notifier");

// Sends events through Socket.io. Until attach() is called (tests, scripts) it stays silent.
class SocketNotifier extends Notifier {
    #io = null;

    attach(io) {
        this.#io = io;
    }

    toUsers(userIds, event, data) {
        if (!this.#io) return;
        this.#io.to(userIds.map(id => `user:${id}`)).emit(event, data);
    }

    // One emit to several rooms: Socket.io sends it once per socket, so nobody gets it twice
    toMatch(match, event, data) {
        if (!this.#io) return;
        this.#io.to([
            `match:${match.getMatchId()}`,
            `user:${match.getSeekerId()}`,
            `user:${match.getCompanyId()}`
        ]).emit(event, data);
    }
}

module.exports = SocketNotifier;
