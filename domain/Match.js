const AppError = require("../errors/AppError");

// FR-27: the status bar steps, in order. "closed" can happen from any step.
const STEPS = ["matched", "chatting", "interview", "offer", "hired"];
const WAITING_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

class Match {
    #matchId;
    #seekerId;
    #jobId;
    #companyId;
    #status;
    #matchedAt;
    #lastActivity;
    #closeReason;
    // not in the class diagram: who wrote last (for FR-28), when each step was reached
    // (the progress list on H4), when the last nudge went out, and who closed the match
    #lastActor;
    #stepDates;
    #nudgedAt;
    #closedBy;

    constructor(data) {
        this.#matchId = data.matchId || null;
        this.#seekerId = String(data.seekerId);
        this.#jobId = String(data.jobId);
        this.#companyId = String(data.companyId);
        this.#status = data.status || "matched";
        this.#matchedAt = data.matchedAt ? new Date(data.matchedAt) : new Date();
        this.#lastActivity = data.lastActivity ? new Date(data.lastActivity) : this.#matchedAt;
        this.#closeReason = data.closeReason || null;
        this.#lastActor = data.lastActor || null;
        this.#stepDates = { matched: this.#matchedAt, ...(data.stepDates || {}) };
        this.#nudgedAt = data.nudgedAt ? new Date(data.nudgedAt) : null;
        this.#closedBy = data.closedBy || null;
    }

    getMatchId() { return this.#matchId; }
    getSeekerId() { return this.#seekerId; }
    getJobId() { return this.#jobId; }
    getCompanyId() { return this.#companyId; }
    getLastActor() { return this.#lastActor; }
    getStepDates() { return { ...this.#stepDates }; }
    getNudgedAt() { return this.#nudgedAt; }
    getClosedBy() { return this.#closedBy; }

    getStatus() { return this.#status; }
    setStatus(value) { this.#status = value; }

    getMatchedAt() { return this.#matchedAt; }
    setMatchedAt(value) { this.#matchedAt = value; }

    getLastActivity() { return this.#lastActivity; }
    setLastActivity(value) { this.#lastActivity = value; }

    getCloseReason() { return this.#closeReason; }
    setCloseReason(value) { this.#closeReason = value; }

    // Only the two members of a match may see it (NFR-03)
    involves(userId) {
        return this.#seekerId === userId || this.#companyId === userId;
    }

    // "seeker" or "company", from a user id
    sideOf(userId) {
        if (userId === this.#seekerId) return "seeker";
        if (userId === this.#companyId) return "company";
        return null;
    }

    isClosed() {
        return this.#status === "closed";
    }

    requireOpen() {
        if (this.isClosed()) throw new AppError("This match is closed", 409);
    }

    // The status bar only moves forward
    moveTo(status, now = new Date()) {
        this.requireOpen();
        const from = STEPS.indexOf(this.#status);
        const to = STEPS.indexOf(status);
        if (to === -1) throw new AppError("Unknown status", 400);
        if (to <= from) throw new AppError("The status can only move forward", 409);
        this.#status = status;
        this.#stepDates[status] = now;
        this.#lastActivity = now;
    }

    // Moves forward only if the match is not there yet (booking twice does not throw)
    reach(status, now = new Date()) {
        if (STEPS.indexOf(status) > STEPS.indexOf(this.#status)) this.moveTo(status, now);
    }

    // A person (not a system card) did something in the chat. The first message starts "Chatting".
    recordActivity(side, now = new Date()) {
        this.requireOpen();
        this.#lastActor = side;
        this.#lastActivity = now;
        this.reach("chatting", now);
    }

    // FR-28: "Waiting on them" when the company has not answered for 5 days
    isWaiting(now = new Date()) {
        if (this.#status === "closed" || this.#status === "hired") return false;
        if (this.#lastActor === "company") return false;
        return now.getTime() - this.#lastActivity.getTime() >= WAITING_DAYS * DAY_MS;
    }

    // Whole days since the last activity, for "Waiting on them · 6 days"
    quietDays(now = new Date()) {
        return Math.floor((now.getTime() - this.#lastActivity.getTime()) / DAY_MS);
    }

    // One nudge per quiet spell: a new message starts a new spell
    needsNudge(now = new Date()) {
        if (!this.isWaiting(now)) return false;
        return this.#nudgedAt === null || this.#nudgedAt.getTime() < this.#lastActivity.getTime();
    }

    markNudged(now = new Date()) {
        this.#nudgedAt = now;
    }

    // FR-29: no silent closing, a reason is required
    close(reason, now = new Date(), side = null) {
        if (this.#status === "closed") throw new AppError("This match is already closed", 409);
        if (typeof reason !== "string" || reason.trim() === "") {
            throw new AppError("Please pick a reason for closing", 400);
        }
        this.#status = "closed";
        this.#closeReason = reason.trim();
        this.#closedBy = side;
        this.#lastActivity = now;
        this.#stepDates.closed = now;
    }
}

Match.STEPS = STEPS;

module.exports = Match;
