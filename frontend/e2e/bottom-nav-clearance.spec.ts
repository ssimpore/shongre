import { test, expect } from '@playwright/test';
import { ALL_ROUTES, DEMO_LISTING_ID } from './routes';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

/**
 * Nothing the user needs may be left underneath the mobile tab bar.
 *
 * The bar is `position: fixed`, so content scrolling past it is expected and
 * fine — the user scrolls it back out. What is not fine is content that is
 * still covered at *maximum* scroll, because there is no gesture left that
 * frees it, and pinned bars that overlap it at every scroll position.
 *
 * The obstruction is measured from the raised publish button rather than from
 * the `<nav>` box, and that distinction is the whole point of this file: the
 * button is offset above the bar, so it paints ~20px outside it. That band read
 * as free space to every layout in the app, so the plan buttons on `/solutions-pro`,
 * the help-centre accordion and the storefront-editor fields all rendered into
 * it, where a tap opened the publish flow instead — and on listing detail the
 * disc covered the bottom of "Réserver" and "Message". The page-level overflow
 * and axe suites both pass on all of it, because nothing overflows and nothing
 * is invisible: it is purely a stacking conflict, and only geometry finds it.
 */
const MOBILE = { width: 375, height: 812 };

/** Top of everything the fixed navigation paints, raised button included. */
async function obstructionTop(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navigation mobile"]');
    if (!nav) return Number.POSITIVE_INFINITY;
    const raised = nav.querySelector('div.absolute');
    return Math.min(
      nav.getBoundingClientRect().top,
      raised ? raised.getBoundingClientRect().top : Number.POSITIVE_INFINITY,
    );
  });
}

test.describe('mobile tab bar clearance', () => {
  for (const route of ALL_ROUTES) {
    test(`${route.name} leaves nothing under the tab bar at full scroll`, async ({ page }) => {
      await page.setViewportSize(MOBILE);
      await usePersona(page, route.persona);
      await page.goto(route.path, { waitUntil: 'networkidle' });
      await waitForStableLayout(page);

      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(250);

      const ceiling = await obstructionTop(page);
      if (!Number.isFinite(ceiling)) test.skip(true, 'route has no mobile tab bar');

      const buried = await page.evaluate((limit) => {
        const nav = document.querySelector('nav[aria-label="Navigation mobile"]')!;
        return [...document.querySelectorAll('a,button,input,select,textarea,[role="button"],[role="tab"]')]
          .filter((el) => {
            if (nav.contains(el)) return false;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            // Only what is on screen: anything below the fold is still scrollable.
            if (r.top > window.innerHeight) return false;
            return r.bottom > limit;
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            const text = (el as HTMLElement).innerText || el.getAttribute('aria-label') || '';
            return `${text.trim().slice(0, 40).replace(/\s+/g, ' ') || el.tagName} @${Math.round(r.top)}-${Math.round(r.bottom)}`;
          });
      }, ceiling);

      expect(buried, `controls still covered by the tab bar at full scroll on ${route.name}`).toEqual([]);
    });
  }

  test('the listing action bar sits clear of the raised publish button', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await usePersona(page, 'individual_buyer');
    await page.goto(`/annonce/${DEMO_LISTING_ID}`, { waitUntil: 'networkidle' });
    await waitForStableLayout(page);

    const ceiling = await obstructionTop(page);
    const barBottom = await page.evaluate(() => {
      const bar = [...document.querySelectorAll('div')].find((d) => {
        const cs = getComputedStyle(d);
        return cs.position === 'fixed' && d.className.includes('lg:hidden') && d.className.includes('inset-x-0');
      });
      return bar ? bar.getBoundingClientRect().bottom : null;
    });

    expect(barBottom, 'listing detail should pin an action bar at this width').not.toBeNull();
    expect(barBottom!, 'the action bar overlaps the raised publish button').toBeLessThanOrEqual(ceiling);
  });
});
