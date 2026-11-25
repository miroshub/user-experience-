const FlagRule = require("../../interfaces/FlagRule");

// FR-42: an average under 2 stars, from at least 5 reviews
class LowAverageRule extends FlagRule {
    #maxAverage;
    #minReviews;

    constructor(maxAverage = 2, minReviews = 5) {
        super();
        this.#maxAverage = maxAverage;
        this.#minReviews = minReviews;
    }

    get reason() {
        return `Average under ${this.#maxAverage} stars from ${this.#minReviews}+ reviews`;
    }

    isHit(user, data) {
        const reviews = data.reviews;
        if (reviews.length < this.#minReviews) return false;
        const total = reviews.reduce((sum, r) => sum + r.getStars(), 0);
        return total / reviews.length < this.#maxAverage;
    }
}

module.exports = LowAverageRule;
