import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

for (const width of [1408, 390, 320]) {
  test(`results toolbar keeps search actions usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recherche");
    await waitForStableLayout(page);
    const toolbar = page.locator("#search-results-toolbar");
    await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(
      "Toutes les annonces",
    );
    await expect(toolbar.getByRole("status")).toContainText(/annonce/);

    if (width >= 1024) {
      await expect(page.locator("#search-filter-panel-desktop")).toBeHidden();
      await toolbar
        .getByRole("button", { name: "Afficher les filtres" })
        .click();
      await expect(page.locator("#search-filter-panel-desktop")).toBeVisible();
      await toolbar
        .getByRole("button", { name: "Masquer les filtres" })
        .click();
      await expect(page.locator("#search-filter-panel-desktop")).toBeHidden();
    } else {
      await toolbar
        .getByRole("button", { name: "Ouvrir les filtres de recherche" })
        .click();
      const panel = page.locator("#search-filter-panel-mobile");
      await expect(panel).toBeVisible();
      await panel.getByRole("button", { name: /Voir les résultats/ }).click();
      await expect(panel).toBeHidden();
    }

    await toolbar
      .getByRole("button", { name: "Trier les résultats", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Prix : croissant", exact: true })
      .click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sortBy"))
      .toBe("price_asc");
    await toolbar.getByRole("button", { name: "Affichage liste" }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("view"))
      .toBe("list");
    await expect(
      toolbar.getByRole("button", { name: "Affichage liste" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitForStableLayout(page);
    await expectNoHorizontalOverflow(page, `results toolbar ${width}`);

    const destination = new URL(page.url());
    await toolbar
      .getByRole("button", { name: "Sauvegarder cette recherche", exact: true })
      .click();
    await expect(page).toHaveURL(/\/connexion\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(
      destination.pathname + destination.search,
    );
  });
}

test("@serial results heading follows the category and keyword context", async ({
  page,
}) => {
  await page.goto("/recherche?category=maison-jardin");
  await waitForStableLayout(page);
  const toolbar = page.locator("#search-results-toolbar");
  await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(/Maison/);
  await expect(toolbar).toContainText("Explorez les annonces de la catégorie");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.goto("/recherche?category=maison-jardin&query=table");
  await waitForStableLayout(page);
  await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(
    "Recherche : table",
  );
  await expect(toolbar).toContainText("Affinez les résultats avec les filtres");
  await expect(toolbar.getByRole("status")).toContainText(/annonce/);
});
