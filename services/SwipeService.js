const Match = require("../domain/Match");
const AppError = require("../errors/AppError");

function startOfDay(date) {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
}

// Follows the "swipe to match" sequence diagram: save the swipe, look for the other side's swipe, maybe match
class SwipeService {
    #swipeRepository;
    #matchRepository;
    #jobRepository;
    #userRepository;
    #spamChecker;

    constructor(swipeRepository, matchRepository, jobRepository, userRepository, spamChecker) {
        this.#swipeRepository = swipeRepository;
        this.#matchRepository = matchRepository;
        this.#jobRepository = jobRepository;
        this.#userRepository = userRepository;
        this.#spamChecker = spamChecker;
    }

    // body: { jobId, interested } from a seeker, or { jobId, seekerId, interested } from a company
    async swipe(user, body, now = new Date()) {
        if (!body || typeof body.interested !== "boolean") {
            throw new AppError("Send interested: true or false", 400);
        }
        const job = await this.#jobRepository.findById(body.jobId);
        if (!job) throw new AppError("Job not found", 404);

        // FR-03: browsing is free, ID is asked for the first time someone says Interested
        if (body.interested && !user.getIsVerified()) {
            throw new AppError("Please verify your ID before saying you're interested", 403, "VERIFY_REQUIRED");
        }

        let swipe;
        let otherSide;
        if (user.getRole() === "seeker") {
            swipe = user.swipeOnJob(job, body.interested);
            if (body.interested) await this.#flagIfSpam(user, swipe, now);
            otherSide = "company";
        } else if (user.getRole() === "company") {
            const seeker = await this.#userRepository.findById(body.seekerId);
            if (!seeker) throw new AppError("Candidate not found", 404);
            swipe = user.swipeOnSeeker(seeker, body.interested, job);
            otherSide = "seeker";
        } else {
            throw new AppError("Only seekers and companies can swipe", 403);
        }

        const saved = await this.#swipeRepository.create(swipe);
        const other = await this.#swipeRepository.findOne(saved.getSeekerId(), saved.getJobId(), otherSide);

        let match = null;
        if (saved.checkForMatch(other)) {
            match = await this.#matchRepository.createOrGet(new Match({
                seekerId: saved.getSeekerId(),
                jobId: saved.getJobId(),
                companyId: job.getCompanyId(),
                matchedAt: now
            }));
        }
        return { swipe: saved, match, job };
    }

    // FR-14: take back the last swipe, unless it already made a match
    async undo(user) {
        if (user.getRole() !== "seeker") throw new AppError("Only seekers can undo a swipe", 403);
        const last = await this.#swipeRepository.findLastBySeeker(user.getUserId());
        if (!last) throw new AppError("Nothing to undo", 404);

        const match = await this.#matchRepository.findBySeekerAndJob(last.getSeekerId(), last.getJobId());
        if (match) throw new AppError("You matched on this job, so it cannot be undone", 409);

        await this.#swipeRepository.remove(last.getSwipeId());
        return this.#jobRepository.findById(last.getJobId());
    }

    // FR-18: 2 or more rules hit = "Check later" for the company
    async #flagIfSpam(user, swipe, now) {
        const earlierToday = await this.#swipeRepository.countInterestedSince(user.getUserId(), startOfDay(now));
        const result = this.#spamChecker.evaluate(user, { now, interestedToday: earlierToday + 1 });
        swipe.setIsSpam(result.flagged);
        swipe.setSpamReasons(result.reasons);
    }
}

module.exports = SwipeService;
