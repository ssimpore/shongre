import { browserApi } from "./browser-api";
import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

test.describe("compact taxonomy aliases", () => {
  test.beforeEach(async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
  });

  test("uses short labels in autocomplete and listing cards", async ({
    page,
  }) => {
    const search = page.getByRole("combobox");
    await search.fill("Outils pro");
    const categoryOption = page.getByRole("option").first();
    await expect(categoryOption).toContainText("Outils pro");

    const tree = await browserApi(page, "/taxonomy/v1/tree?locale=fr-FR");
    expect(tree.status).toBe(200);
    expect(
      tree.body.items.some(
        (node: { id: string }) => node.id === "professional_equipment",
      ),
    ).toBe(true);
    expect(
      tree.body.seo?.some(
        (row: { categoryId: string }) =>
          row.categoryId === "professional_equipment",
      ),
    ).toBe(true);
    const categoryResponse = await page.goto(
      "/categorie/materiel-professionnel",
      {
        waitUntil: "domcontentloaded",
      },
    );
    await waitForStableLayout(page);

    expect(categoryResponse?.status()).toBe(200);
    const professionalListing = page
      .locator("article")
      .filter({ hasText: "Niveau Laser Rotatif" })
      .first();
    await expect(
      professionalListing.getByText("Outils pro", { exact: true }),
    ).toBeVisible();
  });

  test("uses short labels in the category catalogue", async ({ page }) => {
    await page.goto("/categories", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const catalogue = page.locator("main#main-content");
    await expect(
      catalogue.getByRole("heading", { name: "Véhicules", exact: true }),
    ).toBeVisible();
    await expect(
      catalogue.getByRole("heading", { name: "Outils pro", exact: true }),
    ).toBeVisible();
    await expect(
      catalogue.getByRole("heading", { name: "Maison", exact: true }),
    ).toBeVisible();
  });
});
