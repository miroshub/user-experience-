const express = require("express");
const upload = require("../middleware/upload");
const { requireRole } = require("../middleware/auth");

function createJobRoutes(jobController, auth) {
    const router = express.Router();
    const company = [auth, requireRole("company")];

    router.post("/api/jobs", company, jobController.create);
    router.get("/api/jobs/mine", company, jobController.listMine);
    router.get("/api/jobs/:id", auth, jobController.getOne);
    router.patch("/api/jobs/:id", company, jobController.edit);
    router.post("/api/jobs/:id/pause", company, jobController.pause);
    router.post("/api/jobs/:id/resume", company, jobController.resume);
    router.post("/api/jobs/:id/close", company, jobController.close);
    router.post("/api/jobs/:id/image", company, upload.single("image"), jobController.uploadImage);
    return router;
}

module.exports = createJobRoutes;
