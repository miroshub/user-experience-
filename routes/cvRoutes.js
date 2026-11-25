const express = require("express");
const upload = require("../middleware/upload");
const { requireRole } = require("../middleware/auth");

// H6 My CV (FR-08 to FR-10). Seekers only; each seeker only ever sees their own CV.
function createCvRoutes(cvController, auth) {
    const router = express.Router();
    const seeker = [auth, requireRole("seeker")];

    router.get("/api/cv", seeker, cvController.get);
    router.patch("/api/cv", seeker, cvController.update);
    router.post("/api/cv/fixes", seeker, cvController.fix);
    router.post("/api/cv/pdf", seeker, upload.single("cv"), cvController.uploadPdf);
    router.get("/api/cv/export", seeker, cvController.exportPdf);
    return router;
}

module.exports = createCvRoutes;
