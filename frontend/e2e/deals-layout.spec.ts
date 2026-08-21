import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  test(`wraps and paginates Bons plans cards at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await usePersona(page, 'guest');
    await page.goto('/bons-plans', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);
    const dealsRegion = page.getByRole('region', { name: 'Annonces en promotion' });
    await expect(dealsRegion.locator('article')).toHaveCount(8);

    const metrics = await page.evaluate(() => {
      const region = document.querySelector('main [role="region"][aria-label="Annonces en promotion"]');
      const grid = region?.firstElementChild;
      const cards = [...document.querySelectorAll('main article')];
      const cardWidths = cards.map((card) => Math.round(card.getBoundingClientRect().width));
      const cardRows = [...new Set(cards.map((card) => Math.round(card.getBoundingClientRect().y)))];
      return {
        cardCount: cards.length,
        cardWidths,
        cardRows,
        gridDisplay: grid ? getComputedStyle(grid).display : null,
        regionOverflows: region ? region.scrollWidth > region.clientWidth : false,
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(metrics.cardCount).toBe(8);
    expect(new Set(metrics.cardWidths).size, `card widths differ: ${metrics.cardWidths.join(', ')}`).toBe(1);
    expect(metrics.cardRows.length).toBeGreaterThan(1);
    expect(metrics.gridDisplay).toBe('grid');
    expect(metrics.regionOverflows).toBe(false);
    expect(metrics.pageOverflows).toBe(false);

    const pagination = page.getByRole('navigation', { name: 'Pagination des annonces en promotion' });
    await expect(pagination).toContainText('Page 1 sur 2');
    await pagination.getByRole('button', { name: 'Suivant' }).click();

    await expect(page).toHaveURL(/\?page=2$/);
    await expect(pagination).toContainText('Page 2 sur 2');
    await expect(page.locator('main article')).toHaveCount(2);
    await expect(page.locator('main article').first()).toBeInViewport();
    await expect(pagination.getByRole('button', { name: 'Suivant' })).toBeDisabled();
    await expect(pagination.getByRole('button', { name: 'Précédent' })).toBeEnabled();
  });
}
