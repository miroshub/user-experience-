const view = require("../views/adminView");

// L11 admin dashboard. HTTP only: AdminService checks the admin role's tabs (FR-33).
class AdminController {
    #adminService;

    constructor(adminService) {
        this.#adminService = adminService;
    }

    // GET /api/admin/flags
    flags = async (req, res) => {
        res.json(view.presentFlags(await this.#adminService.flags(req.user)));
    };

    // POST /api/admin/flags/:id/dismiss
    dismissFlag = async (req, res) => {
        res.json(view.presentFlag(await this.#adminService.dismissFlag(req.user, req.params.id)));
    };

    // POST /api/admin/users/:id/warnings { reason, reviewId? }
    warn = async (req, res) => {
        const warning = await this.#adminService.warn(req.user, req.params.id, req.body);
        res.status(201).json(view.presentWarning(warning));
    };

    // POST /api/admin/users/:id/suspend
    suspend = async (req, res) => {
        const user = await this.#adminService.suspend(req.user, req.params.id);
        res.json(view.presentUsers([user]));
    };

    // GET /api/admin/warnings
    warnings = async (req, res) => {
        res.json(view.presentWarnings(await this.#adminService.warnings(req.user)));
    };

    // POST /api/admin/warnings/:id/fixed
    markFixed = async (req, res) => {
        res.json(view.presentWarning(await this.#adminService.markWarningFixed(req.user, req.params.id)));
    };

    // GET /api/admin/users?q=
    users = async (req, res) => {
        res.json(view.presentUsers(await this.#adminService.users(req.user, req.query.q || "")));
    };

    // GET /api/admin/reviews
    disputes = async (req, res) => {
        res.json(view.presentDisputes(await this.#adminService.disputedReviews(req.user)));
    };

    // POST /api/admin/reviews/:id { decision: "keep" | "remove" }
    moderate = async (req, res) => {
        await this.#adminService.moderateReview(req.user, req.params.id, req.body.decision);
        res.status(204).end();
    };

    // GET /api/admin/tickets
    inbox = async (req, res) => {
        res.json(view.presentInbox(await this.#adminService.inbox(req.user)));
    };

    // POST /api/admin/tickets/:id/reply { text }
    reply = async (req, res) => {
        res.json(view.presentTicket(await this.#adminService.replyTicket(req.user, req.params.id, req.body.text)));
    };

    // POST /api/admin/tickets/:id/close
    close = async (req, res) => {
        res.json(view.presentTicket(await this.#adminService.closeTicket(req.user, req.params.id)));
    };
}

module.exports = AdminController;
