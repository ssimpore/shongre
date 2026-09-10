import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("search map selection", () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test("renders the selected listing inside the map stage", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/recherche?view=map", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const mapStage = page.getByTestId("search-map-stage");
    const map = mapStage.locator(".maplibre-container");
    const marker = page.locator(".shongre-map-marker-wrapper").first();
    await expect(map).toBeVisible();
    await expect(marker).toBeVisible();

    await marker.dispatchEvent("click");

    const selectedListing = page.getByTestId("map-active-listing");
    await expect(selectedListing).toBeVisible();
    await expect(selectedListing).toHaveCSS("position", "absolute");

    const mapStageBox = await mapStage.boundingBox();
    const selectedListingBox = await selectedListing.boundingBox();
    expect(mapStageBox).not.toBeNull();
    expect(selectedListingBox).not.toBeNull();
    expect(selectedListingBox!.x).toBeGreaterThanOrEqual(mapStageBox!.x);
    expect(selectedListingBox!.y).toBeGreaterThanOrEqual(mapStageBox!.y);
    expect(
      selectedListingBox!.x + selectedListingBox!.width,
    ).toBeLessThanOrEqual(mapStageBox!.x + mapStageBox!.width);
    expect(
      selectedListingBox!.y + selectedListingBox!.height,
    ).toBeLessThanOrEqual(mapStageBox!.y + mapStageBox!.height);

    await selectedListing
      .getByRole("button", { name: /prévisualisation|preview/i })
      .click();
    await expect(selectedListing).toBeHidden();
    await expectNoHorizontalOverflow(page, "selected map listing");
  });

  test("keeps the selected listing contained and usable inside the map on mobile", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/recherche?view=map", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const mapStage = page.getByTestId("search-map-stage");
    const map = mapStage.locator(".maplibre-container");
    const marker = page.locator(".shongre-map-marker-wrapper").first();
    await expect(map).toBeVisible();
    await expect(marker).toBeVisible();

    await marker.dispatchEvent("click");

    const selectedListing = page.getByTestId("map-active-listing");
    await expect(selectedListing).toBeVisible();
    await expect(selectedListing).toHaveCSS("position", "absolute");
    await expect(
      selectedListing.getByRole("button", {
        name: /prévisualisation|preview/i,
      }),
    ).toBeVisible();

    const mapStageBox = await mapStage.boundingBox();
    const selectedListingBox = await selectedListing.boundingBox();
    expect(mapStageBox).not.toBeNull();
    expect(selectedListingBox).not.toBeNull();
    expect(selectedListingBox!.x).toBeGreaterThanOrEqual(mapStageBox!.x);
    expect(selectedListingBox!.y).toBeGreaterThanOrEqual(mapStageBox!.y);
    expect(
      selectedListingBox!.x + selectedListingBox!.width,
    ).toBeLessThanOrEqual(mapStageBox!.x + mapStageBox!.width);
    expect(
      selectedListingBox!.y + selectedListingBox!.height,
    ).toBeLessThanOrEqual(mapStageBox!.y + mapStageBox!.height);
    await expectNoHorizontalOverflow(page, "mobile selected map listing");
  });
});
