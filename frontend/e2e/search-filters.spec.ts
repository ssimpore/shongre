import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

test('desktop filters are collapsed by default and can be reopened', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, 'guest');
  await page.goto('/recherche', { waitUntil: 'networkidle' });
  await waitForStableLayout(page);

  const filterPanel = page.locator('aside').filter({ hasText: /^Filtres/i });
  const showFilters = page.getByRole('button', { name: 'Afficher les filtres' });

  await expect(filterPanel).toHaveCount(0);
  await expect(showFilters).toBeVisible();
  await expect(showFilters).toContainText('Filtres');

  await showFilters.click();

  await expect(filterPanel).toBeVisible();
  await expect(filterPanel.getByRole('button', { name: /^Masquer$/i })).toBeVisible();
});

test('save search shares the results toolbar row with filters', async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 795 });
  await usePersona(page, 'guest');
  await page.goto('/recherche?category=emploi', { waitUntil: 'networkidle' });
  await waitForStableLayout(page);

  const filterButton = page.locator('button[aria-label^="Ouvrir les filtres de recherche"]');
  const saveButton = page.getByRole('button', { name: 'Sauvegarder cette recherche', exact: true });

  await expect(filterButton).toBeVisible();
  await expect(saveButton).toBeVisible();

  const alignment = await page.evaluate(() => {
    const filter = document.querySelector<HTMLButtonElement>('button[aria-label^="Ouvrir les filtres de recherche"]');
    const save = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === 'Sauvegarder cette recherche',
    );
    if (!filter || !save) return null;

    const filterRect = filter.getBoundingClientRect();
    const saveRect = save.getBoundingClientRect();
    return {
      sameRow: Math.abs(filterRect.top - saveRect.top) <= 1,
      saveStartsAfterFilter: saveRect.left >= filterRect.right,
    };
  });

  expect(alignment).toEqual({ sameRow: true, saveStartsAfterFilter: true });
});
