import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "node services/api/server/local-api.mjs",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: true,
      timeout: 30_000,
      env: {
        VEYLUMI_MODE: "demo",
        VEYLUMI_AI_PROVIDER: "local-mock",
        VEYLUMI_IMAGE_PROVIDER: "openai",
        VEYLUMI_DB_FILE: ".data/e2e-veylumi.json",
        VEYLUMI_ANALYSIS_QUEUE_FILE: ".data/e2e-jobs.json",
        VEYLUMI_LOG_FILE: ".data/e2e-logs.jsonl",
        VEYLUMI_PREVIEW_TTL_MS: "300000",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
