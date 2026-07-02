import { defineConfig } from "@playwright/test";

/**
 * E2E smoke config. Expects the API to be running on :8000 (make dev-api)
 * and starts (or reuses) the Next dev server on :3000.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/ar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
