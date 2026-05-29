import { defineConfig, devices } from "@playwright/test";
import path from "path";

const basePath = "/ota-analyzer";
const port = 8080;
const projectDir = path.resolve(__dirname);
const outDir = path.join(projectDir, "out");
const stagingDir = "/tmp/ota-staging";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    // Use origin-only baseURL so relative paths resolve correctly.
    // Tests use the full /ota-analyzer/ path in page.goto().
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: {
    // Build a staging directory that mirrors the basePath URL structure.
    command: [
      `fuser -k ${port}/tcp 2>/dev/null || true`,
      `rm -rf ${stagingDir}`,
      `mkdir -p ${stagingDir}${basePath}`,
      `cp -r ${outDir}/* ${stagingDir}${basePath}/`,
      `cd ${stagingDir} && python3 -m http.server ${port}`,
    ].join(" && "),
    url: `http://localhost:${port}${basePath}/`,
    reuseExistingServer: false,
    timeout: 30_000,
    cwd: projectDir,
  },
});
