import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "admin");
});

test.describe("Marketing administration", () => {
  test("creates a versioned draft and exposes its preflight", async ({ page }) => {
    await page.goto("/admin/marketing", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: "Marketing & Newsletter" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Nouvelle campagne" }).click();
    const dialog = page.getByRole("dialog", { name: "Créer une campagne" });
    await expect(dialog).toBeVisible();

    await dialog.getByLabel("Nom interne").fill("Campagne E2E versionnée");
    await dialog.getByLabel("Objet de l’email").fill("La sélection E2E");
    await dialog.getByLabel("Audience de la campagne").selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Créer le brouillon" }).click();

    await expect(page.getByText("Brouillon créé")).toBeVisible();
    await page.getByRole("button", { name: /^Campagnes/ }).click();
    await expect(page.getByText("Campagne E2E versionnée")).toBeVisible();

    const campaign = page
      .getByText("Campagne E2E versionnée")
      .locator("xpath=ancestor::article[1]");
    await campaign.getByRole("button", { name: "Pré-vol" }).click();
    await expect(
      page.getByRole("dialog", { name: "Pré-vol · Campagne E2E versionnée" }),
    ).toBeVisible();
  });

  for (const width of [320, 390, 768, 1280, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/marketing", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    });
  }

  for (const width of [390, 1280]) {
    test(`has no serious accessibility violation at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/admin/marketing", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact ?? ""),
      );
      expect(blocking).toEqual([]);
    });
  }
});
