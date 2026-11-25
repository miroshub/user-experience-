const mongoose = require("mongoose");

// ERD table AIChat (user_message, ai_reply, suggested_filters). One chat per seeker:
// every question and answer is a turn, and filters holds the chips shown right now.
const filtersShape = {
    role: { type: String, default: null },
    skills: { type: [String], default: [] },
    level: { type: String, default: null },
    places: { type: [String], default: [] },
    minPay: { type: Number, default: null }
};

const turnSchema = new mongoose.Schema({
    userMessage: { type: String, required: true },
    aiReply: { type: String, required: true },
    filters: filtersShape,
    askedAt: { type: Date, default: Date.now }
}, { _id: false });

const aiChatSchema = new mongoose.Schema({
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    filters: filtersShape,
    turns: { type: [turnSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model("AIChat", aiChatSchema);
