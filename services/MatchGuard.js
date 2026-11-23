const AppError = require("../errors/AppError");

// NFR-03: only the two members of a match can read or change anything in it.
// Strangers get "not found", so they cannot even tell the match exists.
class MatchGuard {
    #matchRepository;

    constructor(matchRepository) {
        this.#matchRepository = matchRepository;
    }

    async load(user, matchId) {
        const match = await this.#matchRepository.findById(matchId);
        if (!match || !match.involves(user.getUserId())) throw new AppError("Match not found", 404);
        return match;
    }

    // Same check, plus the user must be on one side ("seeker" or "company")
    async loadAs(user, matchId, side) {
        const match = await this.load(user, matchId);
        if (match.sideOf(user.getUserId()) !== side) {
            const who = side === "company" ? "the company" : "the candidate";
            throw new AppError(`Only ${who} can do this`, 403);
        }
        return match;
    }
}

module.exports = MatchGuard;
