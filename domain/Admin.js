const User = require("./User");
const AppError = require("../errors/AppError");

const ADMIN_ROLES = ["moderator", "support"];

// reviewFlags, sendWarning
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
}

module.exports = Admin;
