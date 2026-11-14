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

    constructor(data) {
        this.#matchId = data.matchId || null;
        this.#seekerId = String(data.seekerId);
        this.#jobId = String(data.jobId);
        this.#companyId = String(data.companyId);
        this.#status = data.status || "matched";
        this.#matchedAt = data.matchedAt ? new Date(data.matchedAt) : new Date();
        this.#lastActivity = data.lastActivity ? new Date(data.lastActivity) : this.#matchedAt;
        this.#closeReason = data.closeReason || null;
    }

    getMatchId() { return this.#matchId; }
    getSeekerId() { return this.#seekerId; }
    getJobId() { return this.#jobId; }
    getCompanyId() { return this.#companyId; }

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

    // The status bar only moves forward
    moveTo(status, now = new Date()) {
        if (this.#status === "closed") throw new AppError("This match is closed", 409);
        const from = STEPS.indexOf(this.#status);
        const to = STEPS.indexOf(status);
        if (to === -1) throw new AppError("Unknown status", 400);
        if (to <= from) throw new AppError("The status can only move forward", 409);
        this.#status = status;
        this.#lastActivity = now;
    }

    // FR-28: "Waiting on them" after 5 quiet days
    isWaiting(now = new Date()) {
        if (this.#status === "closed" || this.#status === "hired") return false;
        return now.getTime() - this.#lastActivity.getTime() >= WAITING_DAYS * DAY_MS;
    }

    // FR-29: no silent closing, a reason is required
    close(reason, now = new Date()) {
        if (this.#status === "closed") throw new AppError("This match is already closed", 409);
        if (typeof reason !== "string" || reason.trim() === "") {
            throw new AppError("Please pick a reason for closing", 400);
        }
        this.#status = "closed";
        this.#closeReason = reason.trim();
        this.#lastActivity = now;
    }
}

module.exports = Match;
