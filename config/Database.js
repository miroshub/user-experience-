const mongoose = require("mongoose");

// Singleton: the whole app shares one database connection.
// Only container.js should call Database.getInstance().
class Database {
    static #instance = null;
    static #allowConstruct = false;

    #uri;
    #connection = null;

    // Private in spirit: JS has no private constructors, so a flag blocks `new Database()` from outside
    constructor(uri) {
        if (!Database.#allowConstruct) {
            throw new Error("Use Database.getInstance() instead of new Database()");
        }
        this.#uri = uri;
    }

    static getInstance() {
        if (Database.#instance === null) {
            Database.#allowConstruct = true;
            Database.#instance = new Database(process.env.MONGODB_URI);
            Database.#allowConstruct = false;
        }
        return Database.#instance;
    }

    async connect() {
        if (this.isConnected()) return this.#connection;
        if (!this.#uri) {
            throw new Error("MONGODB_URI is missing. Copy .env.example to .env and fill it in.");
        }
        await mongoose.connect(this.#uri);
        this.#connection = mongoose.connection;
        return this.#connection;
    }

    async disconnect() {
        await mongoose.disconnect();
        this.#connection = null;
    }

    isConnected() {
        return mongoose.connection.readyState === 1;
    }

    getConnection() {
        return this.#connection;
    }
}

module.exports = Database;
