import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("boosted listings hero rail", () => {
  test("keeps pause and favorite controls visible, separate, and independently clickable", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");

    for (const viewport of [
      { width: 1408, height: 701 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const pause = page.getByRole("button", {
        name: "Mettre le carrousel en pause",
      });
      await expect(pause).toBeVisible();
      const pauseBox = await pause.boundingBox();
      expect(pauseBox).not.toBeNull();
      await pause.click();
      await expect(
        page.getByRole("button", { name: "Relancer le carrousel" }),
      ).toBeVisible();

      const favorite = page
        .locator('#hero-boosted-track article[aria-hidden="false"]')
        .locator('button[data-marketplace-action="favorite.manage"]');
      await expect(favorite).toBeVisible();

      const favoriteBox = await favorite.boundingBox();
      expect(favoriteBox).not.toBeNull();
      const overlaps =
        pauseBox!.x < favoriteBox!.x + favoriteBox!.width &&
        pauseBox!.x + pauseBox!.width > favoriteBox!.x &&
        pauseBox!.y < favoriteBox!.y + favoriteBox!.height &&
        pauseBox!.y + pauseBox!.height > favoriteBox!.y;
      expect(overlaps).toBe(false);

      const favoriteIsTopTarget = await favorite.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const target = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return target?.closest('[data-marketplace-action="favorite.manage"]') ===
          button;
      });
      expect(favoriteIsTopTarget).toBe(true);

      const wasFavorite = await favorite.getAttribute("aria-pressed");
      await favorite.click();
      await expect(favorite).not.toHaveAttribute("aria-pressed", wasFavorite!);
    }
  });

  test("marks boosted listings with the shared featured icon", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const rail = page.locator("#hero-boosted-track");
    await expect(rail).toBeVisible();
    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();
    await page.getByRole("button", { name: "Annonce suivante" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Annonce suivante" }).click();
    const targetListing = rail.locator('article[aria-hidden="false"]');
    await expect(
      targetListing.locator(".sr-only", { hasText: "Annonce à la une" }),
    ).toBeAttached();
    await expectNoHorizontalOverflow(page, "boosted hero rail");
  });

  test("keeps the boosted indicator available on a mobile hero viewport", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const rail = page.locator("#hero-boosted-track");
    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();
    await page.getByRole("button", { name: "Annonce suivante" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Annonce suivante" }).click();
    const targetListing = rail.locator('article[aria-hidden="false"]');
    await expect(
      targetListing.locator(".sr-only", { hasText: "Annonce à la une" }),
    ).toBeAttached();
    await expectNoHorizontalOverflow(page, "mobile boosted hero rail");
  });

  test("shows one compact hero trust line linked to safety guidance", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const main = page.getByRole("main");
    const trustLine = main.getByRole("link", { name: /Paiement suivi/ });
    await expect(
      page.getByRole("list", { name: "Garanties Shongre" }),
    ).toHaveCount(0);
    await expect(trustLine).toBeVisible();
    await expect(trustLine).toHaveAttribute("href", "/securite");
    await expect(main.locator('a[href="/securite"]')).toHaveCount(1);

    const trustBox = await trustLine.boundingBox();
    expect(trustBox).not.toBeNull();
    expect(trustBox!.height).toBeLessThanOrEqual(48);

    await trustLine.click();
    await expect(page).toHaveURL(/\/securite$/);
    await expect(
      page.getByRole("heading", { name: /sécurité/i }),
    ).toBeVisible();
  });
});
