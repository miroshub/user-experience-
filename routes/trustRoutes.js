const express = require("express");
const { requireRole } = require("../middleware/auth");

// H8 Trust centre and reviews (FR-05 to FR-07, FR-38 to FR-41)
function createTrustRoutes(trustController, reviewController, auth) {
    const router = express.Router();
    const member = [auth, requireRole("seeker", "company")];

    router.get("/api/trust", member, trustController.overview);
    router.post("/api/trust/tickets", member, trustController.contactSupport);
    router.get("/api/me/data", member, trustController.dataSummary);
    router.get("/api/me/data/download", member, trustController.downloadData);
    router.delete("/api/me", member, trustController.deleteAccount);

    router.get("/api/matches/:id/reviews", member, reviewController.forMatch);
    router.post("/api/matches/:id/reviews", member, reviewController.submit);
    router.post("/api/reviews/:id/reply", member, reviewController.reply);
    router.post("/api/reviews/:id/dispute", member, reviewController.dispute);
    router.get("/api/users/:id/reviews", auth, reviewController.aboutUser);
    return router;
}

module.exports = createTrustRoutes;
