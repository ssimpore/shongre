import { expect, test } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

test.describe('account identity badges', () => {
  test('moves the individual verification mark beside the account name', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto('/compte', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const sidebarIdentity = page.locator('aside [data-account-identity]');
    await expect(sidebarIdentity).toContainText('Thomas Laurent');
    await expect(
      sidebarIdentity.locator('[data-account-verified-icon]'),
    ).toHaveAttribute('aria-label', 'Profil vérifié');
    await expect(
      page.locator('[data-account-hero]').getByText('Vérifié', { exact: true }),
    ).toHaveCount(0);
  });

  test('redirects administrators away from the customer account workspace', async ({ page }) => {
    await usePersona(page, 'admin');
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto('/compte', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole('heading', { name: /Bonjour, Antoine Fabre/ }),
    ).toBeVisible();
    await expect(page.locator('[data-account-hero]')).toHaveCount(0);
  });

  test('keeps the standalone verification badge hidden for professional accounts', async ({ page }) => {
    await usePersona(page, 'pro_seller');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/compte', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const hero = page.locator('[data-account-hero]');
    await expect(hero.getByText('Pro', { exact: true })).toHaveCount(0);
    await expect(hero.getByText('Vérifié', { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Niveaux de sécurité', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: '(KYC / KYB / IBAN) →', exact: true }),
    ).toBeVisible();
  });
});
