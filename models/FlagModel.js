const mongoose = require("mongoose");

// FR-34: the moderator flag list. Not in the Milestone 1 ERD (added in Phase 5).
const flagSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["spam", "review"], required: true },
    reasons: { type: [String], default: [] },
    status: { type: String, enum: ["open", "dismissed"], default: "open" },
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dismissedAt: { type: Date, default: null }
}, { timestamps: true });

// The moderator's list (open flags, newest first) and "does this user already have an open one"
flagSchema.index({ status: 1, createdAt: -1 });
flagSchema.index({ user: 1, source: 1, createdAt: -1 });

module.exports = mongoose.model("Flag", flagSchema);
