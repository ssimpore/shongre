import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

/**
 * Guards for the defects the August 2026 audit found in the running product.
 *
 * Each of these was live while the rest of the suite was green, so the point of
 * this file is to encode the *measurement* that would have caught it, not just
 * the symptom.
 */

test.describe("header search field", () => {
  /* It collapsed from 499px at 1023 to 32px at 1024 — the `lg` breakpoint
     reveals the category and location triggers, which squeezed a `min-w-[60px]`
     field past its own minimum. 1024 is iPad landscape, so this was a real
     device, not a synthetic width. */
  const MIN_USABLE_WIDTH = 100;

  for (const width of [768, 834, 1023, 1024, 1100, 1280, 1440]) {
    test(`stays usable at ${width}px`, async ({ page }) => {
      await usePersona(page, "guest");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const measured = await page.evaluate(() => {
        const header = document.querySelector("header");
        const input = [
          ...(header?.querySelectorAll('input[type="search"]') ?? []),
        ].find((el) => el.getBoundingClientRect().width > 0);
        return input ? Math.round(input.getBoundingClientRect().width) : null;
      });

      // Below `md` the field lives in the drawer rather than the header.
      if (measured === null) return;
      expect(
        measured,
        `header search field is ${measured}px wide at ${width}px — too narrow to type in`,
      ).toBeGreaterThanOrEqual(MIN_USABLE_WIDTH);
    });
  }
});

test.describe("homepage hero rail", () => {
  test("always rests on a slide boundary, and the arrows keep working", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const offset = () =>
      page.evaluate(() => {
        const rail = document.getElementById("hero-boosted-track");
        if (!rail || rail.clientWidth === 0) return null;
        return {
          remainder: Math.round((rail.scrollLeft % rail.clientWidth) * 10) / 10,
          scrollLeft: Math.round(rail.scrollLeft),
        };
      });

    const initial = await offset();
    test.skip(initial === null, "hero rail not rendered");
    expect(initial!.remainder, "hero rail rests between two slides").toBe(0);

    /* The wedge: `snap-mandatory` refuses programmatic scrolls once the rail is
       off-grid, which killed the arrows and the autoplay together. */
    await page.getByRole("button", { name: "Annonce suivante" }).click();
    await page.waitForTimeout(800);
    const afterNext = await offset();
    expect(
      afterNext!.scrollLeft,
      "the next arrow did not move the rail",
    ).toBeGreaterThan(initial!.scrollLeft);
    expect(afterNext!.remainder).toBe(0);

    // A resize changes the slide pitch; nothing used to re-anchor the rail.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(900);
    expect(
      (await offset())!.remainder,
      "hero rail drifted off-grid after a resize",
    ).toBe(0);

    await page.getByRole("button", { name: "Annonce suivante" }).click();
    await page.waitForTimeout(800);
    expect(
      (await offset())!.remainder,
      "the arrows stopped working after a resize",
    ).toBe(0);
  });
});

