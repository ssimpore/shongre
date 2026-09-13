import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { testListingId, testListingPath } from "./fixtures";
import { useEstablishedConsent, usePersona } from "./personas";
import { waitForStableLayout, expectNoHorizontalOverflow } from "./overflow";

function cardFor(page: Page, sourceId: string) {
  return page
    .locator('[data-listing-card="true"]')
    .filter({ has: page.locator(`a[href="${testListingPath(sourceId)}"]`) })
    .first();
}

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

for (const width of [390, 1408]) {
  test(`listing promotion badges preserve meaning and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    for (const [id, expected] of [
      ["list-102", ["À la une", "En promotion"]],
      ["list-103", ["Urgent"]],
      ["list-107", ["Sponsorisé", "En promotion"]],
      ["list-105", ["En promotion"]],
      ["list-111", []],
    ] as const) {
      const card = cardFor(page, id);
      await card.scrollIntoViewIfNeeded();
      await expect(card.locator("[data-listing-badge]")).toHaveText([
        ...expected,
      ]);
      const layout = await card.evaluate((element) => {
        const favorite = element
          .querySelector('[data-listing-card-actions="true"]')
          ?.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return [
          ...element.querySelectorAll<HTMLElement>("[data-listing-badge]"),
        ].map((badge) => {
          const rect = badge.getBoundingClientRect();
          return {
            fits: rect.left >= bounds.left && rect.right <= bounds.right,
            textFits: badge.scrollWidth <= badge.clientWidth + 1,
            textTransform: getComputedStyle(badge.querySelector("span")!)
              .textTransform,
            overlapsFavorite: favorite
              ? rect.left < favorite.right &&
                rect.right > favorite.left &&
                rect.top < favorite.bottom &&
                rect.bottom > favorite.top
              : false,
          };
        });
      });
      for (const badge of layout)
        expect(badge).toEqual({
          fits: true,
          textFits: true,
          textTransform: "none",
          overlapsFavorite: false,
        });
      const results = await new AxeBuilder({ page })
        .include(
          `[data-listing-card="true"]:has(a[href="${testListingPath(id)}"])`,
        )
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
    await expectNoHorizontalOverflow(page, "listing promotion badges");
  });
}

test("listing detail uses the same featured and price-promotion labels", async ({
  page,
}) => {
  await page.goto(testListingPath("list-102"), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Peugeot",
  );
  await expect(
    page.locator('[data-listing-badge="featured"]').first(),
  ).toHaveText("À la une");
  await expect(
    page.locator('[data-listing-badge="promotion"]').first(),
  ).toHaveText("En promotion");
});

test("sponsored search placement stays disclosed on listing detail", async ({
  page,
}) => {
  await page.goto(testListingPath("list-107"), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator('[data-listing-badge="sponsored"]')).toHaveText(
    "Sponsorisé",
  );
});

test("specialized employment detail uses the sponsored label", async ({
  page,
}) => {
  await page.goto(
    "/emploi/offre/mission-product-designer-senior-job-freelance-remote",
    { waitUntil: "domcontentloaded" },
  );
  const badge = page.getByTestId("employment-job-promotion");
  await expect(badge).toHaveAttribute("data-listing-badge", "sponsored");
  await expect(badge).toHaveText("Sponsorisé");
});

test("an already rendered paid badge disappears when its backend schedule ends", async ({
  page,
}) => {
  const response = await page.request.get(
    `/api/v1/listings/${testListingId("list-103")}`,
    { headers: { "X-Shongre-Market": "FR" } },
  );
  expect(response.ok()).toBe(true);
  const listing = await response.json();
  expect(listing.promotionState).toBe("active");
  const end = Date.parse(listing.promotionEndAt);
  expect(Number.isFinite(end)).toBe(true);
  await page.clock.install({ time: end - 60_000 });
  await page.goto("/recherche", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
  const card = cardFor(page, "list-103");
  await card.scrollIntoViewIfNeeded();
  await expect(card.locator('[data-listing-badge="urgent"]')).toHaveText(
    "Urgent",
  );
  await page.clock.fastForward(61_000);
  await expect(card.locator("[data-listing-badge]")).toHaveCount(0);
});
