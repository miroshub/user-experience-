const FlagRule = require("../../interfaces/FlagRule");

const DAY_MS = 24 * 60 * 60 * 1000;

// FR-42: 3 or more reviews with a serious tag (Ghosted, No-show, Fake) in the last 30 days
class SeriousTagsRule extends FlagRule {
    #minReviews;
    #days;

    constructor(minReviews = 3, days = 30) {
        super();
        this.#minReviews = minReviews;
        this.#days = days;
    }

    get reason() {
        return `${this.#minReviews}+ serious-tag reviews in ${this.#days} days`;
    }

    // data.reviews: the reviews that count (not disputed, not removed)
    isHit(user, data) {
        const since = data.now.getTime() - this.#days * DAY_MS;
        const serious = data.reviews.filter(r => r.isSerious() && r.getCreatedAt().getTime() >= since);
        return serious.length >= this.#minReviews;
    }
}

module.exports = SeriousTagsRule;
