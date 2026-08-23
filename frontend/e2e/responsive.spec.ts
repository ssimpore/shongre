import { test, expect } from "@playwright/test";
import { VIEWPORTS } from "./viewports";
import { ALL_ROUTES, PUBLIC_ROUTES } from "./routes";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

/**
 * No page may widen the document beyond the viewport, at any supported size.
 *
 * Every route is checked at the three sizes that historically broke — the
 * narrowest phone, the tablet gap just past `md`, and the point where `lg`
 * turns the desktop header on — and the public surfaces are checked across the
 * full matrix.
 */
const CRITICAL_WIDTHS = VIEWPORTS.filter((v) =>
  ["320-small-phone", "787-awkward-gap", "1024-lg-breakpoint"].includes(
    v.name,
  ),
);

test.describe("horizontal overflow", () => {
  for (const viewport of CRITICAL_WIDTHS) {
    test.describe(`at ${viewport.name}`, () => {
      for (const route of ALL_ROUTES) {
        test(`${route.name} does not widen the page`, async ({ page }) => {
          await page.setViewportSize({
            width: viewport.width,
            height: viewport.height,
          });
          await usePersona(page, route.persona);
          await page.goto(route.path, { waitUntil: "networkidle" });
          await waitForStableLayout(page);
          if (route.settleMs) await page.waitForTimeout(route.settleMs);
          await expectNoHorizontalOverflow(
            page,
            `${route.name} @ ${viewport.width}px`,
          );
        });
      }
    });
  }

  // The public surfaces carry the most layout variety, so they get the full
  // matrix rather than the three representative widths.
  for (const viewport of VIEWPORTS) {
    test(`public routes hold at ${viewport.name}`, async ({ page }) => {
      // This one test intentionally performs a complete public-route sweep.
      // Keep the global single-route budget strict and widen only this audit.
      test.setTimeout(90_000);
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await usePersona(page, "guest");
      for (const route of PUBLIC_ROUTES) {
        await page.goto(route.path, { waitUntil: "networkidle" });
        await waitForStableLayout(page);
        await expectNoHorizontalOverflow(
          page,
          `${route.name} @ ${viewport.width}px`,
        );
      }
    });
  }
});

/**
 * Open overlays have to stay inside the viewport too.
 *
 * The page-level overflow checks above never open anything, so a panel that
 * only exists after a click was invisible to them. The footer language picker
 * was exactly that: a 240px panel anchored to its trigger's left edge, with the
 * trigger sitting right of centre — on a phone it ran past the right edge and
 * widened the document, the one thing this file exists to prevent.
 */
