import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

test.describe('account identity badges', () => {
  test('shows the compact Pro badge and omits redundant verification for administrators', async ({ page }) => {
    await usePersona(page, 'admin');
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto('/compte', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const hero = page.locator('[data-account-hero]');
    const sidebar = page.locator('aside');

    await expect(hero.getByText('Pro', { exact: true })).toBeVisible();
    await expect(hero.getByText('Vérifié', { exact: true })).toHaveCount(0);
    await expect(sidebar.getByText('Pro', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Compte Pro', { exact: true })).toHaveCount(0);
  });

  test('keeps the standalone verification badge hidden for professional accounts', async ({ page }) => {
    await usePersona(page, 'pro_seller');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/compte', { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const hero = page.locator('[data-account-hero]');
    await expect(hero.getByText('Pro', { exact: true })).toBeVisible();
    await expect(hero.getByText('Vérifié', { exact: true })).toHaveCount(0);
  });
});
