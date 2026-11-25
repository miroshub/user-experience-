const express = require("express");
const createHealthRoutes = require("./routes/healthRoutes");
const createAuthRoutes = require("./routes/authRoutes");
const createUserRoutes = require("./routes/userRoutes");
const createFileRoutes = require("./routes/fileRoutes");
const createJobRoutes = require("./routes/jobRoutes");
const createSwipeRoutes = require("./routes/swipeRoutes");
const createMatchRoutes = require("./routes/matchRoutes");
const createCvRoutes = require("./routes/cvRoutes");
const createAiRoutes = require("./routes/aiRoutes");
const errorHandler = require("./middleware/errorHandler");

// Builds the Express app without starting it, so tests can use it with Supertest
function createApp(container) {
    const app = express();

    app.use(express.json());
    app.use(express.static("public"));
    app.get("/", (req, res) => res.redirect("/api-tester.html"));

    app.use(createHealthRoutes(container.healthController));
    app.use(createAuthRoutes(container.authController, container.auth));
    app.use(createUserRoutes(container.userController, container.auth));
    app.use(createFileRoutes(container.fileController, container.auth));
    app.use(createJobRoutes(container.jobController, container.auth));
    app.use(createSwipeRoutes(container.swipeController, container.feedController, container.auth));
    app.use(createMatchRoutes(container.matchController, container.chatController, container.interviewController, container.auth));

    app.use(createCvRoutes(container.cvController, container.auth));
    app.use(createAiRoutes(container.assistantController, container.auth));

    app.use((req, res) => res.status(404).json({ message: "Not found" }));
    app.use(errorHandler);
    return app;
}

module.exports = createApp;
