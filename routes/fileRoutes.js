const express = require("express");

function createFileRoutes(fileController, auth) {
    const router = express.Router();
    router.get("/api/files/:id", auth, fileController.getFile);
    return router;
}

module.exports = createFileRoutes;
