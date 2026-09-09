import { defineConfig, devices } from "@playwright/test";
import { release } from "node:os";

const REMOTE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const CHROMIUM_EXECUTABLE_PATH =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
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
 * The Web client always uses the API. The API transport target owns an
 * isolated test backend; protected hosted certification uses dedicated
 * staging accounts and sandbox providers, never production credentials.
 */
export default defineConfig({
  testDir: "./e2e",
  /*
   * The database-mode suite runs against the stack `make dev` starts, not the
   * in-memory fixture API the rest of the suite uses. `make test-web-database-mode`
   * opts into it; every other entry point must skip it, because in demo mode it
   * would assert the repository family it exists to bypass.
   */
  testIgnore:
    process.env.SHONGRE_E2E_DATABASE_MODE === "1"
      ? undefined
      : /database-mode-public-routes\.spec\.ts/,
  metadata: {
    environment: process.env.PLAYWRIGHT_EXPECTED_ENVIRONMENT,
    release: process.env.PLAYWRIGHT_EXPECTED_RELEASE,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /*
   * `E2E_JSON_REPORT` writes a machine-readable run alongside the console
   * output, which is what `scripts/e2e-triage.mjs` compares against the
   * recorded baseline. Without it the only way to tell a new failure from one
   * of the 174 that were already there is to read the list by hand.
   */
  reporter: [
    ...(process.env.CI ? ([["github"]] as const) : []),
    ["list"],
    ...(process.env.E2E_JSON_REPORT
      ? ([["json", { outputFile: process.env.E2E_JSON_REPORT }]] as const)
      : []),
  ] as never,
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
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(CHROMIUM_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: CHROMIUM_EXECUTABLE_PATH } }
          : {}),
      },
    },
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
