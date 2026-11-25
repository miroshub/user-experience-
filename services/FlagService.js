const Flag = require("../domain/Flag");

// FR-34: puts accounts on the moderator flag list. Spam (FR-18) and reviews (FR-42) both come here,
// so there is one list and one rule for "already flagged".
class FlagService {
    #flagRepository;

    constructor(flagRepository) {
        this.#flagRepository = flagRepository;
    }

    // An open flag of the same kind gets the new reasons instead of a second line.
    // A dismissed flag stays dismissed unless something new happened after it (evidenceAt).
    async raise(userId, source, reasons, now = new Date(), evidenceAt = now) {
        const latest = await this.#flagRepository.findLatest(userId, source);
        if (latest && latest.isOpen()) {
            latest.addReasons(reasons);
            return this.#flagRepository.save(latest);
        }
        if (latest && latest.getDismissedAt() && latest.getDismissedAt().getTime() >= evidenceAt.getTime()) {
            return null;
        }
        return this.#flagRepository.create(new Flag({ userId, source, reasons, createdAt: now }));
    }
}

module.exports = FlagService;
