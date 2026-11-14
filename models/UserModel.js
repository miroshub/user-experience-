const mongoose = require("mongoose");

// One "users" collection. The role field decides which extra fields a document has (discriminators).
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    accountState: { type: String, enum: ["active", "suspended"], default: "active" },
    idDocumentId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { discriminatorKey: "role", timestamps: true });

// Unique only when the field exists, so email-only and phone-only accounts both work
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: "string" } } });

const UserModel = mongoose.model("User", userSchema);

const SeekerModel = UserModel.discriminator("seeker", new mongoose.Schema({
    headline: { type: String, default: "" },
    city: { type: String, default: "" },
    skills: { type: [String], default: [] }
}));

const CompanyModel = UserModel.discriminator("company", new mongoose.Schema({
    companyName: { type: String, default: "" },
    industry: { type: String, default: "" },
    location: { type: String, default: "" },
    size: { type: String, default: "" },
    about: { type: String, default: "" },
    logoId: { type: mongoose.Schema.Types.ObjectId, default: null }
}));

const AdminModel = UserModel.discriminator("admin", new mongoose.Schema({
    adminRole: { type: String, enum: ["moderator", "support"], required: true }
}));

module.exports = { UserModel, SeekerModel, CompanyModel, AdminModel };
