const AppError = require("../errors/AppError");

const MAX_LENGTH = 1000;

// "system" cards are the in-app notices (DECISIONS: notices live in the chat, never email)
const KINDS = ["text", "interview", "test", "call", "nudge", "reminder", "status", "closed"];

// One line in a match chat (FR-22). sender is a user id, or "system" for the cards.
class Message {
    #messageId;
    #matchId;
    #sender;
    #text;
    #sentAt;
    #kind;
    #interviewId;

    constructor(data) {
        this.#messageId = data.messageId || null;
        this.#matchId = String(data.matchId);
        this.#sender = String(data.sender);
        this.#text = typeof data.text === "string" ? data.text : "";
        this.#sentAt = data.sentAt ? new Date(data.sentAt) : null;
        this.#kind = KINDS.includes(data.kind) ? data.kind : "text";
        this.#interviewId = data.interviewId ? String(data.interviewId) : null;
    }

    // A card the app writes itself, e.g. "Interview booked"
    static notice(matchId, kind, text, interviewId = null) {
        return new Message({ matchId, sender: "system", kind, text, interviewId });
    }

    getMessageId() { return this.#messageId; }
    getMatchId() { return this.#matchId; }
    getKind() { return this.#kind; }
    getInterviewId() { return this.#interviewId; }

    getSender() { return this.#sender; }
    setSender(value) { this.#sender = String(value); }

    getText() { return this.#text; }
    setText(value) { this.#text = value; }

    getSentAt() { return this.#sentAt; }
    setSentAt(value) { this.#sentAt = value; }

    isFromSystem() {
        return this.#sender === "system";
    }

    // The pure part of sending: check the text and stamp the time. ChatService saves it.
    send(now = new Date()) {
        if (typeof this.#text !== "string" || this.#text.trim() === "") {
            throw new AppError("Write something first", 400);
        }
        const text = this.#text.trim();
        if (text.length > MAX_LENGTH) {
            throw new AppError(`Messages can be up to ${MAX_LENGTH} characters`, 400);
        }
        this.#text = text;
        this.#sentAt = now;
        return this;
    }
}

module.exports = Message;
