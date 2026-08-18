import { test } from '@playwright/test';
import { VIEWPORTS } from './viewports';
import { ALL_ROUTES, PUBLIC_ROUTES } from './routes';
import { usePersona } from './personas';
import { expectNoHorizontalOverflow, waitForStableLayout } from './overflow';

/**
 * No page may widen the document beyond the viewport, at any supported size.
 *
 * Every route is checked at the three sizes that historically broke — the
 * narrowest phone, the tablet gap just past `md`, and the point where `lg`
 * turns the desktop header on — and the public surfaces are checked across the
 * full matrix.
 */
const CRITICAL_WIDTHS = VIEWPORTS.filter((v) =>
  ['320-small-phone', '787-awkward-gap', '1024-tablet-landscape'].includes(v.name),
);

test.describe('horizontal overflow', () => {
  for (const viewport of CRITICAL_WIDTHS) {
    test.describe(`at ${viewport.name}`, () => {
      for (const route of ALL_ROUTES) {
        test(`${route.name} does not widen the page`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await usePersona(page, route.persona);
          await page.goto(route.path, { waitUntil: 'networkidle' });
          await waitForStableLayout(page);
          if (route.settleMs) await page.waitForTimeout(route.settleMs);
          await expectNoHorizontalOverflow(page, `${route.name} @ ${viewport.width}px`);
        });
      }
    });
  }

  // The public surfaces carry the most layout variety, so they get the full
  // matrix rather than the three representative widths.
  for (const viewport of VIEWPORTS) {
    test(`public routes hold at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await usePersona(page, 'guest');
      for (const route of PUBLIC_ROUTES) {
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await waitForStableLayout(page);
        await expectNoHorizontalOverflow(page, `${route.name} @ ${viewport.width}px`);
      }
    });
  }
});
