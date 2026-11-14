const mongoose = require("mongoose");

const swipeSchema = new mongoose.Schema({
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    swipedBy: { type: String, enum: ["seeker", "company"], required: true },
    isInterested: { type: Boolean, required: true },
    isSpam: { type: Boolean, default: false },
    spamReasons: { type: [String], default: [] },
    swipedAt: { type: Date, default: Date.now }
});

// One swipe per side for each seeker + job pair: no double swipes, even if two requests race
swipeSchema.index({ swipedBy: 1, seeker: 1, job: 1 }, { unique: true });
// "my last swipe" (undo) and "Interested swipes today" (spam rule)
swipeSchema.index({ seeker: 1, swipedBy: 1, swipedAt: -1 });
// "who has the company already swiped on for this job"
swipeSchema.index({ job: 1, swipedBy: 1 });

module.exports = mongoose.model("Swipe", swipeSchema);
