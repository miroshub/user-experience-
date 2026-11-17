const SwipeHandler = require("../../interfaces/SwipeHandler");
const AppError = require("../../errors/AppError");

// A company swipes on a seeker, for one of its jobs
class CompanySwipeHandler extends SwipeHandler {
    #userRepository;

    constructor(userRepository) {
        super();
        this.#userRepository = userRepository;
    }

    get otherSide() {
        return "seeker";
    }

    async makeSwipe(user, job, body) {
        const seeker = await this.#userRepository.findById(body.seekerId);
        if (!seeker) throw new AppError("Candidate not found", 404);
        return user.swipeOnSeeker(seeker, body.interested, job);
    }
}

module.exports = CompanySwipeHandler;
