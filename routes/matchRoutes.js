const express = require("express");
const { requireRole } = require("../middleware/auth");

// H4 and H5: matches, chat, interviews and tests. The services check that the user
// is one of the two members of the match (NFR-03); the roles here are the first gate.
function createMatchRoutes(matchController, chatController, interviewController, auth) {
    const router = express.Router();
    const member = [auth, requireRole("seeker", "company")];
    const company = [auth, requireRole("company")];
    const seeker = [auth, requireRole("seeker")];

    router.get("/api/matches", member, matchController.list);
    router.get("/api/matches/:id", member, matchController.getOne);
    router.post("/api/matches/:id/status", company, matchController.moveStatus);
    router.post("/api/matches/:id/close", member, matchController.close);

    router.get("/api/matches/:id/messages", member, chatController.list);
    router.post("/api/matches/:id/messages", member, chatController.send);
    router.post("/api/matches/:id/call", member, chatController.startCall);

    router.get("/api/matches/:id/slots", member, interviewController.slots);
    router.post("/api/matches/:id/interviews", company, interviewController.book);
    router.post("/api/matches/:id/tests", company, interviewController.sendTest);
    router.post("/api/interviews/:id/accept", seeker, interviewController.accept);
    router.post("/api/interviews/:id/new-time", seeker, interviewController.askNewTime);
    router.post("/api/interviews/:id/reschedule", company, interviewController.reschedule);
    router.post("/api/interviews/:id/start", seeker, interviewController.startTest);
    router.post("/api/interviews/:id/submit", seeker, interviewController.submitTest);
    return router;
}

module.exports = createMatchRoutes;
