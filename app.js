const express = require("express");
const createHealthRoutes = require("./routes/healthRoutes");
const errorHandler = require("./middleware/errorHandler");

// Builds the Express app without starting it, so tests can use it with Supertest
function createApp(container) {
    const app = express();

    app.use(express.json());
    app.use(express.static("public"));
    app.get("/", (req, res) => res.redirect("/api-tester.html"));

    app.use(createHealthRoutes(container.healthController));
    app.use(require("./routes/profileRoutes"));

    app.use(errorHandler);
    return app;
}

module.exports = createApp;
