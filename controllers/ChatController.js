const view = require("../views/messageView");

class ChatController {
    #chatService;

    constructor(chatService) {
        this.#chatService = chatService;
    }

    // GET /api/matches/:id/messages
    list = async (req, res) => {
        const messages = await this.#chatService.list(req.user, req.params.id);
        res.json(view.presentMessages(messages));
    };

    // POST /api/matches/:id/messages { text }
    send = async (req, res) => {
        const message = await this.#chatService.send(req.user, req.params.id, req.body?.text);
        res.status(201).json(view.presentMessage(message));
    };

    // POST /api/matches/:id/call, answers with the Jitsi link to open
    startCall = async (req, res) => {
        const link = await this.#chatService.startCall(req.user, req.params.id);
        res.json({ data: { link } });
    };
}

module.exports = ChatController;
