// Browser tests against a full local stack on separate ports, so they can
// run while your normal dev servers (4000 / 5173) are up:
//   API      http://localhost:4100  → exfil_test database, fresh fixtures
//   frontend http://localhost:5174  → talks to the test API
// Tests share one database and run in order (workers: 1).
import { defineConfig } from "@playwright/test";

const API_PORT = 4100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    // Locally use the installed Google Chrome; CI installs Playwright's Chromium.
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node test/integration/serve.js",
      cwd: "../backend",
      env: { PORT: String(API_PORT) },
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      cwd: "../frontend",
      env: { VITE_API_URL: `http://localhost:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
