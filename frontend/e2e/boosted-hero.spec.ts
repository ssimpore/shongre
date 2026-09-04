import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("boosted listings hero rail", () => {
  test("uses the shared card radius for both persistent hero surfaces", async ({
    page,
  }) => {
    await usePersona(page, "guest");

    for (const viewport of [
      { width: 1408, height: 701 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const heroSurface = page.locator('[data-home-hero-surface="true"]');
      const boostedSurface = page.locator('[data-home-boosted-surface="true"]');
      await expect(heroSurface).toHaveClass(/rounded-card/);
      await expect(boostedSurface).toHaveClass(/rounded-card/);

      const radii = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>(
          '[data-home-hero-surface="true"]',
        );
        const boosted = document.querySelector<HTMLElement>(
          '[data-home-boosted-surface="true"]',
        );
        const tokenProbe = document.createElement("div");
        tokenProbe.style.borderRadius = "var(--radius-card)";
        document.body.appendChild(tokenProbe);
        const cardToken = getComputedStyle(tokenProbe).borderRadius;
        tokenProbe.remove();

        return {
          cardToken,
          hero: hero ? getComputedStyle(hero).borderRadius : null,
          boosted: boosted ? getComputedStyle(boosted).borderRadius : null,
        };
      });

      expect(radii.cardToken).not.toBe("");
      expect(radii.hero).toBe(radii.cardToken);
      expect(radii.boosted).toBe(radii.cardToken);
      await expectNoHorizontalOverflow(
        page,
        `tokenized hero surfaces at ${viewport.width}px`,
      );
    }
  });

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
        return (
          target?.closest('[data-marketplace-action="favorite.manage"]') ===
          button
        );
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
    await rail.focus();
    await rail.press("ArrowRight");
    await page.waitForTimeout(800);
    await rail.press("ArrowRight");
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
    const hero = main.locator('[data-home-hero="true"]');
    await expect(hero.locator('[data-home-hero-eyebrow="true"]')).toHaveText(
      "Plateforme de confiance",
    );
    const trustLine = main.getByRole("link", { name: /Paiement suivi/ });
    await expect(
      page.getByRole("list", { name: "Garanties Shongre" }),
    ).toHaveCount(0);
    await expect(trustLine).toBeVisible();
    await expect(trustLine).toHaveAttribute("href", "/securite");
    await expect(main.locator('a[href="/securite"]')).toHaveCount(1);

    const trustBox = await trustLine.boundingBox();
    expect(trustBox).not.toBeNull();
    expect(trustBox!.height).toBeGreaterThanOrEqual(48);
    expect(trustBox!.height).toBeLessThanOrEqual(64);
    await expect(trustLine).toHaveAttribute("data-home-hero-trust", "true");

    await trustLine.click();
    await expect(page).toHaveURL(/\/securite$/);
    await expect(
      page.getByRole("heading", { name: /sécurité/i }),
    ).toBeVisible();
  });
});
