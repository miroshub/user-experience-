const Review = require("../domain/Review");
const AppError = require("../errors/AppError");

const DAY_MS = 24 * 60 * 60 * 1000;
const FLAG_WINDOW_DAYS = 30;

// FR-38 to FR-42 and NFR-08 (integrity): who may review, the blind reveal, replies,
// disputes, ratings on cards, and the daily review flag check.
class ReviewService {
    #reviewRepository;
    #interviewRepository;
    #userRepository;
    #matchGuard;
    #reviewFlagChecker;
    #flagService;
    #notifier;

    constructor(reviewRepository, interviewRepository, userRepository, matchGuard, reviewFlagChecker, flagService, notifier) {
        this.#reviewRepository = reviewRepository;
        this.#interviewRepository = interviewRepository;
        this.#userRepository = userRepository;
        this.#matchGuard = matchGuard;
        this.#reviewFlagChecker = reviewFlagChecker;
        this.#flagService = flagService;
        this.#notifier = notifier;
    }

    // The review box under a match: can I review, my review, and theirs once it is revealed
    async forMatch(user, matchId, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        const me = user.getUserId();
        const reviews = await this.#reviewRepository.findForMatch(match.getMatchId());
        const mine = reviews.find(r => r.getReviewerId() === me) || null;
        const theirs = reviews.find(r => r.getRevieweeId() === me) || null;
        return {
            canReview: !mine && await this.#isReviewable(match, now),
            mine,
            // NFR-08: their review stays blind while it is hidden
            theirs: theirs && theirs.getStatus() !== "hidden" && theirs.getStatus() !== "removed" ? theirs : null,
            theyReviewed: theirs !== null
        };
    }

    // FR-38 + NFR-08: a member of the match, after an interview with a result or a closed match, once
    async submit(user, matchId, body, now = new Date()) {
        const match = await this.#matchGuard.load(user, matchId);
        if (!await this.#isReviewable(match, now)) {
            throw new AppError("You can leave a review after an interview or once the match is closed", 409, "TOO_EARLY");
        }
        const side = match.sideOf(user.getUserId());
        const review = new Review({
            matchId: match.getMatchId(),
            reviewerId: user.getUserId(),
            revieweeId: side === "seeker" ? match.getCompanyId() : match.getSeekerId(),
            stars: body.stars,
            tags: Array.isArray(body.tags) ? body.tags : [],
            comment: body.comment || "",
            createdAt: now
        });
        review.submit();
        const saved = await this.#reviewRepository.create(review);

        // Both sides have posted: show both at once (blind until both post)
        const other = (await this.#reviewRepository.findForMatch(match.getMatchId()))
            .find(r => r.getReviewerId() === saved.getRevieweeId());
        if (other) {
            for (const r of [saved, other]) {
                r.reveal();
                await this.#reviewRepository.save(r);
            }
        }
        this.#notifier.toUsers([saved.getRevieweeId()], "notice:new", {
            matchId: match.getMatchId(),
            text: other ? "Both reviews are now visible" : "You got a review. It shows once you post yours, or in 14 days."
        });
        return saved;
    }

    // FR-40
    async reply(user, reviewId, text) {
        const review = await this.#loadAbout(user, reviewId);
        review.addReply(user.getUserId(), text);
        return this.#reviewRepository.save(review);
    }

    // FR-41
    async dispute(user, reviewId) {
        const review = await this.#loadAbout(user, reviewId);
        review.dispute(user.getUserId());
        return this.#reviewRepository.save(review);
    }

    // FR-39: a profile's reviews, with the people who wrote them
    async aboutUser(userId) {
        const user = await this.#userRepository.findById(userId);
        if (!user || user.getRole() === "admin") throw new AppError("User not found", 404);
        const reviews = await this.#reviewRepository.findVisibleAbout(userId);
        const reviewers = await this.#userRepository.findManyByIds(reviews.map(r => r.getReviewerId()));
        const ratings = await this.#reviewRepository.ratingsFor([userId]);
        return { user, reviews, reviewers, rating: ratings.get(userId) || null };
    }

    // FR-39: for the swipe cards. A Map of user id → { average, count }.
    ratingsFor(userIds) {
        return this.#reviewRepository.ratingsFor(userIds);
    }

    // Daily job: hidden for 14 days → visible. Returns how many were revealed.
    async revealExpired(now = new Date()) {
        const cutoff = new Date(now.getTime() - Review.REVEAL_DAYS * DAY_MS);
        const due = await this.#reviewRepository.findHiddenBefore(cutoff);
        for (const review of due) {
            review.reveal();
            await this.#reviewRepository.save(review);
        }
        return due.length;
    }

    // Daily job, FR-42: flag accounts with bad reviews. No warning is sent automatically.
    async checkFlags(now = new Date()) {
        const since = new Date(now.getTime() - FLAG_WINDOW_DAYS * DAY_MS);
        const userIds = await this.#reviewRepository.findRecentReviewees(since);
        let raised = 0;
        for (const userId of userIds) {
            const user = await this.#userRepository.findById(userId);
            if (!user) continue;
            const reviews = await this.#reviewRepository.findCountingAbout(userId);
            const result = this.#reviewFlagChecker.evaluate(user, { now, reviews });
            if (!result.flagged) continue;
            const newest = new Date(Math.max(...reviews.map(r => r.getCreatedAt().getTime())));
            if (await this.#flagService.raise(userId, "review", result.reasons, now, newest)) raised++;
        }
        return raised;
    }

    // Only the reviewed person acts on a review; anyone else gets "not found"
    async #loadAbout(user, reviewId) {
        const review = await this.#reviewRepository.findById(reviewId);
        if (!review || review.getRevieweeId() !== user.getUserId()) throw new AppError("Review not found", 404);
        return review;
    }

    async #isReviewable(match, now) {
        if (match.isClosed()) return true;
        const interviews = await this.#interviewRepository.findForMatches([match.getMatchId()]);
        return interviews.some(i => i.hasHappened(now));
    }
}

module.exports = ReviewService;
