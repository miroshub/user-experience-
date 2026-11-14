const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    company: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    salaryMin: { type: Number, required: true },
    salaryMax: { type: Number, required: true },
    workMode: { type: String, enum: ["remote", "hybrid", "onsite"], required: true },
    city: { type: String, default: "" },
    skills: { type: [String], default: [] },
    description: { type: String, default: "" },
    imageUrl: { type: String, default: null },
    status: { type: String, enum: ["live", "paused", "closed"], default: "live" }
}, { timestamps: true });

// the swipe feed asks for "live jobs, newest first"; companies ask for "my jobs"
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ company: 1, createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
