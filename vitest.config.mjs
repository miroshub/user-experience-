import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["tests/**/*.test.js"],
        // the in-memory MongoDB can take a while to start the first time
        hookTimeout: 120000,
        testTimeout: 20000,
        coverage: {
            provider: "v8",
            reporter: ["text", "html"]
            // the 80% threshold on logic files is added once the first rule classes exist
        }
    }
});
