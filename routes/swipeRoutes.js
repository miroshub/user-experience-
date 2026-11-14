const express = require("express");
const { requireRole } = require("../middleware/auth");

function createSwipeRoutes(swipeController, feedController, matchController, auth) {
    const router = express.Router();

    router.get("/api/feed/jobs", auth, requireRole("seeker"), feedController.jobs);
    router.get("/api/feed/candidates", auth, requireRole("company"), feedController.candidates);

    router.post("/api/swipes", auth, requireRole("seeker", "company"), swipeController.swipe);
    router.post("/api/swipes/undo", auth, requireRole("seeker"), swipeController.undo);

    router.get("/api/matches", auth, matchController.list);
    return router;
}

module.exports = createSwipeRoutes;
