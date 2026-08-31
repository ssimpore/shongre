import { defineConfig, devices } from "@playwright/test";
import { release } from "node:os";

const REMOTE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const PORT = Number(process.env.FRONTEND_PORT || process.env.PORT);
const HOST = process.env.FRONTEND_HOST;
if (
  !REMOTE_BASE_URL &&
  (!HOST || !Number.isInteger(PORT) || PORT < 1 || PORT > 65535)
) {
  throw new Error(
    "FRONTEND_HOST and FRONTEND_PORT are required. Run E2E through make frontend-test-e2e.",
  );
}
export const BASE_URL = REMOTE_BASE_URL || `http://${HOST}:${PORT}`;
const darwinMajor =
  process.platform === "darwin"
    ? Number.parseInt(release().split(".")[0] ?? "", 10)
    : 0;
// Playwright Firefox r1538 cannot launch on macOS 27: its plugin-container
// sandbox extension is denied before a browser connection exists. Keep Firefox
// in Linux CI and make the host exception removable/testable once upstream is
// fixed. https://github.com/microsoft/playwright/issues/42082
const firefoxCanLaunch =
  darwinMajor < 27 || process.env.FORCE_FIREFOX_E2E === "1";

/**
 * Shongre end-to-end configuration.
 *
 * The suite runs against the demo data mode only — no backend, no Supabase, no
 * payment or KYC provider — which is what keeps it runnable from a clean
 * checkout with nothing but `npm install`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Direct Playwright runs stay bounded. The root runner builds first and
  // overrides this per engine: Chromium keeps two workers while non-Blink
  // engines use one to avoid long-run browser-context deadlocks.
  workers: 2,

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Sticky headers, `dvh` units and modal focus behave differently outside
    // Blink, which is exactly where the mobile chrome and messaging surfaces
    // are most fragile — so the journey suite is checked on all three engines.
    ...(firefoxCanLaunch
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: /responsive\.spec\.ts/,
          },
        ]
      : []),
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /responsive\.spec\.ts/,
    },
  ],

  webServer: REMOTE_BASE_URL
    ? undefined
    : {
        // The root runner starts its own isolated standalone server and explicitly
        // allows Playwright to reuse that process. The fallback remains useful when
        // invoking Playwright directly in a dedicated frontend checkout.
        command:
          process.env.PLAYWRIGHT_WEB_SERVER_COMMAND ||
          "npm run dev -- --webpack",
        url: BASE_URL,
        // The root CLI gives Playwright a dedicated port. It only enables reuse
        // after starting and tracking its own server; an interactive developer
        // server is therefore never adopted accidentally.
        reuseExistingServer:
          process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1",
        timeout: 300_000,
      },
});
