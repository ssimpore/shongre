import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';

test.describe('search map selection', () => {
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

  test('renders the selected listing below the map instead of over it', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/recherche?view=map', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const map = page.locator('.leaflet-container');
    const marker = page.locator('.shongre-map-marker-wrapper').first();
    await expect(map).toBeVisible();
    await expect(marker).toBeVisible();

    await marker.dispatchEvent('click');

    const selectedListing = page.getByTestId('map-active-listing');
    await expect(selectedListing).toBeVisible();
    await expect(selectedListing).toHaveCSS('position', 'static');

    const mapBox = await map.boundingBox();
    const selectedListingBox = await selectedListing.boundingBox();
    expect(mapBox).not.toBeNull();
    expect(selectedListingBox).not.toBeNull();
    expect(selectedListingBox!.y).toBeGreaterThanOrEqual(mapBox!.y + mapBox!.height);
    await expectNoHorizontalOverflow(page, 'selected map listing');
  });

  test('keeps the selected listing usable below the map on mobile', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/recherche?view=map', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const map = page.locator('.leaflet-container');
    const marker = page.locator('.shongre-map-marker-wrapper').first();
    await expect(map).toBeVisible();
    await expect(marker).toBeVisible();

    await marker.dispatchEvent('click');

    const selectedListing = page.getByTestId('map-active-listing');
    await expect(selectedListing).toBeVisible();
    await expect(selectedListing.getByRole('button', { name: /prévisualisation|preview/i })).toBeVisible();
    await expectNoHorizontalOverflow(page, 'mobile selected map listing');
  });
});
