import { defineConfig } from "vitest/config";

/**
 * Unit tests only. Playwright specs live in e2e/ and are run with
 * `playwright test`; vitest's default include would collect them and fail.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
