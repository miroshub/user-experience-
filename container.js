const Database = require("./config/Database");
const HealthService = require("./services/HealthService");
const HealthController = require("./controllers/HealthController");

// Dependency Inversion: this is the only file that creates concrete classes.
// Everything else receives what it needs through its constructor.
function buildContainer() {
    const database = Database.getInstance();

    const healthService = new HealthService(database);
    const healthController = new HealthController(healthService);

    return { database, healthController };
}

module.exports = { buildContainer };