test.describe("search matching", () => {
  /* French shoppers type without accents. `velo` returned nothing while `vélo`
     returned results, and the autocomplete suggested a category the results
     page then refused to deliver. */
  const resultCount = async (
    page: import("@playwright/test").Page,
    query: string,
  ) => {
    await page.goto(`/recherche?query=${encodeURIComponent(query)}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    return page.evaluate(() => {
      const status = [...document.querySelectorAll('[role="status"]')]
        .map((el) => el.textContent?.trim() ?? "")
        .find((text) => /annonces?/.test(text));
      return Number.parseInt(status ?? "0", 10) || 0;
    });
  };

  for (const [plain, accented] of [
    ["velo", "vélo"],
    ["cafe", "café"],
    ["sezane", "Sézane"],
  ]) {
    test(`"${plain}" finds what "${accented}" finds`, async ({ page }) => {
      await usePersona(page, "guest");
      const withoutAccents = await resultCount(page, plain);
      const withAccents = await resultCount(page, accented);

      expect(
        withAccents,
        `"${accented}" itself returned nothing — fixture drift`,
      ).toBeGreaterThan(0);
      expect(
        withoutAccents,
        `"${plain}" returned ${withoutAccents} but "${accented}" returned ${withAccents}`,
      ).toBe(withAccents);
    });
  }
});

test.describe("publish wizard", () => {
  test("cannot skip ahead, and does not tick steps it skipped", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/deposer", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const phase = () =>
      page.evaluate(() => ({
        step: document
          .querySelector('[role="progressbar"]')
          ?.getAttribute("aria-valuenow"),
        ticks: [...document.querySelectorAll("ol li button")].filter(
          (b) => b.querySelector("span")?.textContent?.trim() === "✓",
        ).length,
      }));

    const start = await phase();
    expect(start.step).toBe("1");

    // The last phase must not be reachable from an empty draft…
    const lastStep = page.getByRole("button", { name: /Remise & livraison/i });
    await expect(lastStep).toHaveAttribute("aria-disabled", "true");

    // …and no phase may claim to be done while it is not.
    const after = await phase();
    expect(after.step).toBe("1");
    expect(
      after.ticks,
      "a phase was marked complete without being filled in",
    ).toBe(start.ticks);
  });
});

test.describe("listbox keyboard contract", () => {
  /* `DropdownMenu` renders `role="listbox"` with `role="option"` children, but
     had no key handling at all: Down did nothing, the only way through the
     options was to Tab across every one, and Escape dropped focus on <body> —
     leaving a keyboard user at the top of the document with no way back to the
     control they had just closed. axe cannot see any of this; the roles are
     correct, only the behaviour the roles promise was missing. */
  const openSort = async (page: import("@playwright/test").Page) => {
    const trigger = page.getByRole("button", { name: "Trier les résultats" });
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    // The panel paints before the effect that seeds the active option commits;
    // reading `aria-activedescendant` any earlier races React, not the product.
    await expect(trigger).toHaveAttribute("aria-activedescendant", /./);
    return trigger;
  };

  const activeOptionText = (page: import("@playwright/test").Page) =>
    page.evaluate(() => {
      const t = document.querySelector('[aria-haspopup="listbox"]');
      const id = t?.getAttribute("aria-activedescendant");
      return id ? (document.getElementById(id)?.textContent?.trim() ?? "") : "";
    });

  test.beforeEach(async ({ page }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
  });

  test("arrow keys move a visible active option", async ({ page }) => {
    await openSort(page);
    const first = await activeOptionText(page);
    expect(first, "opening should land on the current selection").not.toBe("");

    await page.keyboard.press("ArrowDown");
    const second = await activeOptionText(page);
    expect(second, "ArrowDown must move the active option").not.toBe(first);

    await page.keyboard.press("ArrowUp");
    expect(await activeOptionText(page)).toBe(first);

    await page.keyboard.press("End");
    const last = await activeOptionText(page);
    await page.keyboard.press("Home");
    expect(await activeOptionText(page)).toBe(first);
    expect(last).not.toBe(first);
  });

  test("options are not tab stops while the listbox owns the keyboard", async ({
    page,
  }) => {
    await openSort(page);
    const optionTabIndexes = await page
      .getByRole("option")
      .evaluateAll((els) => els.map((e) => e.getAttribute("tabindex")));
    expect(optionTabIndexes.every((t) => t === "-1")).toBe(true);
  });

  test("Escape closes and returns focus to the trigger", async ({ page }) => {
    const trigger = await openSort(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  /* Escape dismisses the innermost surface. The dialog hook listens on
     `document` in the capture phase, so before the popup could mark itself the
     drawer always won: opening the sort menu inside the mobile filter sheet and
     pressing Escape closed the whole sheet, losing every filter set in it. */
  test("Escape inside a drawer closes the menu, not the drawer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: /filtre/i })
      .first()
      .click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    const trigger = drawer.locator('[aria-haspopup="listbox"]').first();
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(
      drawer,
      "the drawer must survive the first Escape",
    ).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
  });

  test("Enter commits the active option and restores focus", async ({
    page,
  }) => {
    const trigger = await openSort(page);
    await page.keyboard.press("ArrowDown");
    const chosen = await activeOptionText(page);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText(chosen);
  });
});

test.describe("drawer presentation", () => {
  test("the CRM evidence drawer is a full-height right side sheet", async ({
    page,
  }) => {
    await usePersona(page, "commercial");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/admin/crm/prospection", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const query = page.getByRole("textbox", {
      name: /décrivez les prospects/i,
    });
    await query.fill("Boutiques de mobilier design vintage en France");
    await page
      .getByRole("button", { name: /lancer la prospection/i })
      .click();

    const sourceAction = page
      .getByRole("button", { name: /source/i })
      .first();
    await expect(sourceAction).toBeVisible();
    await sourceAction.click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/sources et justification/i);
    await expect
      .poll(() =>
        drawer.evaluate((element) =>
          Math.round(
            element.getBoundingClientRect().right - window.innerWidth,
          ),
        ),
      )
      .toBe(0);

    const measured = await drawer.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        top: Math.round(bounds.top),
        right: Math.round(bounds.right),
        bottom: Math.round(bounds.bottom),
        width: Math.round(bounds.width),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        focusInside: element.contains(document.activeElement),
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      };
    });

    expect(measured).toMatchObject({
      top: 0,
      right: measured.viewportWidth,
      bottom: measured.viewportHeight,
      focusInside: true,
      overflowX: 0,
    });
    expect(measured.width).toBeGreaterThanOrEqual(400);
    expect(measured.width).toBeLessThanOrEqual(512);

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(sourceAction).toBeFocused();
  });
});

test.describe("declared-token classes", () => {
  /* `shadow-card` was referenced by 14 call sites and never declared, so every
     employment/immo/auto card rendered with no elevation and three `hover:`
     transitions animated nothing. Tailwind emits no CSS for an undeclared
     token and no warning either, which is why this needs a runtime assertion:
     compare what the DOM asks for against what the stylesheet actually emits. */
  test("every class the DOM uses resolves to a rule", async ({ page }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/emploi", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const dead = await page.evaluate(() => {
      const emitted = new Set<string>();
      const visit = (rules: CSSRuleList) => {
        for (const r of rules) {
          const nested = (r as CSSGroupingRule).cssRules;
          if (nested) visit(nested);
          const sel = (r as CSSStyleRule).selectorText;
          if (!sel) continue;
          // Tailwind escapes `.`, `:`, `/` and a leading digit (`.\32 xl\:…`).
          for (const m of sel.matchAll(/\.((?:\\.|[^\s.,:>+~()[\]#\\])+)/g)) {
            emitted.add(m[1].replace(/\\/g, ""));
          }
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          visit(sheet.cssRules);
        } catch {
          /* cross-origin sheet */
        }
      }
      // Third-party libraries ship class names with no CSS of their own, and
      // two marker classes exist purely as test hooks.
      const ignore =
        /^(?:lucide|recharts|leaflet|inter_|jsx-|css-|__|\d|listing-grid$|listing-rail-track$)/;
      const used = new Set<string>();
      for (const el of document.querySelectorAll("[class]")) {
        for (const c of el.getAttribute("class")!.split(/\s+/)) {
          if (c && !ignore.test(c) && !emitted.has(c)) used.add(c);
        }
      }
      return [...used];
    });

    expect(dead, `classes with no CSS rule: ${dead.join(", ")}`).toEqual([]);
  });
});
