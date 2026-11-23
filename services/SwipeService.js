const Match = require("../domain/Match");
const AppError = require("../errors/AppError");

// Follows the "swipe to match" sequence diagram: save the swipe, look for the other side's swipe, maybe match
class SwipeService {
    #swipeRepository;
    #matchRepository;
    #jobRepository;
    #handlers;
    #notifier;

    // handlers: { role: SwipeHandler }. A new kind of user that can swipe is one more entry
    // in container.js; this class does not change (Open/Closed).
    constructor(swipeRepository, matchRepository, jobRepository, handlers, notifier) {
        this.#swipeRepository = swipeRepository;
        this.#matchRepository = matchRepository;
        this.#jobRepository = jobRepository;
        this.#handlers = handlers;
        this.#notifier = notifier;
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

        const handler = this.#handlers[user.getRole()];
        if (!handler) throw new AppError("Only seekers and companies can swipe", 403);
        const swipe = await handler.makeSwipe(user, job, body, now);

        const saved = await this.#swipeRepository.create(swipe);
        const other = await this.#swipeRepository.findOne(saved.getSeekerId(), saved.getJobId(), handler.otherSide);

        let match = null;
        if (saved.checkForMatch(other)) {
            match = await this.#matchRepository.createOrGet(new Match({
                seekerId: saved.getSeekerId(),
                jobId: saved.getJobId(),
                companyId: job.getCompanyId(),
                matchedAt: now
            }));
            // the other side may be online: their match list updates straight away
            this.#notifier.toMatch(match, "match:new", { matchId: match.getMatchId() });
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
}

module.exports = SwipeService;
