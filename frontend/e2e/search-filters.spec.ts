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

  /* One control owns the panel. The sidebar used to carry its own "Masquer"
     button as well, so with the toolbar toggle also reading "Masquer" once
     open, the page showed two identically-labelled buttons for one action. */
  const hideFilters = page.getByRole('button', { name: /^Masquer/i });
  await expect(hideFilters).toHaveCount(1);
  await expect(hideFilters).toBeVisible();

  await hideFilters.click();
  await expect(filterPanel).toHaveCount(0);
});

test('condition is filterable, not just displayed', async ({ page }) => {
  /* Every result card prints a condition, but nothing exposed it as a facet —
     while `filters.conditions` had been honoured by the data layer all along. */
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, 'guest');
  await page.goto('/recherche', { waitUntil: 'networkidle' });
  await waitForStableLayout(page);

  await page.getByRole('button', { name: 'Afficher les filtres' }).click();

  const count = page.getByRole('status').filter({ hasText: /annonce/ }).first();
  const total = Number.parseInt(await count.innerText(), 10);

  await page.getByRole('checkbox', { name: 'Très bon état' }).click();
  await expect(page).toHaveURL(/condition=very_good/);

  // The count re-renders once the URL round-trips through the router, so poll
  // rather than reading it in the same tick as the click.
  await expect
    .poll(async () => Number.parseInt(await count.innerText(), 10))
    .toBeLessThan(total);
});

test('save search shares the results toolbar row with filters', async ({ page }) => {
  await page.setViewportSize({ width: 888, height: 795 });
  await usePersona(page, 'guest');
  await page.goto('/recherche?category=emploi', { waitUntil: 'networkidle' });
  await waitForStableLayout(page);

  const filterButton = page.locator('button[aria-label^="Ouvrir les filtres de recherche"]');
  const saveButton = page.getByRole('button', { name: 'Sauvegarder', exact: true });

  await expect(filterButton).toBeVisible();
  await expect(saveButton).toBeVisible();

  const alignment = await page.evaluate(() => {
    const filter = document.querySelector<HTMLButtonElement>('button[aria-label^="Ouvrir les filtres de recherche"]');
    const save = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.getAttribute('aria-label') === 'Sauvegarder',
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
