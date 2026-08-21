import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

test.describe('search empty-state actions', () => {
  for (const viewport of [
    { name: 'small phone', width: 320, height: 720 },
    { name: 'phone', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1280, height: 800 },
  ]) {
    test(`keeps both actions the same width at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await usePersona(page, 'guest');
      await page.goto('/recherche?maxPrice=3000&category=vehicules', { waitUntil: 'domcontentloaded' });
      await waitForStableLayout(page);

      const actions = page.locator('#search-no-results-actions');
      const buttons = actions.getByRole('button');
      await expect(buttons).toHaveCount(2);

      const widths = await buttons.evaluateAll((elements) =>
        elements.map((element) => Math.round(element.getBoundingClientRect().width)),
      );
      expect(new Set(widths).size, `action widths differ: ${widths.join(', ')}`).toBe(1);
    });
  }
});
