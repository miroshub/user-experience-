const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["matched", "chatting", "interview", "offer", "hired", "closed"],
        default: "matched"
    },
    matchedAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    closeReason: { type: String, default: null }
});

// One match per seeker + job, even if both sides press Interested at the same moment
matchSchema.index({ seeker: 1, job: 1 }, { unique: true });
matchSchema.index({ seeker: 1, lastActivity: -1 });
matchSchema.index({ company: 1, lastActivity: -1 });

module.exports = mongoose.model("Match", matchSchema);
