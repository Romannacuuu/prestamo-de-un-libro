import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:8090",
  },
  webServer: [
    {
      command: "npx tsx src/server.ts",
      url: "http://127.0.0.1:8000/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: "npx serve web -l 8090 --no-clipboard",
      url: "http://127.0.0.1:8090/",
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
