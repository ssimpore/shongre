import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

test.describe('compact taxonomy aliases', () => {
  test.beforeEach(async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);
  });

  test('uses short labels in navigation, autocomplete and listing cards', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Outils pro', exact: true })).toBeVisible();

    const search = page.getByRole('combobox');
    await search.fill('Outils pro');
    await expect(page.getByRole('option').first()).toContainText('Outils pro');

    const professionalListing = page.locator('article').filter({ hasText: 'Niveau Laser Rotatif' }).first();
    await expect(professionalListing.getByText('Outils pro', { exact: true })).toBeVisible();
  });

  test('uses short labels in the category catalogue', async ({ page }) => {
    await page.goto('/categories', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const catalogue = page.locator('main#main-content');
    await expect(catalogue.getByRole('link', { name: 'Voitures', exact: true })).toBeVisible();
    await expect(catalogue.getByRole('link', { name: 'Outils pro', exact: true })).toBeVisible();
    await expect(catalogue.getByRole('link', { name: 'Maison', exact: true })).toBeVisible();
  });
});
