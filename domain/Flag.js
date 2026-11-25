const AppError = require("../errors/AppError");

const SOURCES = ["spam", "review"];

// FR-34: one line in the moderator's flag list. Spam flags (FR-18) and review flags (FR-42)
// share this class, so the moderator sees them in one place and can dismiss either kind.
// Not in the Milestone 1 ERD: added so a dismissed flag stays dismissed.
class Flag {
    #flagId;
    #userId;
    #source;
    #reasons;
    #status;
    #createdAt;
    #dismissedBy;
    #dismissedAt;

    constructor(data) {
        if (!SOURCES.includes(data.source)) throw new AppError("Flag source must be spam or review", 400);
        this.#flagId = data.flagId || null;
        this.#userId = String(data.userId);
        this.#source = data.source;
        this.#reasons = Array.isArray(data.reasons) ? [...data.reasons] : [];
        this.#status = data.status || "open";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.#dismissedBy = data.dismissedBy ? String(data.dismissedBy) : null;
        this.#dismissedAt = data.dismissedAt ? new Date(data.dismissedAt) : null;
    }

    getFlagId() { return this.#flagId; }
    getUserId() { return this.#userId; }
    getSource() { return this.#source; }
    getReasons() { return [...this.#reasons]; }
    getStatus() { return this.#status; }
    getCreatedAt() { return this.#createdAt; }
    getDismissedBy() { return this.#dismissedBy; }
    getDismissedAt() { return this.#dismissedAt; }

    // "how many rules were hit" (FR-34)
    hitCount() {
        return this.#reasons.length;
    }

    isOpen() {
        return this.#status === "open";
    }

    // A new hit on an open flag adds its reasons instead of making a second line
    addReasons(reasons) {
        this.#reasons = [...new Set([...this.#reasons, ...reasons])];
    }

    dismiss(adminId, now = new Date()) {
        if (!this.isOpen()) throw new AppError("This flag is already dismissed", 409);
        this.#status = "dismissed";
        this.#dismissedBy = String(adminId);
        this.#dismissedAt = now;
    }
}

Flag.SOURCES = SOURCES;

module.exports = Flag;
