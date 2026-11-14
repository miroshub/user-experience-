const AppError = require("../errors/AppError");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;

function isText(value) {
    return typeof value === "string" && value.trim() !== "";
}

// Parent class from the class diagram. JobSeeker, Company and Admin extend it.
// No password here: only AuthService and UserRepository ever see the hash.
class User {
    #userId;
    #fullName;
    #email;
    #phone;
    #role;
    #isVerified;
    #accountState;
    #createdAt;

    constructor(data) {
        this.#userId = data.userId || null;
        this.#fullName = data.fullName;
        this.#email = data.email ? data.email.trim().toLowerCase() : null;
        this.#phone = data.phone ? data.phone.trim() : null;
        this.#role = data.role;
        this.#isVerified = data.isVerified === true;
        this.#accountState = data.accountState || "active";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : null;
    }

    // not in the class diagram: the spam rule "account less than 1 day old" (FR-18) needs it
    getCreatedAt() { return this.#createdAt; }

    getUserId() { return this.#userId; }
    setUserId(value) { this.#userId = value; }

    getFullName() { return this.#fullName; }
    setFullName(value) {
        if (!isText(value)) throw new AppError("Full name cannot be empty", 400);
        this.#fullName = value.trim();
    }

    getEmail() { return this.#email; }
    setEmail(value) { this.#email = value; }

    getPhone() { return this.#phone; }
    setPhone(value) { this.#phone = value; }

    getRole() { return this.#role; }
    setRole(value) { this.#role = value; }

    getIsVerified() { return this.#isVerified; }
    setIsVerified(value) { this.#isVerified = value; }

    getAccountState() { return this.#accountState; }
    setAccountState(value) { this.#accountState = value; }

    // The pure part of sign-up: are the account details valid? Saving is AuthService's job.
    signUp() {
        if (!isText(this.#fullName)) throw new AppError("Full name is required", 400);
        if (!this.#email && !this.#phone) throw new AppError("Email or phone number is required", 400);
        if (this.#email && !EMAIL_PATTERN.test(this.#email)) throw new AppError("Email address is not valid", 400);
        if (this.#phone && !PHONE_PATTERN.test(this.#phone)) throw new AppError("Phone number is not valid", 400);
        this.#fullName = this.#fullName.trim();
    }

    // The pure part of log-in: AuthService has already checked the password,
    // here the account itself must be allowed in
    logIn() {
        if (this.#accountState === "suspended") {
            throw new AppError("This account is suspended", 403);
        }
    }

    // Tokens are not stored on the server, so logging out only means the client forgets its token
    logOut() {
        return true;
    }

    // Fields that only some kinds of user have. Subclasses add theirs.
    getProfileFields() {
        return {};
    }

    getEditableFields() {
        return ["fullName"];
    }

    applyProfileChanges(changes) {
        const allowed = this.getEditableFields();
        for (const key of Object.keys(changes)) {
            if (!allowed.includes(key)) throw new AppError(`"${key}" cannot be changed here`, 400);
        }
        if ("fullName" in changes) this.setFullName(changes.fullName);
    }
}

module.exports = User;
