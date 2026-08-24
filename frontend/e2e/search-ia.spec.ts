import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

/**
 * One search affordance per screen, and one visible result count.
 *
 * `/recherche` used to render the sticky header search *and* its own page-level
 * bar: two text inputs carrying the identical accessible name ("Rechercher une
 * annonce"), each with its own category dropdown, plus the result count printed
 * both in the page heading and in the results toolbar. The page-level bar wins
 * because it owns fields the header one does not (radius) and edits the URL in
 * place instead of navigating.
 */

/** Ignores `sr-only` (1px, clipped) and anything genuinely hidden. */
const VISIBLE = `(el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 5 || r.height < 5) return false;
  const s = getComputedStyle(el);
  return s.visibility !== 'hidden' && s.display !== 'none';
}`;

test.describe('search page information architecture', () => {
  for (const width of [1280, 834]) {
    test(`exposes exactly one search field at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await usePersona(page, 'guest');
      await page.goto('/recherche', { waitUntil: 'domcontentloaded' });
      await waitForStableLayout(page);

      const fields = await page.evaluate((visSrc) => {
        const vis = eval(visSrc) as (el: Element) => boolean;
        return Array.from(document.querySelectorAll('input'))
          .filter((i) => vis(i) && (i.getAttribute('aria-label') || '').includes('Rechercher une annonce'))
          .map((i) => i.placeholder);
      }, VISIBLE);

      expect(fields, `expected one search field, got:\n${fields.join('\n')}`).toHaveLength(1);
      // The surviving one must be the page-level bar, not the header's.
      expect(fields[0]).toContain('ex :');
    });
  }

  test('prints the result count once on screen but still announces it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await usePersona(page, 'guest');
    await page.goto('/recherche', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const counts = await page.evaluate((visSrc) => {
      const vis = eval(visSrc) as (el: Element) => boolean;
      const all = Array.from(document.querySelectorAll('*')).filter(
        (el) => el.children.length === 0 && /^\d+\s*annonces?/i.test((el.textContent || '').trim()),
      );
      return {
        visible: all.filter(vis).map((el) => (el.textContent || '').trim()),
        announced: all.some((el) => el.closest('[aria-live]') !== null),
      };
    }, VISIBLE);

    expect(counts.visible, `visible counts:\n${counts.visible.join('\n')}`).toHaveLength(1);
    expect(counts.announced, 'the count must remain in a live region for screen readers').toBe(true);
  });

  test('keeps the header search on routes that have no search bar of their own', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await usePersona(page, 'guest');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    const headerFields = await page.evaluate((visSrc) => {
      const vis = eval(visSrc) as (el: Element) => boolean;
      return Array.from(document.querySelectorAll('header input')).filter(vis).length;
    }, VISIBLE);

    expect(headerFields, 'the homepage relies on the header search').toBeGreaterThan(0);
  });
});

/**
 * `/categorie/:slug` is the pretty form of a category search, and the primary
 * organic landing page for a classifieds site.
 *
 * The route was registered but its parameter was never read, so every category
 * page rendered the whole unfiltered catalogue under "Toutes les annonces".
 * Nothing in the UI links to it — category navigation all goes through
 * `/recherche?category=` — so no click path exercised it and no suite covered it.
 */
test.describe('category landing pages', () => {
  test('filters to the category named in the path', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/recherche', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);
    const unfiltered = await page.locator('article').count();

    await page.goto('/categorie/vehicules', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    await expect(page.locator('h1')).toHaveText(/véhicules/i);
    const filtered = await page.locator('article').count();
    expect(filtered, 'the category page must not show the entire catalogue').toBeLessThan(
      unfiltered,
    );
    expect(filtered, 'the category page should still show its listings').toBeGreaterThan(0);
  });

  // The filter controls delete the category key to clear it, so a route
  // parameter read as a live fallback would reinstate what the user just removed.
  test('lets the category be cleared without the path putting it back', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.goto('/categorie/vehicules', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    await page.getByRole('button', { name: /retirer le filtre/i }).first().click();
    await waitForStableLayout(page);

    await expect(page.locator('h1')).toHaveText(/toutes les annonces/i);
    expect(new URL(page.url()).searchParams.get('category')).toBeNull();
  });
});
