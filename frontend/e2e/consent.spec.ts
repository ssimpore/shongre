import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

/**
 * Cookie consent, held to the properties that make it lawful rather than to its
 * appearance.
 *
 * The product previously had a "Gestion des cookies" link in the footer that
 * opened the privacy policy — a page explaining the cookies with no way to
 * change them — and no banner at all. These tests pin the three properties that
 * are easy to regress the next time the banner is restyled: refusing stays on
 * the first layer, nothing dismisses the banner without a decision, and a
 * decision survives a reload.
 */
const CONSENT_KEY = 'shongre_cookie_consent_v1';

const banner = (page: import('@playwright/test').Page) =>
  page.locator('[aria-labelledby="cookie-banner-title"]');

/**
 * Clears any stored decision **once**, then loads the page.
 *
 * Deliberately not `addInitScript`: that re-runs on every navigation, so it
 * wiped the decision again on reload and made "is it remembered?" untestable —
 * the banner came back and the assertion blamed the product for the harness.
 */
async function freshVisitor(page: import('@playwright/test').Page) {
  await usePersona(page, 'guest');
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => window.localStorage.removeItem(key), CONSENT_KEY);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForStableLayout(page);
}

const storedConsent = (page: import('@playwright/test').Page) =>
  page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, CONSENT_KEY);

test.describe('cookie consent', () => {
  test('asks a fresh visitor, and stores nothing until they answer', async ({ page }) => {
    await freshVisitor(page);

    await expect(banner(page)).toBeVisible();
    expect(await storedConsent(page), 'no consent may be recorded before a choice').toBeNull();
  });

  // Refusing must be reachable in one click from the first layer, exactly like
  // accepting. Burying it behind "Personnaliser" is the pattern the CNIL fines.
  test('offers refusal at the same level as acceptance', async ({ page }) => {
    await freshVisitor(page);

    await expect(banner(page).getByRole('button', { name: /tout accepter/i })).toBeVisible();
    await expect(banner(page).getByRole('button', { name: /tout refuser/i })).toBeVisible();
  });

  test('cannot be dismissed without deciding', async ({ page }) => {
    await freshVisitor(page);

    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5);
    await waitForStableLayout(page);

    await expect(banner(page), 'the banner must survive Escape and a click away').toBeVisible();
    expect(await storedConsent(page)).toBeNull();
  });

  test('refusing records the refusal and is remembered across a reload', async ({ page }) => {
    await freshVisitor(page);
    await banner(page).getByRole('button', { name: /tout refuser/i }).click();

    await expect(banner(page)).toBeHidden();
    expect((await storedConsent(page)).categories).toMatchObject({
      necessary: true,
      analytics: false,
      marketing: false,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);
    await expect(banner(page), 'a decided visitor must not be asked again').toBeHidden();
  });

  test('can be reopened from the footer and applied per purpose', async ({ page }) => {
    await freshVisitor(page);
    await banner(page).getByRole('button', { name: /tout refuser/i }).click();
    await expect(banner(page)).toBeHidden();

    await page.getByRole('button', { name: /gestion des cookies/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Reopening must not silently re-consent to anything already refused.
    await expect(dialog.locator('#consent-analytics')).not.toBeChecked();
    await expect(dialog.locator('#consent-necessary')).toBeDisabled();

    await dialog.locator('#consent-analytics').check();
    await dialog.getByRole('button', { name: /enregistrer/i }).click();

    expect((await storedConsent(page)).categories).toMatchObject({
      analytics: true,
      marketing: false,
    });
  });

  // The banner is pinned to the bottom on the same surface as the mobile tab bar.
  test('never covers the mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freshVisitor(page);

    const overlap = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Navigation mobile"]');
      const raised = nav?.querySelector('div.absolute');
      const bar = document.querySelector('[aria-labelledby="cookie-banner-title"]');
      if (!nav || !bar) return null;
      const ceiling = Math.min(
        nav.getBoundingClientRect().top,
        raised ? raised.getBoundingClientRect().top : Infinity,
      );
      return { bannerBottom: bar.getBoundingClientRect().bottom, ceiling };
    });

    expect(overlap, 'both the banner and the tab bar should be present at 375px').not.toBeNull();
    expect(overlap!.bannerBottom).toBeLessThanOrEqual(overlap!.ceiling);
  });
});
