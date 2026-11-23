const view = require("../views/matchView");

class MatchController {
    #matchService;

    constructor(matchService) {
        this.#matchService = matchService;
    }

    // GET /api/matches
    list = async (req, res) => {
        const items = await this.#matchService.listForUser(req.user);
        res.json(view.presentMatches(items, req.user));
    };

    // GET /api/matches/:id
    getOne = async (req, res) => {
        const detail = await this.#matchService.getOne(req.user, req.params.id);
        res.json(view.presentMatchDetail(detail));
    };

    // POST /api/matches/:id/status { status: "offer" | "hired" }
    moveStatus = async (req, res) => {
        const match = await this.#matchService.moveStatus(req.user, req.params.id, req.body?.status);
        res.json(view.presentMatch(match));
    };

    // POST /api/matches/:id/close { reason }
    close = async (req, res) => {
        const match = await this.#matchService.close(req.user, req.params.id, req.body?.reason);
        res.json(view.presentMatch(match));
    };
}

module.exports = MatchController;
