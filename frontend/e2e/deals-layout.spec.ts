import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

for (const viewport of [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
]) {
  test(`keeps Bons plans cards on the shared listing width at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await usePersona(page, 'guest');
    await page.goto('/bons-plans', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const metrics = await page.evaluate(() => {
      const railCell = document.querySelector('main .w-listing-card');
      const rail = document.querySelector('main [role="region"][aria-label="Annonces en promotion"]');
      const railTrack = rail?.firstElementChild;
      const cards = [...document.querySelectorAll('main article')];
      const cardWidths = cards.map((card) => Math.round(card.getBoundingClientRect().width));
      const cardRows = [...new Set(cards.map((card) => Math.round(card.getBoundingClientRect().y)))];
      return {
        sharedWidth: railCell ? Math.round(railCell.getBoundingClientRect().width) : null,
        cardWidths,
        cardRows,
        railWrap: railTrack ? getComputedStyle(railTrack).flexWrap : null,
        railOverflows: rail ? rail.scrollWidth > rail.clientWidth : false,
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });

    expect(metrics.sharedWidth).not.toBeNull();
    expect(new Set(metrics.cardWidths).size, `card widths differ: ${metrics.cardWidths.join(', ')}`).toBe(1);
    expect(metrics.cardWidths[0]).toBe(metrics.sharedWidth);
    expect(metrics.cardRows).toHaveLength(1);
    expect(metrics.railWrap).toBe('nowrap');
    expect(metrics.railOverflows).toBe(true);
    expect(metrics.pageOverflows).toBe(false);
  });
}
