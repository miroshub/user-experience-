const mongoose = require("mongoose");

// FR-26: the test lives inside the Interview document (DECISIONS), so no extra collection
const questionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correct: { type: Number, required: true }
}, { _id: false });

const interviewSchema = new mongoose.Schema({
    match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
    type: { type: String, enum: ["video", "in person", "test"], required: true },
    status: {
        type: String,
        enum: ["invited", "confirmed", "new time asked", "sent", "started", "done"],
        required: true
    },
    dateTime: { type: Date, default: null },
    link: { type: String, default: null },
    note: { type: String, default: "" },
    requestedTime: { type: Date, default: null },
    result: { type: String, default: null },
    title: { type: String, default: "" },
    questions: { type: [questionSchema], default: [] },
    answers: { type: [Number], default: [] },
    score: { type: Number, default: null },
    timeLimit: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    reminded: { type: Boolean, default: false }
});

interviewSchema.index({ match: 1 });
// the 10-minute reminder job looks for confirmed meetings starting soon that were not reminded yet
interviewSchema.index({ status: 1, reminded: 1, dateTime: 1 });

module.exports = mongoose.model("Interview", interviewSchema);
