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
