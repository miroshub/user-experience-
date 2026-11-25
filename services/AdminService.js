const AppError = require("../errors/AppError");

// L11 admin dashboard (FR-33 to FR-37, FR-43). Each method starts with admin.requireTab(),
// so a support admin cannot use moderator actions and the other way round.
// The rules themselves (7-day deadline, suspend only after it) live in Admin and Warning.
class AdminService {
    #userRepository;
    #flagRepository;
    #warningRepository;
    #ticketRepository;
    #reviewRepository;
    #notifier;

    constructor(userRepository, flagRepository, warningRepository, ticketRepository, reviewRepository, notifier) {
        this.#userRepository = userRepository;
        this.#flagRepository = flagRepository;
        this.#warningRepository = warningRepository;
        this.#ticketRepository = ticketRepository;
        this.#reviewRepository = reviewRepository;
        this.#notifier = notifier;
    }

    // FR-34: open flags with the user, their warnings, and whether Suspend may be pressed (FR-36)
    async flags(admin, now = new Date()) {
        admin.requireTab("flags");
        const flags = await this.#flagRepository.findOpen();
        const userIds = [...new Set(flags.map(f => f.getUserId()))];
        const [users, warnings] = await Promise.all([
            this.#userRepository.findManyByIds(userIds),
            this.#warningRepository.findForUsers(userIds)
        ]);
        return flags.map(flag => {
            const user = users.find(u => u.getUserId() === flag.getUserId()) || null;
            const theirs = warnings.filter(w => w.getUserId() === flag.getUserId());
            return {
                flag,
                user,
                warnings: theirs,
                canSuspend: user !== null && user.getAccountState() === "active" && theirs.some(w => w.isExpired(now))
            };
        });
    }

    async dismissFlag(admin, flagId, now = new Date()) {
        admin.requireTab("flags");
        const flag = await this.#flagRepository.findById(flagId);
        if (!flag) throw new AppError("Flag not found", 404);
        flag.dismiss(admin.getUserId(), now);
        return this.#flagRepository.save(flag);
    }

    // FR-35 (and FR-43 with a review as evidence). The user gets a live notice for the Trust centre.
    async warn(admin, userId, body, now = new Date()) {
        const user = await this.#loadUser(userId);
        let review = null;
        if (body.reviewId) {
            review = await this.#reviewRepository.findById(body.reviewId);
            const linked = review && [review.getReviewerId(), review.getRevieweeId()].includes(user.getUserId());
            if (!linked) throw new AppError("That review is not about this user", 400);
        }
        const warning = await this.#warningRepository.create(admin.sendWarning(user, body.reason, now, review));
        this.#notifier.toUsers([user.getUserId()], "notice:new", {
            kind: "warning",
            text: `You have a warning. Please fix it within ${warning.daysLeft(now)} days.`
        });
        return warning;
    }

    async markWarningFixed(admin, warningId) {
        admin.requireTab("warnings");
        const warning = await this.#warningRepository.findById(warningId);
        if (!warning) throw new AppError("Warning not found", 404);
        warning.markFixed();
        return this.#warningRepository.save(warning);
    }

    // FR-36: refused unless a warning has passed its fix-by date; logs who did it
    async suspend(admin, userId, now = new Date()) {
        const user = await this.#loadUser(userId);
        const warnings = await this.#warningRepository.findForUser(user.getUserId());
        admin.suspend(user, warnings, now);
        return this.#userRepository.update(user, { suspendedBy: admin.getUserId(), suspendedAt: now });
    }

    // The Warnings tab, with who got each one
    async warnings(admin) {
        admin.requireTab("warnings");
        const warnings = await this.#warningRepository.findRecent();
        const users = await this.#userRepository.findManyByIds([...new Set(warnings.map(w => w.getUserId()))]);
        return { warnings, users };
    }

    // The Users tab: find an account by name, company or email
    async users(admin, text) {
        admin.requireTab("users");
        if (typeof text !== "string" || text.length > 50) throw new AppError("Search text is too long", 400);
        return this.#userRepository.search(text.trim(), 50);
    }

    // FR-43: the disputed reviews, with both people
    async disputedReviews(admin) {
        admin.requireTab("reviews");
        const reviews = await this.#reviewRepository.findDisputed();
        const ids = reviews.flatMap(r => [r.getReviewerId(), r.getRevieweeId()]);
        const users = await this.#userRepository.findManyByIds([...new Set(ids)]);
        return { reviews, users };
    }

    async moderateReview(admin, reviewId, decision) {
        const review = await this.#reviewRepository.findById(reviewId);
        if (!review) throw new AppError("Review not found", 404);
        admin.moderateReview(review, decision);
        return this.#reviewRepository.save(review);
    }

    // FR-37: the shared inbox, longest wait first
    async inbox(admin) {
        admin.requireTab("inbox");
        const tickets = await this.#ticketRepository.findOpenOldestFirst();
        const users = await this.#userRepository.findManyByIds([...new Set(tickets.map(t => t.getUserId()))]);
        return { tickets, users };
    }

    async replyTicket(admin, ticketId, text, now = new Date()) {
        const ticket = await this.#loadTicket(admin, ticketId);
        ticket.answer(admin.getUserId(), text, now);
        await this.#ticketRepository.save(ticket);
        this.#notifier.toUsers([ticket.getUserId()], "notice:new", { kind: "ticket", text: "Support replied to your message" });
        return ticket;
    }

    async closeTicket(admin, ticketId) {
        const ticket = await this.#loadTicket(admin, ticketId);
        ticket.close(admin.getUserId());
        return this.#ticketRepository.save(ticket);
    }

    async #loadTicket(admin, ticketId) {
        admin.requireTab("inbox");
        const ticket = await this.#ticketRepository.findById(ticketId);
        if (!ticket) throw new AppError("Ticket not found", 404);
        return ticket;
    }

    async #loadUser(userId) {
        const user = await this.#userRepository.findById(userId);
        if (!user || user.getAccountState() === "deleted") throw new AppError("User not found", 404);
        return user;
    }
}

module.exports = AdminService;
