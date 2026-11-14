const express = require("express");

function createAuthRoutes(authController, auth) {
    const router = express.Router();
    router.post("/api/auth/signup", authController.signUp);
    router.post("/api/auth/login", authController.logIn);
    router.post("/api/auth/logout", auth, authController.logOut);
    return router;
}

module.exports = createAuthRoutes;
