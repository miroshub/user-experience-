const express = require("express");
const upload = require("../middleware/upload");

function createUserRoutes(userController, auth) {
    const router = express.Router();
    router.get("/api/users/me", auth, userController.getMe);
    router.patch("/api/users/me", auth, userController.updateMe);
    router.post("/api/users/me/verify", auth, upload.single("idDocument"), userController.verify);
    router.post("/api/users/me/logo", auth, upload.single("logo"), userController.uploadLogo);
    return router;
}

module.exports = createUserRoutes;
