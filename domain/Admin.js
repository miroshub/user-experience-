const User = require("./User");
const Warning = require("./Warning");
const AppError = require("../errors/AppError");

const ADMIN_ROLES = ["moderator", "support"];

// FR-33: each admin role only sees its own tabs on the dashboard
const TABS = {
    moderator: ["flags", "reviews", "warnings", "users"],
    support: ["inbox"]
};

class Admin extends User {
    #adminRole;

    constructor(data) {
        super({ ...data, role: "admin" });
        this.#adminRole = data.adminRole || "moderator";
    }

    getAdminRole() { return this.#adminRole; }
    setAdminRole(value) {
        if (!ADMIN_ROLES.includes(value)) throw new AppError("Admin role must be moderator or support", 400);
        this.#adminRole = value;
    }

    getProfileFields() {
        return { adminRole: this.#adminRole };
    }

    getTabs() {
        return [...TABS[this.#adminRole]];
    }

    // FR-33: the gate for every admin action
    requireTab(tab) {
        if (!this.getTabs().includes(tab)) throw new AppError("Your admin role cannot open this", 403);
    }

    // FR-35: a warning with a fix-by date 7 days from now. review: optional evidence (FR-43).
    sendWarning(user, reason, now = new Date(), review = null) {
        this.requireTab("flags");
        if (user.getRole() === "admin") throw new AppError("Admins cannot be warned", 400);
        const warning = new Warning({
            userId: user.getUserId(),
            adminId: this.getUserId(),
            reviewId: review ? review.getReviewId() : null,
            reason,
            createdAt: now
        });
        warning.validate();
        return warning;
    }

    // FR-36: only after one of this user's warnings has passed its fix-by date
    suspend(user, warnings, now = new Date()) {
        this.requireTab("flags");
        if (user.getAccountState() === "suspended") throw new AppError("This account is already suspended", 409);
        const expired = warnings.some(w => w.getUserId() === user.getUserId() && w.isExpired(now));
        if (!expired) {
            throw new AppError("Suspend only works after a warning has passed its 7-day fix-by date", 409, "NO_EXPIRED_WARNING");
        }
        user.setAccountState("suspended");
    }

    // FR-43: keep or remove a disputed review
    moderateReview(review, decision) {
        this.requireTab("reviews");
        review.moderate(decision);
    }
}

Admin.TABS = TABS;

module.exports = Admin;
