class HealthService {
    #database;

    constructor(database) {
        this.#database = database;
    }

    check() {
        return {
            status: "ok",
            database: this.#database.isConnected() ? "connected" : "disconnected"
        };
    }
}

module.exports = HealthService;
