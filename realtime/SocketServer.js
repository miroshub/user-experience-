const { Server } = require("socket.io");

// Live updates (FR-22). Every socket logs in with the same JWT as the REST API.
// Rooms: "user:<id>" for each person, "match:<id>" for an open chat (NFR-03: members only).
class SocketServer {
    #tokenService;
    #userRepository;
    #matchRepository;
    #notifier;

    constructor(tokenService, userRepository, matchRepository, notifier) {
        this.#tokenService = tokenService;
        this.#userRepository = userRepository;
        this.#matchRepository = matchRepository;
        this.#notifier = notifier;
    }

    start(httpServer) {
        const io = new Server(httpServer);
        io.use((socket, next) => this.#logIn(socket, next));
        io.on("connection", socket => this.#onConnect(socket));
        this.#notifier.attach(io);
        return io;
    }

    async #logIn(socket, next) {
        try {
            const payload = this.#tokenService.verify(socket.handshake.auth?.token);
            const user = payload ? await this.#userRepository.findById(payload.sub) : null;
            if (!user || user.getAccountState() === "suspended") return next(new Error("Please log in"));
            socket.data.userId = user.getUserId();
            next();
        } catch {
            next(new Error("Please log in"));
        }
    }

    #onConnect(socket) {
        socket.join(`user:${socket.data.userId}`);

        // The client asks to watch one chat. Only the two members get in.
        socket.on("match:join", async (matchId, answer) => {
            const match = await this.#matchRepository.findById(matchId);
            const allowed = match !== null && match.involves(socket.data.userId);
            if (allowed) socket.join(`match:${matchId}`);
            if (typeof answer === "function") answer({ ok: allowed });
        });

        socket.on("match:leave", matchId => {
            socket.leave(`match:${matchId}`);
        });
    }
}

module.exports = SocketServer;
