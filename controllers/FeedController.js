const view = require("../views/jobView");

class FeedController {
    #feedService;

    constructor(feedService) {
        this.#feedService = feedService;
    }

    // GET /api/feed/jobs?role=&city=&workMode=&minSalary=&limit=
    jobs = async (req, res) => {
        const items = await this.#feedService.jobsForSeeker(req.user, req.query);
        res.json(view.presentJobCards(items));
    };

    // GET /api/feed/candidates?jobId=&limit=
    candidates = async (req, res) => {
        const result = await this.#feedService.candidatesForJob(req.user, req.query);
        res.json(view.presentCandidates(result));
    };
}

module.exports = FeedController;
