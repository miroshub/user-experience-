const express = require("express");
const { requireRole } = require("../middleware/auth");

// H7 Ask wuzzufny (FR-19 to FR-21). The AI key is only used on the server (NFR-04).
function createAiRoutes(assistantController, auth) {
    const router = express.Router();
    const seeker = [auth, requireRole("seeker")];

    router.get("/api/ai/chat", seeker, assistantController.open);
    router.post("/api/ai/chat", seeker, assistantController.ask);
    router.patch("/api/ai/filters", seeker, assistantController.setFilters);
    return router;
}

module.exports = createAiRoutes;
