import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "pro_seller");
});

test.describe("Shongre Prospects CRM", () => {
  test("runs discovery, evidence review and CRM import from product routes", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", {
        name: "Pilotez chaque relation commerciale",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", {
        name: "Navigation de Shongre Prospects",
      }),
    ).toContainText("Entreprises");

    await page.getByRole("link", { name: "Découvrir", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/discover$/);
    await page
      .getByRole("textbox", { name: "Décrivez les entreprises recherchées" })
      .fill("ateliers automobiles");
    await page.getByRole("button", { name: "Découvrir", exact: true }).click();

    await expect(
      page.getByText("1 résultat · revue humaine requise"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Examiner Atelier Horizon Mobilité" })
      .click();
    await expect(page.getByText("PREUVES ET PROVENANCE")).toBeVisible();
    await page
      .getByRole("button", { name: "Valider et ajouter au CRM" })
      .click();
    await expect(
      page.getByRole("button", { name: "Ajouté au CRM", exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Entreprises", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/companies$/);
    await expect(
      page.getByRole("heading", { name: "Entreprises" }),
    ).toBeVisible();
  });

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/app", { waitUntil: "domcontentloaded" });
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
      await page.goto("/app", { waitUntil: "domcontentloaded" });
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
