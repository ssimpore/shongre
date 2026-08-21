import { test, expect } from '@playwright/test';
import { usePersona } from './personas';

test('records, resumes and removes a recent search on the homepage', async ({ page }) => {
  await usePersona(page, 'guest');

  const query = 'Appareil photo dynamique';
  await page.goto(`/recherche?query=${encodeURIComponent(query)}`, { waitUntil: 'networkidle' });
  await page.waitForFunction((expectedQuery) => {
    const raw = window.localStorage.getItem('shongre_recent_search_items_v1');
    if (!raw) return false;
    return JSON.parse(raw).some((item: { query?: string }) => item.query === expectedQuery);
  }, query);
  await page.goto('/', { waitUntil: 'networkidle' });

  const recentSection = page.locator('section[aria-labelledby="home-recent-searches-title"]');
  const recentCard = recentSection.getByRole('link', { name: new RegExp(query) });
  await expect(recentCard).toBeVisible();

  await recentCard.click();
  await expect(page).toHaveURL(/\/recherche\?query=Appareil\+photo\+dynamique/);

  await page.goto('/', { waitUntil: 'networkidle' });
  await page
    .getByRole('button', { name: new RegExp(`Supprimer cette recherche.*${query}`) })
    .click();
  await expect(recentSection.getByRole('link', { name: new RegExp(query) })).toHaveCount(0);
});

test('shows at most six recent searches by default', async ({ page }) => {
  await usePersona(page, 'guest');

  for (let index = 0; index < 7; index += 1) {
    await page.goto(`/recherche?query=${encodeURIComponent(`Recherche limite ${index}`)}`, {
      waitUntil: 'networkidle',
    });
  }

  await page.goto('/', { waitUntil: 'networkidle' });

  const recentSection = page.locator('section[aria-labelledby="home-recent-searches-title"]');
  await expect(recentSection.getByRole('link')).toHaveCount(6);
});

test('lets an admin change the recent-search display limit for the homepage', async ({ page }) => {
  // This journey configures an admin override and then performs a five-route
  // write/read sweep. Keep the global single-route budget strict and widen only
  // this intentionally multi-navigation contract.
  test.setTimeout(90_000);
  await usePersona(page, 'admin');
  await page.goto('/admin/marches', { waitUntil: 'networkidle' });

  // The France card is the canonical configuration source. Editing it keeps
  // the setting inherited by markets that do not define a local override.
  await page.getByRole('button', { name: 'Configurer' }).first().click();
  await page.getByRole('button', { name: 'Fonctionnalités' }).click();

  const setting = page.getByText('Recherches récentes affichées').locator('..').locator('..').locator('..');
  await setting.getByRole('button', { name: 'Modifier' }).click();
  const value = page.locator('#admin-edit-override-value');
  await value.fill('4');
  await page.getByRole('button', { name: 'Enregistrer la surcharge' }).click();

  for (let index = 0; index < 5; index += 1) {
    await page.goto(`/recherche?query=${encodeURIComponent(`Admin limite ${index}`)}`, {
      waitUntil: 'networkidle',
    });
  }
  await page.goto('/', { waitUntil: 'networkidle' });

  const recentSection = page.locator('section[aria-labelledby="home-recent-searches-title"]');
  await expect(recentSection.getByRole('link')).toHaveCount(4);
});
