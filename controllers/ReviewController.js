const view = require("../views/reviewView");

class ReviewController {
    #reviewService;

    constructor(reviewService) {
        this.#reviewService = reviewService;
    }

    // GET /api/matches/:id/reviews
    forMatch = async (req, res) => {
        const result = await this.#reviewService.forMatch(req.user, req.params.id);
        res.json(view.presentMatchReviews(result));
    };

    // POST /api/matches/:id/reviews { stars, tags, comment }
    submit = async (req, res) => {
        const review = await this.#reviewService.submit(req.user, req.params.id, req.body);
        res.status(201).json(view.presentReview(review));
    };

    // POST /api/reviews/:id/reply { text }
    reply = async (req, res) => {
        const review = await this.#reviewService.reply(req.user, req.params.id, req.body.text);
        res.json(view.presentReview(review));
    };

    // POST /api/reviews/:id/dispute
    dispute = async (req, res) => {
        const review = await this.#reviewService.dispute(req.user, req.params.id);
        res.json(view.presentReview(review));
    };

    // GET /api/users/:id/reviews
    aboutUser = async (req, res) => {
        const result = await this.#reviewService.aboutUser(req.params.id);
        res.json(view.presentProfileReviews(result));
    };
}

module.exports = ReviewController;