test.describe("open dropdowns stay on screen", () => {
  for (const viewport of [
    { name: "320-small-phone", width: 320, height: 720 },
    { name: "375-iphone-se", width: 375, height: 812 },
    { name: "1280-laptop", width: 1280, height: 800 },
  ]) {
    test(`the language picker fits at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await usePersona(page, "guest");
      /* Seed a consent decision: the banner is pinned over the bottom of the page
         until answered, so it legitimately covers the footer controls. A visitor
         who has already chosen is the state this test is about. */
      await page.addInitScript(() => {
        window.localStorage.setItem(
          "shongre_cookie_consent_v1",
          JSON.stringify({
            version: 1,
            decidedAt: new Date().toISOString(),
            categories: { necessary: true, analytics: false, marketing: false },
          }),
        );
      });
      await page.goto("/", { waitUntil: "networkidle" });
      await waitForStableLayout(page);

      const trigger = page.locator("#footer-lang-button");
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();

      const box = await page.evaluate(() => {
        const menu = document.querySelector(
          '[role="menu"][aria-labelledby="footer-lang-button"]',
        );
        if (!menu) return null;
        const r = menu.getBoundingClientRect();
        return { left: r.left, right: r.right, viewport: window.innerWidth };
      });

      expect(box, "the language menu should be open").not.toBeNull();
      expect(box!.left, "menu runs off the left edge").toBeGreaterThanOrEqual(
        -1,
      );
      expect(box!.right, "menu runs off the right edge").toBeLessThanOrEqual(
        box!.viewport + 1,
      );

      // …and opening it must not have widened the document.
      await expectNoHorizontalOverflow(
        page,
        `language menu open @ ${viewport.name}`,
      );
    });
  }
});

/**
 * Controls sitting on one toolbar row share a height.
 *
 * The view-mode toggle sized itself from its own padding and came out at 28px
 * while the filter button and the sort control beside it were 32px, so every
 * listing toolbar had one item inset 2px from its neighbours. Nothing overflowed
 * and nothing was unreachable, so no existing gate could see it — it is purely a
 * question of whether the row looks deliberate.
 */
test.describe("toolbar controls align", () => {
  test("the mobile publish action is a compact square beside CSV actions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await usePersona(page, "individual_seller");
    await page.goto("/compte/annonces", { waitUntil: "networkidle" });
    await waitForStableLayout(page);

    const toolbar = page
      .locator("main")
      .locator("div.flex.items-center.gap-2.flex-wrap")
      .first();
    const publish = toolbar.getByRole("link", {
      name: "Déposer une annonce",
      exact: true,
    });
    const exportAction = toolbar.getByRole("button", {
      name: "Exporter (CSV)",
      exact: true,
    });
    const importAction = toolbar.getByRole("button", {
      name: "Importer (CSV)",
      exact: true,
    });

    await expect(publish).toHaveClass(/w-control-sm/);
    await expect(publish).toHaveAttribute("aria-label", "Déposer une annonce");

    const controls = await Promise.all(
      [publish, exportAction, importAction].map((control) =>
        control.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
          };
        }),
      ),
    );

    expect(
      controls[0].width,
      `publish action is not square: ${JSON.stringify(controls)}`,
    ).toBe(controls[0].height);
    expect(new Set(controls.map((control) => control.top)).size).toBe(1);
    await expectNoHorizontalOverflow(
      page,
      "my listings publish toolbar @ 375px",
    );
  });

  for (const [name, path] of [
    ["search", "/recherche"],
    ["pro storefront", "/boutique/atelier-nordique"],
  ] as const) {
    test(`${name} toolbar shares one control height`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await usePersona(page, "guest");
      await page.goto(path, { waitUntil: "networkidle" });
      await waitForStableLayout(page);

      const row = await page.evaluate(() => {
        const grid = [...document.querySelectorAll("button")].find((b) =>
          /affichage grille/i.test(b.getAttribute("aria-label") || ""),
        );
        if (!grid) return null;
        const toolbar = grid.parentElement!.parentElement!;
        return [...toolbar.children].map((child) => {
          const r = child.getBoundingClientRect();
          return { height: Math.round(r.height), top: Math.round(r.top) };
        });
      });

      expect(row, "expected a view-mode toggle on this page").not.toBeNull();
      expect(
        row!.length,
        "expected sibling controls beside the toggle",
      ).toBeGreaterThan(1);

      const heights = [...new Set(row!.map((c) => c.height))];
      const tops = [...new Set(row!.map((c) => c.top))];
      expect(
        heights,
        `toolbar heights differ: ${JSON.stringify(row)}`,
      ).toHaveLength(1);
      expect(
        tops,
        `toolbar items are not aligned: ${JSON.stringify(row)}`,
      ).toHaveLength(1);
    });
  }
});

/**
 * The two store badges are the same size as each other, at every width.
 *
 * They were `inline-flex` and therefore each sized to its own wording:
 * "Télécharger sur / l'App Store" is longer than "DISPONIBLE SUR / Google Play",
 * so the pair rendered visibly mismatched. Equal-width cells fix that, but
 * pairing them too early is its own bug — two columns gave 92px cells on a phone
 * and ellipsised the store name, which is equal width bought at the cost of the
 * one thing a store badge has to say. Both properties are asserted together.
 */
test.describe("app store badges", () => {
  for (const viewport of [
    { name: "320-small-phone", width: 320, height: 720 },
    { name: "375-iphone-se", width: 375, height: 812 },
    { name: "768-tablet-portrait", width: 768, height: 1024 },
    { name: "1440-desktop", width: 1440, height: 900 },
  ]) {
    test(`match each other at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await usePersona(page, "guest");
      await page.goto("/", { waitUntil: "networkidle" });
      await waitForStableLayout(page);

      const badges = await page.evaluate(() =>
        [...document.querySelectorAll("footer li")]
          .filter((li) => /app store|google play/i.test(li.textContent || ""))
          .map((li) => {
            const badge = li.firstElementChild as HTMLElement;
            const rect = badge.getBoundingClientRect();
            const labels = [
              ...badge.querySelectorAll("span span"),
            ] as HTMLElement[];
            return {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              // `sr-only` text is measured out of flow; only the visible pair matters.
              truncated: labels
                .filter((el) => !el.className.includes("sr-only"))
                .some((el) => el.scrollWidth > el.clientWidth + 1),
            };
          }),
      );

      expect(badges, "expected both store badges").toHaveLength(2);
      expect(badges[0].width, `widths differ: ${JSON.stringify(badges)}`).toBe(
        badges[1].width,
      );
      expect(
        badges[0].height,
        `heights differ: ${JSON.stringify(badges)}`,
      ).toBe(badges[1].height);
      expect(
        badges.some((b) => b.truncated),
        `a store name is ellipsised: ${JSON.stringify(badges)}`,
      ).toBe(false);
    });
  }
});

