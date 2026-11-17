const SwipeHandler = require("../../interfaces/SwipeHandler");
const AppError = require("../../errors/AppError");

function startOfDay(date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
}

// A seeker swipes on a job. Their Interested swipes are capped per day
// and go through the spam check (FR-18). Skipping is always free.
class SeekerSwipeHandler extends SwipeHandler {
    #swipeRepository;
    #spamChecker;
    #dailyInterestedLimit;

    constructor(swipeRepository, spamChecker, dailyInterestedLimit) {
        super();
        this.#swipeRepository = swipeRepository;
        this.#spamChecker = spamChecker;
        this.#dailyInterestedLimit = dailyInterestedLimit;
    }

    get otherSide() {
        return "company";
    }

    async makeSwipe(user, job, body, now) {
        if (!body.interested) return user.swipeOnJob(job, false);

        // undone swipes are deleted, so undo gives a seeker their swipe back
        const earlierToday = await this.#swipeRepository.countInterestedSince(user.getUserId(), startOfDay(now));
        if (earlierToday >= this.#dailyInterestedLimit) {
            throw new AppError(
                `You can say Interested to ${this.#dailyInterestedLimit} jobs a day. Come back tomorrow!`,
                429,
                "DAILY_LIMIT"
            );
        }

        const swipe = user.swipeOnJob(job, true);
        this.#flagIfSpam(user, swipe, now, earlierToday + 1);
        return swipe;
    }

    // FR-18: 2 or more rules hit = "Check later" for the company
    #flagIfSpam(user, swipe, now, interestedToday) {
        const result = this.#spamChecker.evaluate(user, { now, interestedToday });
        swipe.setIsSpam(result.flagged);
        swipe.setSpamReasons(result.reasons);
    }
}

module.exports = SeekerSwipeHandler;
