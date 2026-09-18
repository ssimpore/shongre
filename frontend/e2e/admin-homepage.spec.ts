import { expect, test, type Page } from "@playwright/test";
import { usePersona } from "./personas";

/**
 * Publishing changes the composition every other journey reads, so this runs
 * in the serial phase and restores the market default before it ends.
 */
async function restoreHomepageComposition(page: Page) {
  await page.goto("/admin/tendances", { waitUntil: "domcontentloaded" });
  const trending = page.getByTestId("homepage-admin-section-trending");
  const deals = page.getByTestId("homepage-admin-section-deals");
  await expect(trending).toBeVisible();
  // Move trending back above deals only when the edit actually moved it.
  const trendingBelowDeals = await deals.evaluate(
    (element, trendingElement) =>
      Boolean(
        trendingElement &&
        element.compareDocumentPosition(trendingElement) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
    await trending.elementHandle(),
  );
  if (trendingBelowDeals) {
    await trending.getByRole("button", { name: /Monter/ }).click();
  }
  await page
    .getByTestId("homepage-admin-section-collections")
    .getByRole("combobox", { name: "Mode de sélection" })
    .selectOption("automatic");
  await page
    .getByLabel("Motif de modification / publication")
    .fill("Retour à la composition par défaut après validation");
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(
    page.getByText("Nouvelle version de la page d’accueil publiée."),
  ).toBeVisible();
}

test.describe("Homepage administration", () => {
  test("edits, previews and publishes the controlled market homepage @serial", async ({
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
    ).toHaveCount(8);

    const trending = page.getByTestId("homepage-admin-section-trending");
    const deals = page.getByTestId("homepage-admin-section-deals");
    const universe = page.getByTestId(
      "homepage-admin-section-universe_explorer",
    );
    const collections = page.getByTestId("homepage-admin-section-collections");
    await expect(trending).toBeVisible();
    await expect(
      deals.getByText("Règles d’éligibilité des offres"),
    ).toBeVisible();
    await expect(deals.getByLabel("Nombre maximal d’éléments")).toHaveValue(
      "6",
    );
    await expect(
      universe.getByText("Catégories de l’explorateur"),
    ).toBeVisible();
    await expect(
      universe.getByTestId("homepage-universe-subsection-home_garden"),
    ).toBeVisible();
    await expect(
      universe.getByRole("button", { name: "Descendre home_garden" }),
    ).toBeVisible();
    // Collections are automatic by default; the pick list only exists in
    // manual mode.
    await collections
      .getByRole("combobox", { name: "Mode de sélection" })
      .selectOption("manual");
    await collections.getByRole("checkbox", { name: "Véhicules" }).check();
    await expect(
      collections.getByTestId("homepage-collection-selection-vehicules"),
    ).toBeVisible();

    await trending.getByRole("button", { name: /Descendre/ }).click();
    await page.getByRole("button", { name: "Aperçu", exact: true }).click();
    await expect(
      page.getByText("Aperçu recalculé avec les données du marché."),
    ).toBeVisible();

    await page
      .getByLabel("Motif de modification / publication")
      .fill("Validation de la composition de la page d’accueil");
    await page.getByRole("button", { name: "Publier", exact: true }).click();
    await expect(
      page.getByText("Nouvelle version de la page d’accueil publiée."),
    ).toBeVisible();

    try {
      await page.goto("/", { waitUntil: "domcontentloaded" });
      const dealsSection = page.getByTestId("home-discovery-deals");
      const trendingSection = page.getByTestId("home-discovery-trending");
      await expect(dealsSection).toBeVisible();
      // Attached is enough: the order check reads the DOM, and scrolling a
      // section that hydration is still re-rendering detaches mid-action.
      await expect(trendingSection).toBeAttached();
      await expect(page.getByRole("tab")).toHaveCount(0);
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
    } finally {
      await restoreHomepageComposition(page);
    }

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("home-discovery-trending")).toBeAttached();
    expect(
      await page
        .locator("[data-home-discovery-type]")
        .evaluateAll((elements) =>
          elements.map((element) =>
            element.getAttribute("data-home-discovery-type"),
          ),
        ),
    ).toEqual(["recent_listings", "trending", "deals"]);
  });
});
