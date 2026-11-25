const mongoose = require("mongoose");

// ERD table CV. One CV per seeker, so seeker is unique.
// Skills are not stored here: they live on the seeker (users collection).
const roleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    company: { type: String, default: "" },
    startDate: { type: String, default: "" },
    endDate: { type: String, default: "" },
    bullets: { type: [String], default: [] }
}, { _id: false });

const schoolSchema = new mongoose.Schema({
    degree: { type: String, default: "" },
    school: { type: String, default: "" },
    startYear: { type: String, default: "" },
    endYear: { type: String, default: "" }
}, { _id: false });

const cvSchema = new mongoose.Schema({
    seeker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    summary: { type: String, default: "" },
    experience: { type: [roleSchema], default: [] },
    education: { type: [schoolSchema], default: [] },
    atsScore: { type: Number, default: 0 },
    pdfFileId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { timestamps: true });

module.exports = mongoose.model("CV", cvSchema);
