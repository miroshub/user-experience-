const view = require("../views/userView");

class AuthController {
    #authService;

    constructor(authService) {
        this.#authService = authService;
    }

    // POST /api/auth/signup
    signUp = async (req, res) => {
        const { user, token } = await this.#authService.signUp(req.body);
        res.status(201).json(view.presentAuth(user, token));
    };

    // POST /api/auth/login
    logIn = async (req, res) => {
        const { user, token } = await this.#authService.logIn(req.body);
        res.json(view.presentAuth(user, token));
    };

    // POST /api/auth/logout
    logOut = (req, res) => {
        req.user.logOut();
        res.status(204).send();
    };
}

module.exports = AuthController;
