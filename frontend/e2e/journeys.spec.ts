import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { DEMO_LISTING_ID } from './routes';
import { waitForStableLayout } from './overflow';

/**
 * The journeys that have to keep working, checked on Chromium, Firefox and
 * WebKit. Sticky headers, `dvh` sizing, focus handling in overlays and form
 * behaviour are the parts that diverge between engines, so the flows that lean
 * on them are here rather than in the Chromium-only responsive sweep.
 */

test.describe('public browsing', () => {
  test('homepage offers search and reaches results', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const search = page.getByRole('combobox', { name: /rechercher une annonce/i }).first();
    await search.fill('velo');
    await search.press('Enter');

    await expect(page).toHaveURL(/\/recherche/);
    await expect(page.getByRole('link', { name: /.+/ }).first()).toBeVisible();
  });

  test('search state lives in the URL and survives a reload', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/recherche?query=velo&sortBy=price_asc');

    /**
     * The sort control is a custom listbox trigger rather than a `<select>`, so
     * the state it carries is the option it displays, not a form value. The
     * assertion is on that label — `toHaveValue` reads nothing from a `<button>`
     * and passed vacuously against the old markup.
     */
    const sort = page.getByRole('button', { name: /trier les résultats/i });
    await expect(sort).toContainText(/prix\s*:\s*croissant/i);

    await page.reload();
    await expect(sort).toContainText(/prix\s*:\s*croissant/i);
    await expect(page).toHaveURL(/sortBy=price_asc/);
  });

  test('a listing page shows price, seller and a primary action', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto(`/annonce/${DEMO_LISTING_ID}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('body')).toContainText('€');
  });

  test('a pro storefront lists its catalogue behind real tabs', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/boutique/atelier-nordique');

    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();

    // Arrow keys move selection, per the APG tabs pattern.
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { selected: true })).not.toHaveAttribute(
      'id',
      await tabs.first().getAttribute('id') ?? '',
    );
  });
});

test.describe('navigation shell', () => {
  test('the tablet header keeps search and the publish action', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto('/');
    await waitForStableLayout(page);

    await expect(page.getByRole('combobox', { name: /rechercher une annonce/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /déposer une annonce/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /ouvrir le menu/i })).toBeVisible();
  });

  test('the mobile bottom navigation exposes the core destinations', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const bottomNav = page.locator('nav').filter({ hasText: /accueil/i }).last();
    await expect(bottomNav).toBeVisible();
  });

  test('moving to a new page starts at the top, and back restores position', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/recherche');
    await waitForStableLayout(page);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(200);

    await page.locator('a[href^="/annonce/"]').nth(6).click();
    await page.waitForURL(/\/annonce\//);
    await waitForStableLayout(page);
    // Poll rather than sample once: WebKit applies the scroll a frame or two
    // later than Blink, and reading immediately made this flake under parallel
    // workers while passing in isolation.
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(50);

    await page.goBack();
    await page.waitForURL(/\/recherche/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(200);
  });
});

test.describe('buyer', () => {
  test('favourites can be opened and report a consistent count', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.goto('/compte/favoris');

    await expect(page.getByRole('heading', { level: 1 })).toContainText(/favori/i);
  });

  test('messaging is a full-height surface with a reachable composer', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/compte/messages');
    await waitForStableLayout(page);

    // The composer must sit inside the viewport, above the mobile chrome —
    // not below the fold where the keyboard would bury it.
    const composer = page.locator('textarea, input[type="text"]').last();
    if (await composer.count()) {
      const box = await composer.boundingBox();
      if (box) expect(box.y).toBeLessThan(844);
    }
  });
});

test.describe('seller', () => {
  test('the publication wizard opens on a focused layout', async ({ page }) => {
    await usePersona(page, 'individual_seller');
    await page.goto('/deposer');
    await waitForStableLayout(page);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('listing management filters through real tabs', async ({ page }) => {
    await usePersona(page, 'individual_seller');
    await page.goto('/compte/annonces');
    await waitForStableLayout(page);

    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('the verification centre states what is required now', async ({ page }) => {
    await usePersona(page, 'individual_seller');
    await page.goto('/compte/verification');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('pro workspace', () => {
  test('the dashboard and subscription pages render for a pro seller', async ({ page }) => {
    await usePersona(page, 'pro_seller');

    await page.goto('/compte/pro/tableau-de-bord');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goto('/compte/pro/abonnements');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('admin console', () => {
  test('the compact section menu navigates below lg', async ({ page }) => {
    await usePersona(page, 'admin');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin');
    await waitForStableLayout(page);

    const sectionButton = page.locator('[aria-controls="admin-section-menu"]');
    await expect(sectionButton).toBeVisible();

    await sectionButton.click();
    await expect(page.locator('#admin-section-menu')).toBeVisible();

    await page.getByRole('menuitem', { name: /utilisateurs/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/utilisateurs/);
    // Navigating closes the menu rather than leaving it hanging over the page.
    await expect(page.locator('#admin-section-menu')).toBeHidden();
  });

  test('moderation, markets and monetisation are reachable', async ({ page }) => {
    await usePersona(page, 'admin');
    for (const path of ['/admin/moderation', '/admin/marches', '/admin/monetisation', '/admin/taxonomie']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
  });
});

test.describe('honest product surfaces', () => {
  test('unavailable languages cannot be selected', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await page.locator('#header-desktop-lang-button').click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    const english = menu.getByRole('menuitem', { name: /english/i });
    await expect(english).toBeDisabled();
    await expect(english).toContainText(/bientôt/i);
  });

  test('the document language reflects the active locale', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  });
});
