import { testListingPath } from "./fixtures";
import { expect, test, type Page } from "@playwright/test";
import type { components } from "@shongre/contracts/openapi";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";
import { browserApi } from "./browser-api";

/*
 * The document carries the market-wide experience, so a visitor's browser
 * never requests `/api/v1/home` for the first paint; the composition the page
 * was rendered from is read through the same first-party transport instead.
 */
async function openHomepage(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const { status, body } = await browserApi(
    page,
    "/home?market=FR&country=FR&locale=fr-FR",
  );
  expect(status).toBe(200);
  const experience = body as components["schemas"]["HomepageExperience"];
  await waitForStableLayout(page);
  const groups =
    experience.sections.find((section) => section.type === "universe_explorer")
      ?.universeGroups ?? [];
  expect(groups.map((group) => group.categoryId).sort()).toEqual([
    "fashion",
    "home_garden",
    "vehicles",
  ]);
  return groups;
}

test.describe("Homepage universe explorer", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
  });

  test("shows corresponding, harmonized listing rails in every universe", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    const groups = await openHomepage(page);

    const explorer = page.getByTestId("home-universe-explorer");
    await explorer.scrollIntoViewIfNeeded();
    await expect(
      explorer.getByRole("heading", { name: "Explorez par univers" }),
    ).toBeVisible();
    await expect(
      explorer.getByText("Trouvez rapidement ce qui vous intéresse"),
    ).toBeVisible();

    const home = explorer.locator('[data-home-universe-group="home_garden"]');
    const vehicles = explorer.locator('[data-home-universe-group="vehicles"]');
    const fashion = explorer.locator('[data-home-universe-group="fashion"]');
    await expect(explorer.locator("[data-home-universe-group]")).toHaveCount(3);
    await expect(
      home.getByRole("heading", { name: "Maison & Jardin" }),
    ).toBeVisible();
    await expect(
      vehicles.getByRole("heading", { name: "Véhicules" }),
    ).toBeAttached();
    await expect(fashion.getByRole("heading", { name: "Mode" })).toBeAttached();

    for (const group of groups) {
      expect(group.listings.length).toBeGreaterThan(0);
      await expect(
        explorer.locator(
          `[data-home-universe-group="${group.categoryId}"] [data-listing-card]`,
        ),
      ).toHaveCount(group.listings.length);
    }

    const cards = explorer.locator("[data-listing-card]");
    await expect(cards).toHaveCount(
      groups.reduce((count, group) => count + group.listings.length, 0),
    );
    expect(
      await cards.evaluateAll((elements) =>
        elements.every(
          (element) =>
            element.getAttribute("data-listing-card-variant") === "showcase",
        ),
      ),
    ).toBe(true);
    const radiusContract = await cards.evaluateAll((elements) => {
      const rootStyles = getComputedStyle(document.documentElement);
      const listingToken = rootStyles
        .getPropertyValue("--radius-listing-card")
        .trim();
      const controlToken = rootStyles
        .getPropertyValue("--radius-control")
        .trim();
      const rootFontSize = Number.parseFloat(rootStyles.fontSize);
      const expectedPixels = Number.parseFloat(listingToken) * rootFontSize;

      return {
        listingToken,
        controlToken,
        expectedPixels,
        renderedPixels: elements.map((card) =>
          Number.parseFloat(getComputedStyle(card).borderTopLeftRadius),
        ),
      };
    });
    expect(radiusContract.listingToken).toBe(radiusContract.controlToken);
    for (const renderedPixels of radiusContract.renderedPixels) {
      expect(renderedPixels).toBeCloseTo(radiusContract.expectedPixels, 1);
    }
    for (const group of [home, vehicles, fashion]) {
      await group.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          group.locator("[data-listing-card]").evaluateAll((elements) => {
            const heights = elements.map(
              (element) => element.getBoundingClientRect().height,
            );
            return (
              Math.max(...heights) - Math.min(...heights) < 1 &&
              elements.every(
                (element) => element.scrollHeight <= element.clientHeight + 1,
              )
            );
          }),
        )
        .toBe(true);
    }

    await expect(
      home.getByRole("link", {
        name: /Fauteuil Lounge Vintage Scandinave en Chêne Massif/i,
      }),
    ).toHaveAttribute("href", testListingPath("list-101"));
    await expect(
      fashion.getByRole("link", { name: /Manteau Long en Laine Sézane/i }),
    ).toHaveAttribute("href", testListingPath("list-105"));

    await expect(home.getByRole("link", { name: "Voir tout" })).toHaveAttribute(
      "href",
      "/categorie/maison-jardin",
    );
    await expect(
      vehicles.getByRole("link", { name: "Voir tout" }),
    ).toHaveAttribute("href", "/categorie/vehicules");
    await expect(
      fashion.getByRole("link", { name: "Voir tout" }),
    ).toHaveAttribute("href", "/categorie/mode");

    const discovery = page.getByTestId("home-discovery-deals");
    const collections = page.getByTestId("home-collection-explorer");
    const order = await page.locator("main").evaluate(() => {
      const deals = document.querySelector(
        '[data-testid="home-discovery-deals"]',
      );
      const universes = document.querySelector(
        '[data-testid="home-universe-explorer"]',
      );
      const collection = document.querySelector(
        '[data-testid="home-collection-explorer"]',
      );
      if (!deals || !universes || !collection) return false;
      return (
        Boolean(
          deals.compareDocumentPosition(universes) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        Boolean(
          universes.compareDocumentPosition(collection) &
          Node.DOCUMENT_POSITION_FOLLOWING,
        )
      );
    });
    await expect(discovery).toBeAttached();
    await expect(collections).toBeAttached();
    expect(order).toBe(true);
    await expectNoHorizontalOverflow(page, "homepage universe explorer");
  });

  test("keeps the listing rail usable on mobile and category actions navigable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const groups = await openHomepage(page);

    const explorer = page.getByTestId("home-universe-explorer");
    const vehicles = explorer.locator('[data-home-universe-group="vehicles"]');
    await vehicles.scrollIntoViewIfNeeded();
    await expect(vehicles.locator("[data-listing-card]")).toHaveCount(
      groups.find((group) => group.categoryId === "vehicles")!.listings.length,
    );

    const rail = vehicles.locator(".overflow-x-auto");
    const dimensions = await rail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    await expect(vehicles.locator(".listing-rail-control")).toBeHidden();

    const initialScroll = await rail.evaluate((element) => element.scrollLeft);
    await rail.evaluate((element) =>
      element.scrollBy({ left: element.clientWidth, behavior: "instant" }),
    );
    await expect
      .poll(() => rail.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(initialScroll);
    await expectNoHorizontalOverflow(page, "mobile universe listing rail");

    await vehicles.getByRole("link", { name: "Voir tout" }).click();
    await expect(page).toHaveURL(/\/categorie\/vehicules$/);
  });
});
