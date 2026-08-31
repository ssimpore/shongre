import { Page, expect } from "@playwright/test";

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
        const classes = (node.getAttribute("class") || "")
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 3)
          .join(".");
        if (classes) part += `.${classes}`;
        parts.unshift(part);
        node = node.parentElement;
        depth += 1;
      }
      return parts.join(" > ");
    };

    const docEl = document.documentElement;
    const viewportWidth = docEl.clientWidth;
    const documentWidth = Math.max(
      docEl.scrollWidth,
      document.body.scrollWidth,
    );

    const offenders: { selector: string; left: number; right: number }[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none") continue;
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;

      let parent = el.parentElement;
      let clippedByScroller = false;
      while (parent && parent !== document.body) {
        if (
          /(auto|scroll|hidden|clip)/.test(getComputedStyle(parent).overflowX)
        ) {
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

    const widest = new Map<
      string,
      { selector: string; left: number; right: number }
    >();
    for (const offender of offenders) {
      const existing = widest.get(offender.selector);
      if (!existing || existing.right < offender.right)
        widest.set(offender.selector, offender);
    }

    return {
      viewportWidth,
      documentWidth,
      overflow: documentWidth - viewportWidth,
      offenders: Array.from(widest.values())
        .sort((a, b) => b.right - a.right)
        .slice(0, 5),
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
export async function waitForStableLayout(
  page: Page,
  timeoutMs = 15_000,
): Promise<void> {
  // Lazy route chunks can arrive after DOMContentLoaded, while remote demo
  // media can keep the page from ever becoming fully network-idle. Give route
  // code a short, bounded quiet window, then rely on application and layout
  // signals below instead of allowing `networkidle` to consume the test budget.
  await page
    .waitForLoadState("networkidle", { timeout: Math.min(timeoutMs, 3_000) })
    .catch(() => undefined);

  // Waiting only for the loading status to be detached has a cold-start race:
  // immediately after DOMContentLoaded the status may not have mounted yet, so
  // "detached" succeeds before the lazy client application renders. Require
  // the application shell's main content or banner as a positive ready signal.
  // A server-rendered 404 deliberately has neither shell marker, but its main
  // landmark is still the complete document that accessibility and overflow
  // checks must inspect.
  await page
    .locator('#main-content, [role="banner"], main')
    .first()
    .waitFor({ state: "attached", timeout: timeoutMs });
  await page
    .getByRole("status", { name: /Chargement (?:de Shongre|de la page)/i })
    .waitFor({ state: "detached", timeout: timeoutMs });

  await page.evaluate(async (budget) => {
    const readWidth = () =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const started = Date.now();
    let previous = -1;
    let steadyFrames = 0;
    while (Date.now() - started < budget) {
      // WebKit and Chromium may throttle a background worker page while the
      // exhaustive route matrix runs in parallel. A bare animation-frame wait
      // can then consume the test's entire timeout even though the document is
      // already stable. Keep frames as the preferred signal, but guarantee
      // forward progress when the browser suspends them.
      await new Promise<void>((resolve) => {
        const fallback = window.setTimeout(resolve, 100);
        requestAnimationFrame(() => {
          window.clearTimeout(fallback);
          resolve();
        });
      });
      const current = readWidth();
      steadyFrames = current === previous ? steadyFrames + 1 : 0;
      previous = current;
      if (steadyFrames >= 6) return;
    }
  }, timeoutMs);

  // Geometry may already be stable while an asynchronously enabled control is
  // still crossing its token-backed opacity transition. Axe would then measure
  // a blended, non-interactive frame rather than either the disabled or ready
  // state. Wait only for transitions that are already active on shared
  // interactive controls, and keep the wait bounded in case a control is
  // replaced while its transition is running.
  await page.evaluate(async () => {
    const transitions = document.getAnimations().filter((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      return target instanceof Element && target.matches(".motion-interactive");
    });
    if (transitions.length === 0) return;
    await Promise.race([
      Promise.all(
        transitions.map((transition) =>
          transition.finished.catch(() => undefined),
        ),
      ),
      new Promise<void>((resolve) => window.setTimeout(resolve, 500)),
    ]);
  });
}

export async function expectNoHorizontalOverflow(
  page: Page,
  context: string,
): Promise<void> {
  const report = await measureOverflow(page);
  const detail = report.offenders
    .map((o) => `    ${o.selector}  [${o.left} → ${o.right}]`)
    .join("\n");
  expect(
    report.overflow,
    `${context} overflows by ${report.overflow}px ` +
      `(document ${report.documentWidth}px vs viewport ${report.viewportWidth}px)` +
      (detail ? `\n  caused by:\n${detail}` : ""),
  ).toBeLessThanOrEqual(1);
}
