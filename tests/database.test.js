const Database = require("../config/Database");
const { startTestDb } = require("./helpers/testDb");

describe("Database (Singleton)", () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await startTestDb();
    });

    afterAll(async () => {
        await Database.getInstance().disconnect();
        await mongoServer.stop();
    });

    it("always returns the same instance", () => {
        expect(Database.getInstance()).toBe(Database.getInstance());
    });

    it("cannot be created with new", () => {
        expect(() => new Database("mongodb://x")).toThrow("Use Database.getInstance()");
    });

    it("connects and disconnects", async () => {
        const db = Database.getInstance();
        expect(db.isConnected()).toBe(false);

        await db.connect();
        expect(db.isConnected()).toBe(true);
        expect(db.getConnection()).not.toBeNull();

        await db.disconnect();
        expect(db.isConnected()).toBe(false);
        expect(db.getConnection()).toBeNull();
    });
});
