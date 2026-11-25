const view = require("../views/trustView");
const { userToJson } = require("../views/userView");

// H8 Trust centre: health, warnings, support (FR-06, FR-07) and "Your data" (FR-05)
class TrustController {
    #trustService;
    #dataService;

    constructor(trustService, dataService) {
        this.#trustService = trustService;
        this.#dataService = dataService;
    }

    // GET /api/trust
    overview = async (req, res) => {
        const overview = await this.#trustService.overview(req.user);
        res.json(view.presentOverview(req.user, overview));
    };

    // POST /api/trust/tickets { topic, message }
    contactSupport = async (req, res) => {
        const ticket = await this.#trustService.contactSupport(req.user, req.body);
        res.status(201).json(view.presentTicket(ticket, this.#trustService.replyPromise));
    };

    // GET /api/me/data, the numbers on the "Your data" page
    dataSummary = async (req, res) => {
        res.json({ data: await this.#dataService.summary(req.user) });
    };

    // GET /api/me/data/download, one JSON file
    downloadData = async (req, res) => {
        const data = await this.#dataService.exportData(req.user, userToJson(req.user));
        res.set("Content-Disposition", 'attachment; filename="wuzzufny-my-data.json"');
        res.json(data);
    };

    // DELETE /api/me { password }
    deleteAccount = async (req, res) => {
        await this.#dataService.deleteAccount(req.user, req.body.password);
        res.status(204).end();
    };
}

module.exports = TrustController;
