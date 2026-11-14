const AppError = require("../errors/AppError");

// Checks the "Authorization: Bearer <token>" header and puts the logged-in user on req.user
function createAuthMiddleware(tokenService, userRepository) {
    return async function auth(req, res, next) {
        const header = req.get("Authorization") || "";
        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token) throw new AppError("Please log in", 401);

        const payload = tokenService.verify(token);
        if (!payload) throw new AppError("Your session has ended, please log in again", 401);

        // load the user every time, so a suspension takes effect straight away
        const user = await userRepository.findById(payload.sub);
        if (!user) throw new AppError("Please log in", 401);
        user.logIn();

        req.user = user;
        next();
    };
}

function requireRole(...roles) {
    return function (req, res, next) {
        if (!roles.includes(req.user.getRole())) {
            throw new AppError("You do not have access to this", 403);
        }
        next();
    };
}

module.exports = { createAuthMiddleware, requireRole };
