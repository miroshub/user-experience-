// H8 Trust centre, the user's side: account health and warning history (FR-07)
// and talking to support (FR-06). Replies and warnings show up here, never by email.
const REPLY_PROMISE = "A real person replies in under 24 hours";

class TrustService {
    #warningRepository;
    #ticketRepository;

    constructor(warningRepository, ticketRepository) {
        this.#warningRepository = warningRepository;
        this.#ticketRepository = ticketRepository;
    }

    get replyPromise() {
        return REPLY_PROMISE;
    }

    // FR-07: "All good", or the open warning with its reason and fix-by date
    async overview(user, now = new Date()) {
        const [warnings, tickets] = await Promise.all([
            this.#warningRepository.findForUser(user.getUserId()),
            this.#ticketRepository.findForUser(user.getUserId())
        ]);
        const openWarning = warnings.find(w => w.currentStatus(now) !== "fixed") || null;
        return {
            health: openWarning ? "warning" : "good",
            openWarning,
            warnings,
            tickets,
            replyPromise: REPLY_PROMISE
        };
    }

    // FR-06: the ticket goes to the shared support inbox (FR-37)
    async contactSupport(user, body, now = new Date()) {
        const ticket = user.contactSupport(body.topic, body.message, now);
        return this.#ticketRepository.create(ticket);
    }
}

TrustService.REPLY_PROMISE = REPLY_PROMISE;

module.exports = TrustService;
