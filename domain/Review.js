const AppError = require("../errors/AppError");

const TAGS = ["Ghosted", "No-show", "Fake job / fake profile", "Rude"];
const SERIOUS_TAGS = ["Ghosted", "No-show", "Fake job / fake profile"];
const REVEAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TEXT = 300;

// FR-38 to FR-43. Status: hidden → visible → disputed → visible (kept) or removed.
// "Hidden" is the blind part of NFR-08: nobody sees it until both sides post or 14 days pass.
class Review {
    #reviewId;
    #matchId;
    #reviewerId;
    #revieweeId;
    #stars;
    #tags;
    #comment;
    #reply;
    #status;
    #createdAt;

    constructor(data) {
        this.#reviewId = data.reviewId || null;
        this.#matchId = String(data.matchId);
        this.#reviewerId = String(data.reviewerId);
        this.#revieweeId = String(data.revieweeId);
        this.#stars = data.stars;
        this.#tags = Array.isArray(data.tags) ? [...data.tags] : [];
        this.#comment = data.comment || "";
        this.#reply = data.reply || null;
        this.#status = data.status || "hidden";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    }

    getReviewId() { return this.#reviewId; }
    getMatchId() { return this.#matchId; }
    getReviewerId() { return this.#reviewerId; }
    getRevieweeId() { return this.#revieweeId; }
    getCreatedAt() { return this.#createdAt; }

    getStars() { return this.#stars; }
    setStars(value) { this.#stars = value; }

    getTags() { return [...this.#tags]; }
    setTags(value) { this.#tags = [...value]; }

    getComment() { return this.#comment; }
    setComment(value) { this.#comment = value; }

    getReply() { return this.#reply; }

    getStatus() { return this.#status; }
    setStatus(value) { this.#status = value; }

    // FR-38: checks the form. The review starts hidden.
    submit() {
        if (!Number.isInteger(this.#stars) || this.#stars < 1 || this.#stars > 5) {
            throw new AppError("Pick 1 to 5 stars", 400);
        }
        if (this.#tags.some(tag => !TAGS.includes(tag))) throw new AppError("Unknown tag", 400);
        this.#tags = [...new Set(this.#tags)];
        if (typeof this.#comment !== "string" || this.#comment.length > MAX_TEXT) {
            throw new AppError(`The comment can be up to ${MAX_TEXT} characters`, 400);
        }
        this.#comment = this.#comment.trim();
        this.#status = "hidden";
    }

    isVisible() {
        return this.#status === "visible";
    }

    // Both sides have posted, or 14 days have passed (the daily job)
    reveal() {
        if (this.#status === "hidden") this.#status = "visible";
    }

    isRevealDue(now = new Date()) {
        return this.#status === "hidden" && now.getTime() - this.#createdAt.getTime() >= REVEAL_DAYS * DAY_MS;
    }

    // FR-40: the reviewed person can post one public reply
    addReply(userId, text) {
        if (String(userId) !== this.#revieweeId) throw new AppError("Only the reviewed person can reply", 403);
        if (!this.isVisible() && this.#status !== "disputed") throw new AppError("You can reply once the review is visible", 409);
        if (this.#reply) throw new AppError("You already replied to this review", 409);
        if (typeof text !== "string" || text.trim() === "") throw new AppError("Please write a reply", 400);
        if (text.length > MAX_TEXT) throw new AppError(`The reply can be up to ${MAX_TEXT} characters`, 400);
        this.#reply = text.trim();
    }

    // FR-41: the reviewed person sends it to the moderators
    dispute(userId) {
        if (String(userId) !== this.#revieweeId) throw new AppError("Only the reviewed person can dispute a review", 403);
        if (this.#status === "disputed") throw new AppError("This review is already with the moderators", 409);
        if (!this.isVisible()) throw new AppError("This review cannot be disputed", 409);
        this.#status = "disputed";
    }

    // FR-43: the moderator keeps or removes a disputed review
    moderate(decision) {
        if (this.#status !== "disputed") throw new AppError("Only disputed reviews can be moderated", 409);
        if (decision === "keep") this.#status = "visible";
        else if (decision === "remove") this.#status = "removed";
        else throw new AppError("Decision must be keep or remove", 400);
    }

    // Ghosted, No-show or Fake (FR-42)
    isSerious() {
        return this.#tags.some(tag => SERIOUS_TAGS.includes(tag));
    }

    // FR-41: disputed reviews wait for the moderator, removed ones are gone
    countsTowardFlags() {
        return this.#status === "hidden" || this.#status === "visible";
    }
}

Review.TAGS = TAGS;
Review.SERIOUS_TAGS = SERIOUS_TAGS;
Review.REVEAL_DAYS = REVEAL_DAYS;

module.exports = Review;
