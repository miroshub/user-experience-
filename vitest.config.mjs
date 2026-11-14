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
            reporter: ["text", "html"],
            // NFR-10: the logic files must stay at 80% or more, or `npm run coverage` fails
            include: ["domain/**/*.js", "services/**/*.js", "security/**/*.js"],
            thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
        }
    }
});
