import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

test.describe("API-backed collections", () => {
  for (const width of [1408, 390]) {
    test(`matches listing-card corners across collection surfaces at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/");
      await expect(page).toHaveTitle(/Shongre/i);
      await waitForStableLayout(page);
      const listing = page.locator("[data-listing-card]").first();
      await expect(listing).toBeVisible();
      const radius = await listing.evaluate(
        (element) => getComputedStyle(element).borderRadius,
      );
      const collections = page.getByTestId("home-collection-explorer");
      const homeCards = collections.getByRole("link", {
        name: /^Explorer la collection/,
      });
      // The homepage intentionally swaps its below-fold placeholder for the
      // API-backed collection section. Waiting on a card lets Playwright
      // re-resolve that replacement instead of scrolling a detached wrapper.
      await expect(homeCards.first()).toBeVisible();
      for (const card of await homeCards.all()) {
        await expect(card).toHaveCSS("border-radius", radius);
        await expect(card).toHaveCSS("overflow", "hidden");
      }
      await expectNoHorizontalOverflow(page, "homepage collections");
      await collections
        .getByRole("link", { name: /^Voir (toutes les collections|tout)$/ })
        .click();
      await expect(page).toHaveURL(/\/collections$/);
      const cards = page.getByTestId("collections-grid").getByRole("link");
      await expect(cards.first()).toBeVisible();
      for (const card of await cards.all()) {
        await expect(card).toHaveCSS("border-radius", radius);
        await expect(card).toHaveCSS("overflow", "hidden");
      }
      await expectNoHorizontalOverflow(page, "collection catalog");
      await cards.first().click();
      await expect(page).toHaveURL(/\/collections\/[a-z0-9-]+$/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(listing).toBeVisible();
      await expect(listing).toHaveCSS("border-radius", radius);
      expect(errors).toEqual([]);
    });
  }

  test("renders only live taxonomy collections with inventory", async ({
    page,
  }) => {
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page.getByTestId("collections-grid").getByRole("link");
    await expect(cards.first()).toBeVisible();
    const hrefs = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("href")),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    expect(
      hrefs.every((href) => /^\/collections\/[a-z0-9-]+$/.test(href || "")),
    ).toBe(true);

    await cards.first().click();
    await expect(page).toHaveURL(/\/collections\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("keeps the API collection grid balanced on desktop", async ({
    page,
  }) => {
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page.getByTestId("collections-grid").getByRole("link");
    await expect(cards.first()).toBeVisible();
    const boxes = await cards.evaluateAll((elements) =>
      elements.slice(0, 5).map((element) => {
        const rect = element.getBoundingClientRect();
        return { height: Math.round(rect.height), top: Math.round(rect.top) };
      }),
    );
    expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
    expect(new Set(boxes.map((box) => box.height)).size).toBe(1);
  });

  test("keeps a two-column mobile grid without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page.getByTestId("collections-grid").getByRole("link");
    const positions = await cards.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: Math.round(rect.left), top: Math.round(rect.top) };
      }),
    );
    expect(positions.length).toBeGreaterThanOrEqual(2);
    expect(positions[0]?.top).toBe(positions[1]?.top);
    expect(positions[0]?.left).toBeLessThan(positions[1]?.left || 0);
    await expectNoHorizontalOverflow(page, "API collection grid");
  });

  test("renders an unknown collection as a real missing resource", async ({
    page,
  }) => {
    await page.goto("/collections/selection-inconnue", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Collection introuvable" }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
  });
});
