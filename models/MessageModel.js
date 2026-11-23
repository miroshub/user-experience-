const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    // a user id as text, or "system" for the in-app cards
    sender: { type: String, required: true },
    text: { type: String, default: "" },
    kind: {
        type: String,
        enum: ["text", "interview", "test", "call", "nudge", "reminder", "status", "closed"],
        default: "text"
    },
    interview: { type: mongoose.Schema.Types.ObjectId, ref: "Interview", default: null },
    sentAt: { type: Date, default: Date.now }
});

// A chat is always read in time order, one match at a time
messageSchema.index({ match: 1, sentAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
