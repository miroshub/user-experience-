const mongoose = require("mongoose");

// ERD table Warning. "expired" is not stored: it is an open warning past its deadline.
const warningSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // FR-43: optional, the review used as evidence
    review: { type: mongoose.Schema.Types.ObjectId, ref: "Review", default: null },
    reason: { type: String, required: true },
    deadline: { type: Date, required: true },
    status: { type: String, enum: ["open", "fixed"], default: "open" }
}, { timestamps: true });

// The Trust centre and the suspend check read one user's warnings
warningSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Warning", warningSchema);
