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
      await page.goto(route.path, { waitUntil: 'networkidle' });
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

test.describe('keyboard and focus', () => {
  test('every interactive control in the header is reachable and shows focus', async ({ page }) => {
    await usePersona(page, 'individual_buyer');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/', { waitUntil: 'networkidle' });

    // Walk the first stretch of the tab order and confirm each stop paints a
    // visible focus indicator rather than relying on the browser default that
    // a `focus:outline-none` somewhere may have removed.
    //
    // The indicator is allowed to live on an ancestor: the search field styles
    // its wrapper with `focus-within:ring`, so the ring the user sees is drawn
    // around the whole segmented control rather than the bare input.
    const missingIndicator: string[] = [];
    for (let i = 0; i < 15; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;

        const paintsFocus = (node: Element) => {
          const style = getComputedStyle(node);
          const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
          const hasRing = style.boxShadow !== 'none';
          const hasBorderShift = style.borderColor !== 'rgb(0, 0, 0)' && parseFloat(style.borderWidth) > 0;
          return hasOutline || hasRing || hasBorderShift;
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
        return { visible, label, tag: el.tagName };
      });
      if (info && !info.visible) missingIndicator.push(`${info.tag} "${info.label}"`);
    }

    expect(missingIndicator, `controls without a visible focus indicator:\n  ${missingIndicator.join('\n  ')}`).toEqual([]);
  });

  test('the mobile drawer traps focus and closes on Escape', async ({ page }) => {
    await usePersona(page, 'guest');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'networkidle' });

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
