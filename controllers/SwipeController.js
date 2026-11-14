const matchView = require("../views/matchView");
const jobView = require("../views/jobView");

class SwipeController {
    #swipeService;

    constructor(swipeService) {
        this.#swipeService = swipeService;
    }

    // POST /api/swipes
    swipe = async (req, res) => {
        const result = await this.#swipeService.swipe(req.user, req.body);
        res.status(201).json(matchView.presentSwipeResult(result));
    };

    // POST /api/swipes/undo, answers with the job so the card can be shown again
    undo = async (req, res) => {
        const job = await this.#swipeService.undo(req.user);
        res.json(job ? jobView.presentJob(job) : { data: null });
    };
}

module.exports = SwipeController;
