import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ALL_ROUTES } from './routes';
import { usePersona } from './personas';
import { waitForStableLayout } from './overflow';

/**
 * WCAG 2.1/2.2 A + AA, at the two severities that represent real barriers.
 *
 * `critical` and `serious` are the bar because `moderate`/`minor` include
 * advisory findings (landmark preferences, heading-order nits inside
 * third-party markup) that would turn the gate into noise nobody reads.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

test.describe('accessibility', () => {
  for (const route of ALL_ROUTES) {
    test(`${route.name} has no critical or serious violations`, async ({ page }) => {
      await usePersona(page, route.persona);
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForStableLayout(page);

      const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
      const blocking = results.violations.filter((v) => BLOCKING_IMPACTS.has(v.impact || ''));

      const report = blocking
        .map((v) => {
          const nodes = v.nodes.slice(0, 3).map((n) => `        ${n.html.slice(0, 140)}`).join('\n');
          return `    [${v.impact}] ${v.id}: ${v.help}\n${nodes}`;
        })
        .join('\n');

      expect(blocking, `${route.name} (${route.path}) accessibility violations:\n${report}`).toEqual([]);
    });
  }
});

/**
 * Naming, checked at phone width.
 *
 * The axe sweep above runs at the project's desktop viewport, where a label
 * hidden behind `hidden sm:inline` is still on screen and still in the
 * accessibility tree. Below `sm` that same span is `display: none`, and a
 * button whose only other child is an `aria-hidden` icon is left with no
 * accessible name at all — which is exactly how the "Retour" control on every
 * auth route and on the publish wizard shipped nameless.
 */
test.describe('accessible names at phone width', () => {
  const PHONE = { width: 375, height: 812 };
  const ROUTES_WITH_COLLAPSING_LABELS = [
    { path: '/connexion', persona: 'guest' },
    { path: '/inscription', persona: 'guest' },
    { path: '/inscription/particulier', persona: 'guest' },
    { path: '/mot-de-passe-oublie', persona: 'guest' },
    { path: '/deposer', persona: 'individual_seller' },
    { path: '/', persona: 'guest' },
    { path: '/recherche', persona: 'guest' },
    { path: '/annonce/list-117', persona: 'guest' },
  ] as const;

  for (const route of ROUTES_WITH_COLLAPSING_LABELS) {
    test(`${route.path} names every control at ${PHONE.width}px`, async ({ page }) => {
      await usePersona(page, route.persona);
      await page.setViewportSize(PHONE);
      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await waitForStableLayout(page);

      const unnamed = await page.evaluate(() => {
        const nameOf = (el: Element): string => {
          const aria = el.getAttribute('aria-label');
          if (aria?.trim()) return aria.trim();

          const labelledby = el.getAttribute('aria-labelledby');
          if (labelledby) {
            const text = labelledby
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
              .trim();
            if (text) return text;
          }

          const labels = (el as HTMLInputElement).labels;
          if (labels?.length) {
            const text = [...labels].map((l) => l.textContent ?? '').join(' ').trim();
            if (text) return text;
          }

          // `innerText` is what a sighted user reads: it excludes display:none.
          // `sr-only` text stays visible to it, which is the distinction we want.
          const own = (el as HTMLElement).innerText?.trim();
          if (own) return own;

          const title = el.getAttribute('title')?.trim();
          if (title) return title;

          return el.querySelector('img')?.getAttribute('alt')?.trim() ?? '';
        };

        const offenders: string[] = [];
        document
          .querySelectorAll('a[href], button, [role="button"]')
          .forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) return;
            if (getComputedStyle(el).visibility === 'hidden') return;
            if (!nameOf(el)) {
              offenders.push(`${el.tagName} .${(el.className || '').toString().slice(0, 70)}`);
            }
          });
        return offenders;
      });

      expect(unnamed, `controls with no accessible name at ${PHONE.width}px:\n  ${unnamed.join('\n  ')}`).toEqual([]);
    });
  }
});

test.describe('keyboard and focus', () => {
  test('every interactive control in the header is reachable and shows focus', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForStableLayout(page);

    // Walk the first stretch of the tab order and confirm each stop paints a
    // visible focus indicator rather than relying on the browser default that
    // a `focus:outline-none` somewhere may have removed.
    //
    // The indicator is allowed to live on an ancestor: the search field styles
    // its wrapper with `focus-within:ring`, so the ring the user sees is drawn
    // around the whole segmented control rather than the bare input.
    const missingIndicator: string[] = [];
    let checkedControls = 0;
    for (let attempt = 0; attempt < 25 && checkedControls < 15; attempt += 1) {
      await page.keyboard.press('Tab');
      /* `motion-interactive` transitions box-shadow over 150ms, so reading the
         computed style immediately catches the ring part-way in — around 0.35px
         at 17% alpha — and the stricter check above would call that missing. */
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        if (el.tagName === 'NEXTJS-PORTAL' || el.closest('nextjs-portal')) {
          return { skip: true, visible: true, label: '', tag: el.tagName };
        }

        /* Both of the loose checks here used to pass a control that painted
           nothing at all:
           - `boxShadow !== 'none'` counted Tailwind's ring *placeholder*,
             which computes to `rgba(0, 0, 0, 0) 0px 0px 0px 0px` — a fully
             transparent shadow — as a visible ring;
           - `borderColor !== 'rgb(0, 0, 0)'` passed every element that simply
             has a normal grey border, focused or not.
           The ring now has to be opaque enough and wide enough to see. */
        const paintsFocus = (node: Element) => {
          const style = getComputedStyle(node);
          const hasOutline =
            style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;

          const hasRing = style.boxShadow
            .split(/,(?![^(]*\))/)
            .some((shadow) => {
              const alpha = shadow.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/);
              if (alpha && parseFloat(alpha[1]) < 0.25) return false;
              // Spread or blur has to be big enough to register as a ring.
              const lengths = shadow.match(/-?[\d.]+px/g) ?? [];
              return lengths.some((l) => Math.abs(parseFloat(l)) >= 1);
            });

          return hasOutline || hasRing;
        };

        let node: Element | null = el;
        let depth = 0;
        let visible = false;
        while (node && depth < 3) {
          if (paintsFocus(node)) { visible = true; break; }
          node = node.parentElement;
          depth += 1;
        }

        const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
        return { skip: false, visible, label, tag: el.tagName };
      });
      if (!info || info.skip) continue;
      checkedControls += 1;
      if (!info.visible) missingIndicator.push(`${info.tag} "${info.label}"`);
    }

    expect(checkedControls).toBe(15);
    expect(missingIndicator, `controls without a visible focus indicator:\n  ${missingIndicator.join('\n  ')}`).toEqual([]);
  });

  test('the mobile drawer traps focus and closes on Escape', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const burger = page.getByRole('button', { name: /ouvrir le menu/i });
    await burger.click();

    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute('aria-modal', 'true');

    // Focus must land inside the drawer, not stay behind on the page.
    const focusInsideDrawer = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    });
    expect(focusInsideDrawer, 'focus did not move into the drawer').toBe(true);

    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    // …and it comes back to the control that opened it.
    await expect(burger).toBeFocused();
  });
});
