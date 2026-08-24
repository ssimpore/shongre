import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';

test.describe('boosted listings hero rail', () => {
  test('marks boosted listings with the shared featured icon', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const rail = page.locator('#hero-boosted-track');
    const targetListing = rail.locator('article', { hasText: 'Arbre à Chat Mural' }).first();
    await expect(rail).toBeVisible();
    await expect(targetListing.locator('.sr-only', { hasText: 'Annonce à la une' })).toBeAttached();
    await expectNoHorizontalOverflow(page, 'boosted hero rail');
  });

  test('keeps the boosted indicator available on a mobile hero viewport', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const rail = page.locator('#hero-boosted-track');
    const targetListing = rail.locator('article', { hasText: 'Arbre à Chat Mural' }).first();
    await expect(targetListing.locator('.sr-only', { hasText: 'Annonce à la une' })).toBeAttached();
    await expectNoHorizontalOverflow(page, 'mobile boosted hero rail');
  });

  test('aligns the trust rows and links checked listings to safety guidance', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const guarantees = page.getByRole('list', { name: 'Garanties Shongre' });
    const checkedListings = page.getByRole('link', { name: /Annonces contrôlées/ });
    await expect(guarantees).toBeVisible();
    await expect(checkedListings).toBeVisible();
    await expect(checkedListings).toHaveAttribute('href', '/securite');

    const guaranteesBox = await guarantees.boundingBox();
    const checkedListingsBox = await checkedListings.boundingBox();
    expect(guaranteesBox).not.toBeNull();
    expect(checkedListingsBox).not.toBeNull();
    expect(Math.abs((guaranteesBox!.y + guaranteesBox!.height) - (checkedListingsBox!.y + checkedListingsBox!.height))).toBeLessThanOrEqual(2);

    await checkedListings.click();
    await expect(page).toHaveURL(/\/securite$/);
    await expect(page.getByRole('heading', { name: /sécurité/i })).toBeVisible();
  });
});
