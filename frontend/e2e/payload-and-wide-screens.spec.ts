import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

/**
 * Two gaps the rest of the suite cannot see.
 *
 * The responsive and accessibility matrices stop at 1440px, so nothing checked
 * what a 1920 or 2560 desktop actually renders, and no suite measures how many
 * bytes a route pulls over the network — the client bundle budget counts
 * JavaScript chunks only, which is how 735 KiB of taxonomy JSON per page view
 * survived a green build.
 */

/** Every route that fetches taxonomy, with what it legitimately needs. */
const TAXONOMY_PAYLOAD_BUDGET_BYTES = 150_000;

const RESULT_ROUTES = ["/recherche", "/auto", "/emploi"] as const;

test.describe("network payload", () => {
  for (const path of ["/", "/recherche", "/categorie/vehicules"]) {
    test(`${path} does not download the whole taxonomy`, async ({ page }) => {
      const taxonomyBytes: Array<[string, number]> = [];
      page.on("response", async (response) => {
        const url = response.url();
        if (!url.includes("/api/v1/taxonomy/")) return;
        try {
          taxonomyBytes.push([url, (await response.body()).length]);
        } catch {
          /* A response the browser discarded cannot be weighed; skip it. */
        }
      });

      await usePersona(page, "guest");
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      await page.waitForTimeout(1_500);

      const total = taxonomyBytes.reduce((sum, [, bytes]) => sum + bytes, 0);
      const breakdown = taxonomyBytes
        .map(([url, bytes]) => `${new URL(url).pathname} ${bytes}B`)
        .join(", ");
      expect(
        total,
        `${path} pulled ${total}B of taxonomy (${breakdown}). The unprojected ` +
          `tree is ~735 KiB; ask for a category or a depth instead.`,
      ).toBeLessThan(TAXONOMY_PAYLOAD_BUDGET_BYTES);
    });
  }
});

test.describe("large desktop screens", () => {
  for (const width of [1680, 1920, 2560]) {
    for (const path of RESULT_ROUTES) {
      test(`${path} uses the width available at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await usePersona(page, "guest");
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await waitForStableLayout(page);

        await expectNoHorizontalOverflow(page, `${path} at ${width}px`);

        const contentWidth = await page.evaluate(() => {
          const main = document.querySelector("main") ?? document.body;
          let widest = 0;
          for (const element of main.querySelectorAll<HTMLElement>("*")) {
            const style = getComputedStyle(element);
            if (style.maxWidth === "none") continue;
            const rect = element.getBoundingClientRect();
            if (rect.height > 100 && rect.width > widest) widest = rect.width;
          }
          return Math.round(widest);
        });

        /* Results were capped at `page` (1280px) on every screen, so a 1920
           desktop spent a third of its width on gutters and still showed four
           columns. `results` widens one step past `xl`. */
        expect(
          contentWidth,
          `${path} still caps its results at ${contentWidth}px on a ${width}px screen`,
        ).toBeGreaterThan(1_280);
      });
    }
  }
});

test.describe("consent banner", () => {
  /* It is the first thing a visitor sees and the last thing they want to read.
     Three stacked 44px buttons made it 348px tall on a 390x664 phone — 52% of
     the viewport, and the page's largest contentful paint. */
  const MAX_VIEWPORT_SHARE = 0.48;

  for (const [width, height] of [
    [320, 720],
    [390, 664],
    [430, 932],
  ] as const) {
    test(`covers less than half of a ${width}x${height} phone`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      // Deliberately *not* `useEstablishedConsent`: the banner has to be up.
      await usePersona(page, "guest");
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const banner = page.locator('[aria-labelledby="cookie-banner-title"]');
      await expect(banner).toBeVisible();
      const box = await banner.boundingBox();
      expect(box).not.toBeNull();
      const share = (box?.height ?? 0) / height;
      expect(
        share,
        `consent banner is ${Math.round(box?.height ?? 0)}px tall, ` +
          `${Math.round(share * 100)}% of a ${height}px viewport`,
      ).toBeLessThan(MAX_VIEWPORT_SHARE);

      // Refusing must stay exactly as reachable as accepting.
      for (const name of ["Tout accepter", "Tout refuser"]) {
        await expect(page.getByRole("button", { name })).toBeVisible();
      }
      await expectNoHorizontalOverflow(
        page,
        `consent banner at ${width}x${height}`,
      );
    });
  }
});
