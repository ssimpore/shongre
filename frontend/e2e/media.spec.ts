import { test, expect } from '@playwright/test';
import { usePersona } from './personas';
import { DEMO_LISTING_ID } from './routes';
import { waitForStableLayout } from './overflow';

/**
 * Listing media must not ship more pixels than the slot can paint.
 *
 * Every photo used to request the one fixed width the fixture carried (800w)
 * regardless of where it landed, so a 126px rail thumbnail downloaded a source
 * forty times larger than it could display — 1.0MB of images on the desktop
 * homepage and 927KB on a phone.
 *
 * These are behavioural assertions rather than byte snapshots on purpose: the
 * fixture set changes, but "declare a ladder" and "do not overshoot the slot"
 * hold regardless of which photos are seeded.
 */

/** How far past the slot's device pixels a chosen source may sit. */
const OVERSHOOT_BUDGET = 2.5;

interface PaintedImage {
  slot: number;
  /** Device pixels the slot actually paints: CSS width x devicePixelRatio. */
  painted: number;
  chosen: number;
  hasSrcSet: boolean;
  hasSizes: boolean;
  src: string;
}

async function paintedImages(page: import('@playwright/test').Page): Promise<PaintedImage[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('img'))
      .filter((img) => {
        const r = img.getBoundingClientRect();
        // Only judge images that are actually laid out and CDN-resizable.
        return r.width > 0 && /images\.unsplash\.com/.test(img.currentSrc || img.src);
      })
      .map((img) => ({
        slot: Math.round(img.getBoundingClientRect().width),
        painted: Math.round(img.getBoundingClientRect().width * (window.devicePixelRatio || 1)),
        chosen: Number((img.currentSrc.match(/[?&]w=(\d+)/) || [])[1] || 0),
        hasSrcSet: img.hasAttribute('srcset'),
        hasSizes: img.hasAttribute('sizes'),
        src: img.currentSrc.slice(0, 90),
      })),
  );
}

const MEDIA_ROUTES = [
  { path: '/', name: 'homepage' },
  { path: '/recherche', name: 'search' },
  { path: `/annonce/${DEMO_LISTING_ID}`, name: 'listing-detail' },
];

for (const viewport of [
  { name: '390-phone', width: 390, height: 844 },
  { name: '1280-laptop', width: 1280, height: 800 },
]) {
  test.describe(`responsive media at ${viewport.name}`, () => {
    for (const route of MEDIA_ROUTES) {
      test(`${route.name} declares a source ladder and respects the slot`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await usePersona(page, 'guest');
        await page.goto(route.path, { waitUntil: 'networkidle' });
        await waitForStableLayout(page);

        const images = await paintedImages(page);
        expect(images.length, `${route.name} rendered no CDN images to check`).toBeGreaterThan(0);

        const undeclared = images.filter((i) => !i.hasSrcSet || !i.hasSizes);
        expect(
          undeclared,
          `images without srcset/sizes on ${route.name}:\n` +
            undeclared.map((i) => `  ${i.slot}px slot — ${i.src}`).join('\n'),
        ).toEqual([]);

        // Against device pixels, not CSS pixels. Playwright's Desktop Safari
        // profile runs at devicePixelRatio 2, so a 96px slot legitimately needs
        // a 192px source and the ladder's next rung up is the right choice —
        // measuring in CSS pixels failed webkit for behaving correctly. The
        // multiplier absorbs the step granularity of the ladder itself.
        const oversized = images.filter((i) => i.chosen > i.painted * OVERSHOOT_BUDGET);
        expect(
          oversized,
          `sources overshooting their slot by more than ${OVERSHOOT_BUDGET}x on ${route.name}:\n` +
            oversized
              .map((i) => `  ${i.slot}px slot needs ${i.painted}px, got ${i.chosen}w — ${i.src}`)
              .join('\n'),
        ).toEqual([]);
      });
    }
  });
}

test('listing detail marks its lead photo as the priority fetch', async ({ page }) => {
  await usePersona(page, 'guest');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`/annonce/${DEMO_LISTING_ID}`, { waitUntil: 'networkidle' });
  await waitForStableLayout(page);

  // The gallery's lead photo is the LCP element, so it must not be lazy.
  const lead = page.locator('img[fetchpriority="high"]').first();
  await expect(lead).toHaveAttribute('loading', 'eager');
});
