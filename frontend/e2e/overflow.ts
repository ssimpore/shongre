import { Page, expect } from '@playwright/test';

export interface OverflowOffender {
  selector: string;
  left: number;
  right: number;
}

export interface OverflowReport {
  viewportWidth: number;
  documentWidth: number;
  overflow: number;
  offenders: OverflowOffender[];
}

/**
 * Measures page-level horizontal overflow and names what caused it.
 *
 * Two details matter. `document.body` carries `overflow-x: hidden` as a last
 * line of defence, so a naive "can the user scroll sideways" check reports
 * clean while content sits unreachable off-screen — the measurement therefore
 * reads `documentElement.scrollWidth`, which the clip does not hide. And an
 * element sticking out inside its own `overflow-x: auto` rail (a category rail,
 * a tab strip, a wide table) is intentional, so the walk up the ancestor chain
 * discounts anything a scroll container already clips.
 */
export async function measureOverflow(page: Page): Promise<OverflowReport> {
  return page.evaluate(() => {
    const describe = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      let depth = 0;
      while (node && depth < 4) {
        let part = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`${part}#${node.id}`);
          break;
        }
        const classes = (node.getAttribute('class') || '')
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .join('.');
        if (classes) part += `.${classes}`;
        parts.unshift(part);
        node = node.parentElement;
        depth += 1;
      }
      return parts.join(' > ');
    };

    const docEl = document.documentElement;
    const viewportWidth = docEl.clientWidth;
    const documentWidth = Math.max(docEl.scrollWidth, document.body.scrollWidth);

    const offenders: { selector: string; left: number; right: number }[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;

      let parent = el.parentElement;
      let clippedByScroller = false;
      while (parent && parent !== document.body) {
        if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowX)) {
          clippedByScroller = true;
          break;
        }
        parent = parent.parentElement;
      }
      if (!clippedByScroller) {
        offenders.push({
          selector: describe(el),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        });
      }
    }

    const widest = new Map<string, { selector: string; left: number; right: number }>();
    for (const offender of offenders) {
      const existing = widest.get(offender.selector);
      if (!existing || existing.right < offender.right) widest.set(offender.selector, offender);
    }

    return {
      viewportWidth,
      documentWidth,
      overflow: documentWidth - viewportWidth,
      offenders: Array.from(widest.values()).sort((a, b) => b.right - a.right).slice(0, 5),
    };
  });
}

/**
 * Waits until the document stops changing width.
 *
 * Lazy route chunks, demo fixtures and image loads each land in their own tick,
 * so a fixed `waitForTimeout` either measured a half-built page (flaky failures
 * under parallel workers) or wasted seconds on every route. Polling for a width
 * that has held steady across consecutive frames is both faster and stable.
 */
export async function waitForStableLayout(page: Page, timeoutMs = 10_000): Promise<void> {
  // A stable loading shell is not a stable application. Next's client boundary
  // can remain visible while a route chunk compiles in development, especially
  // when the responsive matrix runs several browsers in parallel.
  await page
    .getByRole('status', { name: /Chargement de Shongre/i })
    .waitFor({ state: 'detached', timeout: timeoutMs });

  await page.evaluate(async (budget) => {
    const readWidth = () => Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    const started = Date.now();
    let previous = -1;
    let steadyFrames = 0;
    while (Date.now() - started < budget) {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const current = readWidth();
      steadyFrames = current === previous ? steadyFrames + 1 : 0;
      previous = current;
      if (steadyFrames >= 6) return;
    }
  }, timeoutMs);
}

export async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const report = await measureOverflow(page);
  const detail = report.offenders
    .map((o) => `    ${o.selector}  [${o.left} → ${o.right}]`)
    .join('\n');
  expect(
    report.overflow,
    `${context} overflows by ${report.overflow}px ` +
      `(document ${report.documentWidth}px vs viewport ${report.viewportWidth}px)` +
      (detail ? `\n  caused by:\n${detail}` : ''),
  ).toBeLessThanOrEqual(1);
}
