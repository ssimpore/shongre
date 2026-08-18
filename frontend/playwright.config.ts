import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 3000);
export const BASE_URL = `http://localhost:${PORT}`;

/**
 * Shongre end-to-end configuration.
 *
 * The suite runs against the demo data mode only — no backend, no Supabase, no
 * payment or KYC provider — which is what keeps it runnable from a clean
 * checkout with nothing but `npm install`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Sticky headers, `dvh` units and modal focus behave differently outside
    // Blink, which is exactly where the mobile chrome and messaging surfaces
    // are most fragile — so the journey suite is checked on all three engines.
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: /responsive\.spec\.ts/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /responsive\.spec\.ts/ },
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
