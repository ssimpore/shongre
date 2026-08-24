import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.describe("boosted listings hero rail", () => {
  test("marks boosted listings with the shared featured icon", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const rail = page.locator("#hero-boosted-track");
    const targetListing = rail
      .locator("article", { hasText: "Arbre à Chat Mural" })
      .first();
    await expect(rail).toBeVisible();
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
    const targetListing = rail
      .locator("article", { hasText: "Arbre à Chat Mural" })
      .first();
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

    const hero = page.locator("main > div > section").first();
    const trustLine = hero.getByRole("link", { name: /Paiement suivi/ });
    await expect(
      page.getByRole("list", { name: "Garanties Shongre" }),
    ).toHaveCount(0);
    await expect(trustLine).toBeVisible();
    await expect(trustLine).toHaveAttribute("href", "/securite");
    await expect(hero.locator('a[href="/securite"]')).toHaveCount(1);

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
