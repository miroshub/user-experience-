const express = require("express");
const { requireRole } = require("../middleware/auth");

// FR-33: only admin accounts get past requireRole("admin"); AdminService then checks
// that the admin's role (moderator or support) has the tab for each action.
function createAdminRoutes(adminController, auth) {
    const router = express.Router();
    const admin = [auth, requireRole("admin")];

    router.get("/api/admin/flags", admin, adminController.flags);
    router.post("/api/admin/flags/:id/dismiss", admin, adminController.dismissFlag);
    router.post("/api/admin/users/:id/warnings", admin, adminController.warn);
    router.post("/api/admin/users/:id/suspend", admin, adminController.suspend);
    router.get("/api/admin/users", admin, adminController.users);
    router.get("/api/admin/warnings", admin, adminController.warnings);
    router.post("/api/admin/warnings/:id/fixed", admin, adminController.markFixed);
    router.get("/api/admin/reviews", admin, adminController.disputes);
    router.post("/api/admin/reviews/:id", admin, adminController.moderate);
    router.get("/api/admin/tickets", admin, adminController.inbox);
    router.post("/api/admin/tickets/:id/reply", admin, adminController.reply);
    router.post("/api/admin/tickets/:id/close", admin, adminController.close);
    return router;
}

module.exports = createAdminRoutes;
