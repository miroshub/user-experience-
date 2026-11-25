const AppError = require("../errors/AppError");

const HOUR_MS = 60 * 60 * 1000;
const TOPICS = ["Account", "Verification", "A match or chat", "A review", "A warning", "Something else"];

// FR-06 / FR-37: a user writes to support, a support admin replies and closes it.
// The reply shows up in the user's Trust centre.
class SupportTicket {
    #ticketId;
    #userId;
    #adminId;
    #topic;
    #message;
    #status;
    #createdAt;
    // not in the ERD table: the reply itself and when it was sent
    #reply;
    #repliedAt;

    constructor(data) {
        this.#ticketId = data.ticketId || null;
        this.#userId = String(data.userId);
        this.#adminId = data.adminId ? String(data.adminId) : null;
        this.#topic = data.topic;
        this.#message = data.message;
        this.#status = data.status || "open";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.#reply = data.reply || null;
        this.#repliedAt = data.repliedAt ? new Date(data.repliedAt) : null;
    }

    getTicketId() { return this.#ticketId; }
    getUserId() { return this.#userId; }
    getAdminId() { return this.#adminId; }
    getTopic() { return this.#topic; }
    getMessage() { return this.#message; }
    getStatus() { return this.#status; }
    getCreatedAt() { return this.#createdAt; }
    getReply() { return this.#reply; }
    getRepliedAt() { return this.#repliedAt; }

    validate() {
        if (!TOPICS.includes(this.#topic)) throw new AppError("Please pick a topic", 400);
        if (typeof this.#message !== "string" || this.#message.trim() === "") {
            throw new AppError("Please write your message", 400);
        }
        if (this.#message.length > 1000) throw new AppError("The message can be up to 1000 characters", 400);
        this.#message = this.#message.trim();
    }

    isOpen() {
        return this.#status === "open";
    }

    // FR-37: one written reply from support. A second reply replaces the first.
    answer(adminId, text, now = new Date()) {
        if (!this.isOpen()) throw new AppError("This ticket is closed", 409);
        if (typeof text !== "string" || text.trim() === "") throw new AppError("Please write a reply", 400);
        if (text.length > 1000) throw new AppError("The reply can be up to 1000 characters", 400);
        this.#reply = text.trim();
        this.#repliedAt = now;
        this.#adminId = String(adminId);
    }

    close(adminId) {
        if (!this.isOpen()) throw new AppError("This ticket is already closed", 409);
        this.#status = "closed";
        this.#adminId = String(adminId);
    }

    // The inbox is sorted by this (FR-37)
    hoursWaiting(now = new Date()) {
        return Math.floor((now.getTime() - this.#createdAt.getTime()) / HOUR_MS);
    }
}

SupportTicket.TOPICS = TOPICS;

module.exports = SupportTicket;