/**
 * The list view is a different view, not a narrower grid.
 *
 * `variant="list"` was `flex-col sm:flex-row`, so on a phone it stacked the
 * image above the details and rendered almost identically to the grid card —
 * the toggle changed the column count and nothing else. A thumbnail beside the
 * text is the whole point of a list. The overflow half of this test is not
 * incidental: a long Pro badge pushed the favourite button past the card's right
 * edge, where the card's own `overflow-hidden` clipped it out of sight.
 */
test.describe("list view cards", () => {
  for (const width of [320, 375, 430]) {
    test(`are horizontal and fit at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 812 });
      await usePersona(page, "guest");
      await page.goto("/recherche", { waitUntil: "networkidle" });
      await waitForStableLayout(page);

      await page
        .getByRole("button", { name: /affichage liste/i })
        .first()
        .click();
      await waitForStableLayout(page);

      const cards = await page.evaluate(() =>
        [...document.querySelectorAll("article")].slice(0, 6).map((card) => ({
          direction: getComputedStyle(card).flexDirection,
          overflows: card.scrollWidth > card.clientWidth + 1,
        })),
      );

      expect(cards.length, "expected list cards to render").toBeGreaterThan(0);
      expect(
        cards.filter((c) => c.direction !== "row"),
        `list cards must be horizontal: ${JSON.stringify(cards)}`,
      ).toEqual([]);
      expect(
        cards.filter((c) => c.overflows),
        `list card content overflows its box: ${JSON.stringify(cards)}`,
      ).toEqual([]);

      await expectNoHorizontalOverflow(page, `list view @ ${width}px`);
    });
  }
});

/**
 * The collections rail pages cleanly, one card at a time.
 *
 * Two things this pins that cannot be checked by eye in a CDP-driven browser:
 * `scrollBy({ behavior: 'smooth' })` does not animate there, so the arrows read
 * as dead on every rail — snapped or not — while working perfectly in real
 * Chromium. And the cards carried `snap-start` while the track never declared
 * `snap-x`, so half the snap contract was missing and a nudge left a card
 * stranded mid-word against the edge.
 */
test.describe("collections rail", () => {
  test("an arrow advances one card and leaves it flush", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "networkidle" });
    await waitForStableLayout(page);

    const heading = page.getByRole("heading", {
      name: /tendance en ce moment|collections du moment/i,
    });
    await heading.scrollIntoViewIfNeeded();
    const section = page.locator("section").filter({ has: heading });

    await section.getByRole("button", { name: /défiler|droite/i }).click();
    await page.waitForTimeout(1200);

    const state = await page.evaluate(() => {
      const h = [...document.querySelectorAll("h2")].find((x) =>
        /tendance en ce moment|collections du moment/i.test(
          (x as HTMLElement).innerText,
        ),
      );
      const track = [
        ...h!.closest("section")!.querySelectorAll("div.overflow-x-auto"),
      ].pop()!;
      const trackLeft = track.getBoundingClientRect().left;
      return {
        scrollLeft: Math.round(track.scrollLeft),
        offsets: [...track.querySelectorAll("a")]
          .map((c) => Math.round(c.getBoundingClientRect().left - trackLeft))
          .slice(0, 4),
        // The fades were removed; nothing should paint over the rail's edges.
        fades: h!
          .closest("section")!
          .querySelectorAll(
            '[class*="bg-gradient-to-r"],[class*="bg-gradient-to-l"]',
          ).length,
      };
    });

    expect(state.scrollLeft, "the arrow must scroll the rail").toBeGreaterThan(
      0,
    );
    expect(
      state.offsets.some((o) => Math.abs(o - 16) <= 3),
      `a card should land flush with the scroll padding: ${JSON.stringify(state.offsets)}`,
    ).toBe(true);
    expect(state.fades, "no gradient fade should sit over the rail edges").toBe(
      0,
    );
  });
});
