const ChatService = require("../services/ChatService");

// A review as others see it. Hidden reviews are never sent to the reviewed person (NFR-08).
function reviewToJson(review, reviewer = null) {
    return {
        id: review.getReviewId(),
        matchId: review.getMatchId(),
        reviewerId: review.getReviewerId(),
        revieweeId: review.getRevieweeId(),
        reviewerName: reviewer ? ChatService.nameOf(reviewer) : null,
        stars: review.getStars(),
        tags: review.getTags(),
        serious: review.isSerious(),
        comment: review.getComment(),
        reply: review.getReply(),
        status: review.getStatus(),
        createdAt: review.getCreatedAt()
    };
}

function presentReview(review) {
    return { data: reviewToJson(review) };
}

function presentMatchReviews({ canReview, mine, theirs, theyReviewed }) {
    return {
        data: {
            canReview,
            mine: mine ? reviewToJson(mine) : null,
            theirs: theirs ? reviewToJson(theirs) : null,
            theyReviewed
        }
    };
}

function presentProfileReviews({ user, reviews, reviewers, rating }) {
    return {
        data: {
            userId: user.getUserId(),
            name: ChatService.nameOf(user),
            rating,
            reviews: reviews.map(r => reviewToJson(r, reviewers.find(u => u.getUserId() === r.getReviewerId())))
        }
    };
}

module.exports = { reviewToJson, presentReview, presentMatchReviews, presentProfileReviews };
