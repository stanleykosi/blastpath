import { defineConfig } from "@playwright/test";

const configuredBaseUrl = process.env.BLASTPATH_BASE_URL?.trim();
const remoteBaseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, "") : undefined;
const baseURL = remoteBaseUrl ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: "npm run start",
          url: "http://127.0.0.1:3000",
          reuseExistingServer: true,
          timeout: 120_000,
        },
      }),
});
