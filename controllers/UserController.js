const view = require("../views/userView");

class UserController {
    #userService;

    constructor(userService) {
        this.#userService = userService;
    }

    // GET /api/users/me
    getMe = (req, res) => {
        res.json(view.presentUser(req.user));
    };

    // PATCH /api/users/me
    updateMe = async (req, res) => {
        const user = await this.#userService.updateProfile(req.user, req.body);
        res.json(view.presentUser(user));
    };

    // POST /api/users/me/verify (form field "idDocument")
    verify = async (req, res) => {
        const user = await this.#userService.verifyIdentity(req.user, req.file);
        res.json(view.presentUser(user));
    };

    // POST /api/users/me/logo (form field "logo")
    uploadLogo = async (req, res) => {
        const user = await this.#userService.uploadLogo(req.user, req.file);
        res.json(view.presentUser(user));
    };
}

module.exports = UserController;
