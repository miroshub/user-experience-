const mongoose = require("mongoose");

// ERD table SupportTicket, plus the reply text and when it was sent
const ticketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    reply: { type: String, default: null },
    repliedAt: { type: Date, default: null }
}, { timestamps: true });

// FR-37: the inbox is open tickets, oldest first. FR-06: a user's own tickets.
ticketSchema.index({ status: 1, createdAt: 1 });
ticketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("SupportTicket", ticketSchema);
