import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";

test.describe("Homepage administration", () => {
  test("edits, previews and publishes the controlled market homepage", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/tendances", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Configuration centralisée" }),
    ).toBeVisible();
    await expect(page.getByText(/Marché FR · langue fr-FR/)).toBeVisible();
    await expect(
      page.locator('[data-testid^="homepage-admin-section-"]'),
    ).toHaveCount(7);

    const trending = page.getByTestId("homepage-admin-section-trending");
    const deals = page.getByTestId("homepage-admin-section-deals");
    await expect(trending).toBeVisible();
    await expect(deals.getByText("Règles d’éligibilité des offres")).toBeVisible();
    await expect(
      deals.getByLabel("Nombre maximal d’éléments"),
    ).toHaveValue("6");

    await trending.getByRole("button", { name: /Descendre/ }).click();
    await page.getByRole("button", { name: "Aperçu", exact: true }).click();
    await expect(page.getByText("Aperçu recalculé avec les données du marché."))
      .toBeVisible();

    await page
      .getByLabel("Motif de modification / publication")
      .fill("Validation de la composition de la page d’accueil");
    await page.getByRole("button", { name: "Publier", exact: true }).click();
    await expect(
      page.getByText("Nouvelle version de la page d’accueil publiée."),
    ).toBeVisible();

    await page.goto("/", { waitUntil: "domcontentloaded" });
    const dealsSection = page.getByTestId("home-deals");
    const trendingSection = page.getByTestId("home-trending");
    await expect(dealsSection).toBeVisible();
    await expect(trendingSection).toBeVisible();
    await expect
      .poll(async () =>
        dealsSection.evaluate(
          (deals, trends) =>
            Boolean(
              trends &&
                deals.compareDocumentPosition(trends) &
                  Node.DOCUMENT_POSITION_FOLLOWING,
            ),
          await trendingSection.elementHandle(),
        ),
      )
      .toBe(true);
  });
});
