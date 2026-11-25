const AppError = require("../errors/AppError");
const SupportTicket = require("./SupportTicket");

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
    // H8: "Verified once on 12 Oct. You won't be asked again."
    #verifiedAt;

    constructor(data) {
        this.#userId = data.userId || null;
        this.#fullName = data.fullName;
        this.#email = data.email ? data.email.trim().toLowerCase() : null;
        this.#phone = data.phone ? data.phone.trim() : null;
        this.#role = data.role;
        this.#isVerified = data.isVerified === true;
        this.#accountState = data.accountState || "active";
        this.#createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.#verifiedAt = data.verifiedAt ? new Date(data.verifiedAt) : null;
    }

    getVerifiedAt() { return this.#verifiedAt; }

    // FR-03 / FR-04: verified once, with the date it happened
    markVerified(now = new Date()) {
        this.#isVerified = true;
        this.#verifiedAt = now;
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
        if (this.#accountState === "deleted") throw new AppError("Please log in", 401);
        if (this.#accountState === "suspended") {
            throw new AppError("This account is suspended", 403);
        }
    }

    // FR-06: every kind of user can write to support (class diagram: contactSupport())
    contactSupport(topic, message, now = new Date()) {
        const ticket = new SupportTicket({ userId: this.#userId, topic, message, createdAt: now });
        ticket.validate();
        return ticket;
    }

    // FR-05: the account stays only as "Deleted user", so the other side's chats still make sense.
    // Contact details and profile fields are wiped; subclasses clear their own fields.
    anonymise() {
        this.#fullName = "Deleted user";
        this.#email = null;
        this.#phone = null;
        this.#isVerified = false;
        this.#verifiedAt = null;
        this.#accountState = "deleted";
        this.clearProfile();
    }

    clearProfile() {}

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
