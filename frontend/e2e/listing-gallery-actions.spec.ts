import { testListingPath } from "./fixtures";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

async function toggleFavoriteAndConfirm(page: Page, control: Locator) {
  await expect(control).toBeEnabled();
  await expect(control).toHaveAttribute("aria-pressed", /^(true|false)$/);
  const expected = (await control.getAttribute("aria-pressed")) !== "true";
  const [response] = await Promise.all([
    page.waitForResponse(
      (candidate) =>
        candidate.request().method() === "PUT" &&
        /\/api\/v1\/listings\/[^/]+\/favorite$/.test(
          new URL(candidate.url()).pathname,
        ),
    ),
    control.click(),
  ]);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ isFavorite: expected });
  await expect(control).toBeEnabled();
  await expect(control).toHaveAttribute("aria-pressed", String(expected));
}

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

test("listing, property and vehicle details share the same favorite gallery action", async ({
  page,
}) => {
  await usePersona(page, "individual_buyer");
  await useEstablishedConsent(page);

  for (const viewport of [
    { width: 1408, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(testListingPath("list-105"), {
      waitUntil: "domcontentloaded",
    });
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

    await toggleFavoriteAndConfirm(page, listingFavorite);

    await page.goto("/immo/bien/appartement-lumineux-lyon-montchat", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const propertyFavorite = page.getByRole("button", {
      name: /favoris/i,
    });
    await expect(propertyFavorite).toBeVisible();
    await expect(propertyFavorite).toHaveText("");
    await expect(propertyFavorite).toHaveAttribute(
      "class",
      sharedFavoriteClasses!,
    );
    const propertyMedia = page
      .locator('[data-listing-gallery-actions="true"]')
      .locator("..");
    await expectActionInsideGallery(propertyMedia, propertyFavorite);
    await toggleFavoriteAndConfirm(page, propertyFavorite);
    await expectNoHorizontalOverflow(
      page,
      `property favorite overlay at ${viewport.width}px`,
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
  await useEstablishedConsent(page);

  for (const viewport of [
    { width: 1408, height: 701 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(testListingPath("list-103"), {
      waitUntil: "domcontentloaded",
    });
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

for (const width of [390, 1352]) {
  for (const reduced of [false, true]) {
    test(`gallery controls use shared feedback at ${width}px with reduced motion ${reduced}`, async ({
      page,
    }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await useEstablishedConsent(page);
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({
        reducedMotion: reduced ? "reduce" : "no-preference",
      });
      await page.goto(testListingPath("list-105"));
      await waitForStableLayout(page);
      const gallery = page.getByRole("group", {
        name: "Galerie de photos (2)",
      });
      const next = gallery.getByRole("button", { name: "Photo suivante" });
      const photo = gallery.locator("img").first();
      await next.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const initialPhoto = await photo.getAttribute("src");
      const resting = await next.boundingBox();
      const restingShadow = await next.evaluate(
        (element) => getComputedStyle(element).boxShadow,
      );
      await next.hover();
      expect(await next.boundingBox()).toEqual(resting);
      await expect(next).toHaveCSS("box-shadow", restingShadow);
      const pressScale = reduced
        ? 1
        : await next.evaluate((element) =>
            Number(
              getComputedStyle(element).getPropertyValue(
                "--motion-press-control-scale",
              ),
            ),
          );
      await page.mouse.down();
      await expect
        .poll(() =>
          next.evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              scale: style.scale === "none" ? 1 : Number(style.scale),
              outline: style.outlineStyle,
            };
          }),
        )
        .toEqual({ scale: pressScale, outline: "none" });
      await page.mouse.up();
      await expect(photo).not.toHaveAttribute("src", initialPhoto!);
      const open = gallery.getByRole("button", {
        name: "Agrandir en plein écran",
      });
      await open.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", {
        name: "Fermer le plein écran",
      });
      await page.keyboard.press("Tab");
      await close.focus();
      await expect(close).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(open).toBeFocused();
      await expectNoHorizontalOverflow(page, `gallery feedback at ${width}px`);
      if (!reduced && testInfo.project.name === "chromium") {
        await gallery.screenshot({
          path: `/tmp/shongre-gallery-feedback-${width}.png`,
        });
      }
      expect(errors).toEqual([]);
    });
  }
}
