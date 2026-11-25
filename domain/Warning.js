const AppError = require("../errors/AppError");

const FIX_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

// FR-35 / FR-36 / FR-07: a moderator's warning with a fix-by date 7 days later.
// Only "open" and "fixed" are stored. "expired" is worked out from the date,
// so nothing has to run at midnight to change it.
class Warning {
    #warningId;
    #userId;
    #adminId;
    #reviewId;
    #reason;
    #deadline;
    #status;
    #createdAt;

    constructor(data) {
        this.#warningId = data.warningId || null;
        this.#userId = String(data.userId);
        this.#adminId = data.adminId ? String(data.adminId) : null;
        this.#reviewId = data.reviewId ? String(data.reviewId) : null;
        this.#reason = data.reason;
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.#deadline = data.deadline ? new Date(data.deadline) : new Date(this.#createdAt.getTime() + FIX_DAYS * DAY_MS);
        this.#status = data.status || "open";
    }

    getWarningId() { return this.#warningId; }
    getUserId() { return this.#userId; }
    getAdminId() { return this.#adminId; }
    getReviewId() { return this.#reviewId; }
    getReason() { return this.#reason; }
    getDeadline() { return this.#deadline; }
    getCreatedAt() { return this.#createdAt; }

    getStatus() { return this.#status; }
    setStatus(value) { this.#status = value; }

    validate() {
        if (typeof this.#reason !== "string" || this.#reason.trim() === "") {
            throw new AppError("Please write the reason for the warning", 400);
        }
        if (this.#reason.length > 300) throw new AppError("The reason can be up to 300 characters", 400);
        this.#reason = this.#reason.trim();
    }

    // FR-36: an open warning whose fix-by date has passed
    isExpired(now = new Date()) {
        return this.#status === "open" && now.getTime() >= this.#deadline.getTime();
    }

    // open / fixed / expired, as the ERD lists it
    currentStatus(now = new Date()) {
        return this.isExpired(now) ? "expired" : this.#status;
    }

    // The moderator checks the problem is gone
    markFixed() {
        if (this.#status !== "open") throw new AppError("This warning is already fixed", 409);
        this.#status = "fixed";
    }

    // Whole days left before the fix-by date, 0 once it has passed
    daysLeft(now = new Date()) {
        return Math.max(0, Math.ceil((this.#deadline.getTime() - now.getTime()) / DAY_MS));
    }
}

Warning.FIX_DAYS = FIX_DAYS;

module.exports = Warning;
