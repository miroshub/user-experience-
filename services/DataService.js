const crypto = require("crypto");
const AppError = require("../errors/AppError");

// FR-05 "Your data": see what is stored, download it as one JSON file, delete the account.
class DataService {
    #accountDataRepository;
    #userRepository;
    #matchRepository;
    #passwordHasher;
    #chatService;

    constructor(accountDataRepository, userRepository, matchRepository, passwordHasher, chatService) {
        this.#accountDataRepository = accountDataRepository;
        this.#userRepository = userRepository;
        this.#matchRepository = matchRepository;
        this.#passwordHasher = passwordHasher;
        this.#chatService = chatService;
    }

    summary(user) {
        this.#requireMember(user);
        return this.#accountDataRepository.counts(user.getUserId());
    }

    async exportData(user, profile, now = new Date()) {
        this.#requireMember(user);
        const data = await this.#accountDataRepository.collect(user.getUserId());
        return { exportedAt: now.toISOString(), profile, ...data };
    }

    // The password is asked again, so a borrowed phone cannot delete someone's account
    async deleteAccount(user, password, now = new Date()) {
        this.#requireMember(user);
        const hash = await this.#userRepository.findPasswordHash(user.getUserId());
        const ok = typeof password === "string" && hash && await this.#passwordHasher.compare(password, hash);
        if (!ok) throw new AppError("That password is not right", 400, "WRONG_PASSWORD");

        // Open matches are closed with a reason, so the other side is not left waiting (FR-29)
        for (const match of await this.#matchRepository.findForUser(user.getUserId())) {
            if (match.isClosed()) continue;
            match.close("Account deleted", now, match.sideOf(user.getUserId()));
            await this.#matchRepository.save(match);
            await this.#chatService.postNotice(match, "closed", "This account was deleted, so the match is closed.", null, now);
        }

        await this.#accountDataRepository.deleteOwnData(user.getUserId());
        user.anonymise();
        // nobody can log in with a random hash nobody knows
        const unusable = await this.#passwordHasher.hash(crypto.randomBytes(32).toString("hex"));
        await this.#userRepository.anonymise(user, unusable);
    }

    #requireMember(user) {
        if (user.getRole() === "admin") throw new AppError("Admin accounts are managed by the team", 403);
    }
}

module.exports = DataService;
