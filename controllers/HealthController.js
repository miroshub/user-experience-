const view = require("../views/healthView");

class HealthController {
    #healthService;

    constructor(healthService) {
        this.#healthService = healthService;
    }

    // GET /api/health
    getHealth = (req, res) => {
        const result = this.#healthService.check();
        const status = result.database === "connected" ? 200 : 503;
        res.status(status).json(view.presentHealth(result));
    };
}

module.exports = HealthController;
