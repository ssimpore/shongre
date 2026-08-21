import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

const discoveryRoutes = ['/', '/recherche', '/bons-plans'] as const;

test.describe('shared header scroll behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'shongre_cookie_consent_v1',
        JSON.stringify({
          version: 1,
          decidedAt: new Date().toISOString(),
          categories: { necessary: true, analytics: false, marketing: false },
        }),
      );
    });
  });

  for (const route of discoveryRoutes) {
    test(`reveals the category rail when needed on ${route}`, async ({ page }) => {
      await usePersona(page, 'guest');
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);

      const categoryNav = page.locator('header nav[aria-label="Filtres par catégorie"]');
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'visible');

      await page.evaluate(() => window.scrollTo(0, 700));
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'hidden');
      await expect(categoryNav).toHaveCSS('height', '0px');

      // Small opposing deltas are common with touchpads and scroll anchoring.
      // They must not restart the rail transition or make it tremble.
      await page.evaluate(() => window.scrollTo(0, 688));
      await page.waitForTimeout(350);
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'hidden');
      await expect(categoryNav).toHaveCSS('height', '0px');

      await page.evaluate(() => window.scrollTo(0, 700));
      await page.waitForTimeout(350);
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'hidden');
      await expect(categoryNav).toHaveCSS('height', '0px');

      await page.evaluate(() => window.scrollTo(0, 220));
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'visible');

      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(categoryNav).toHaveAttribute('data-scroll-state', 'visible');
    });
  }
});
