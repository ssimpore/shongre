import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `e2e/` belongs to Playwright, which brings its own `test` and `expect`.
    // Without this, `vitest run` collected the Playwright specs and failed on
    // `test.describe` before running a single unit test.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist', 'e2e'],
  },
});
