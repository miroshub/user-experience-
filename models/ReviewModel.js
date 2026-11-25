const mongoose = require("mongoose");

// ERD table Review. reviewer and reviewee are two separate User links (the agreed fix to
// the single "writes / receives" line).
const reviewSchema = new mongoose.Schema({
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    stars: { type: Number, min: 1, max: 5, required: true },
    tags: { type: [String], default: [] },
    comment: { type: String, default: "", maxlength: 300 },
    reply: { type: String, default: null },
    status: { type: String, enum: ["hidden", "visible", "disputed", "removed"], default: "hidden" }
}, { timestamps: true });

// NFR-08: one review per side per match, even if two requests race
reviewSchema.index({ match: 1, reviewer: 1 }, { unique: true });
// FR-42: "this person's reviews in the last 30 days"
reviewSchema.index({ reviewee: 1, createdAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
