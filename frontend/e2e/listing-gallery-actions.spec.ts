import { expect, test, type Locator, type Page } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

const seedConsentDecision = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_cookie_consent_v1",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        choices: { analytics: false, advertising: false },
      }),
    );
  });
};

const expectActionInsideGallery = async (
  gallery: Locator,
  favorite: Locator,
) => {
  const galleryBox = await gallery.boundingBox();
  const favoriteBox = await favorite.boundingBox();

  expect(galleryBox).not.toBeNull();
  expect(favoriteBox).not.toBeNull();
  expect(favoriteBox!.x).toBeGreaterThanOrEqual(galleryBox!.x);
  expect(favoriteBox!.y).toBeGreaterThanOrEqual(galleryBox!.y);
  expect(favoriteBox!.x + favoriteBox!.width).toBeLessThanOrEqual(
    galleryBox!.x + galleryBox!.width,
  );
  expect(favoriteBox!.y + favoriteBox!.height).toBeLessThanOrEqual(
    galleryBox!.y + galleryBox!.height,
  );
};

test("listing and vehicle details share the same favorite gallery action", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await seedConsentDecision(page);

  for (const viewport of [
    { width: 1408, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/annonce/list-105", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const listingGallery = page.getByRole("group", {
      name: "Galerie de photos (2)",
    });
    const listingFavorite = listingGallery.getByRole("button", {
      name: /favoris/i,
    });
    await expect(listingFavorite).toBeVisible();
    await expectActionInsideGallery(listingGallery, listingFavorite);
    const sharedFavoriteClasses = await listingFavorite.getAttribute("class");
    expect(sharedFavoriteClasses).toContain("favorite-touch-target");

    const initialListingState =
      await listingFavorite.getAttribute("aria-pressed");
    await listingFavorite.click();
    await expect(listingFavorite).toHaveAttribute(
      "aria-pressed",
      initialListingState === "true" ? "false" : "true",
    );

    await page.goto("/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const vehicleGallery = page.getByRole("group", {
      name: "Galerie de photos (3)",
    });
    const vehicleFavorite = vehicleGallery.getByRole("button", {
      name: /favoris/i,
    });
    await expect(vehicleFavorite).toBeVisible();
    await expectActionInsideGallery(vehicleGallery, vehicleFavorite);
    await expect(vehicleFavorite).toHaveAttribute(
      "class",
      sharedFavoriteClasses!,
    );
    await expectNoHorizontalOverflow(
      page,
      `vehicle favorite overlay at ${viewport.width}px`,
    );
  }
});

test("listing details place the primary summary immediately below the media", async ({
  page,
}) => {
  await usePersona(page, "individual_seller");
  await seedConsentDecision(page);

  for (const viewport of [
    { width: 1408, height: 701 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/annonce/list-103", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const gallery = page.getByRole("group", {
      name: /Galerie de photos/,
    });
    const heading = page.getByRole("heading", {
      level: 1,
      name: /Apple iPhone 15 Pro/,
    });
    await expect(gallery).toBeVisible();
    await expect(heading).toBeVisible();

    const order = await gallery.evaluate((galleryElement) => {
      const headingElement = document.querySelector("h1");
      if (!headingElement) return null;
      return Boolean(
        galleryElement.compareDocumentPosition(headingElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(order, `summary should follow media at ${viewport.width}px`).toBe(
      true,
    );
    await expectNoHorizontalOverflow(
      page,
      `media-first listing detail at ${viewport.width}px`,
    );
  }
});
