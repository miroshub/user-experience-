const view = require("../views/matchView");

class MatchController {
    #matchService;

    constructor(matchService) {
        this.#matchService = matchService;
    }

    // GET /api/matches
    list = async (req, res) => {
        const items = await this.#matchService.listForUser(req.user);
        res.json(view.presentMatches(items));
    };
}

module.exports = MatchController;
