import { defineConfig } from "@playwright/test";

/**
 * E2E smoke config. By default starts (or reuses) the Next dev server on :3000
 * and expects the API on :8000. Set E2E_BASE_URL (e.g. http://localhost:8080)
 * to run against an already-running stack — then no dev server is spawned.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const useExternal = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  webServer: useExternal
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000/ar",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
