const view = require("../views/assistantView");

class AssistantController {
    #assistantService;

    constructor(assistantService) {
        this.#assistantService = assistantService;
    }

    // GET /api/ai/chat
    open = async (req, res) => {
        res.json(view.presentAssistant(await this.#assistantService.open(req.user)));
    };

    // POST /api/ai/chat  { text }
    ask = async (req, res) => {
        res.json(view.presentAssistant(await this.#assistantService.ask(req.user, req.body.text)));
    };

    // PATCH /api/ai/filters  { filters }
    setFilters = async (req, res) => {
        res.json(view.presentAssistant(await this.#assistantService.setFilters(req.user, req.body.filters)));
    };
}

module.exports = AssistantController;
