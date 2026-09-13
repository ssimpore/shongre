import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent } from "./personas";

for (const width of [1408, 390]) {
  test(`seller filters restore both publisher types and survive category changes at ${width}px`, async ({
    page,
    request,
  }) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recherche?category=maison-jardin");
    await waitForStableLayout(page);
    const toolbar = page.locator("#search-results-toolbar");
    const mobile = width < 1024;
    const panel = page.locator(
      mobile ? "#search-filter-panel-mobile" : "#search-filter-panel-desktop",
    );
    const openPanel = async () => {
      if (mobile) {
        await toolbar
          .getByRole("button", { name: "Ouvrir les filtres de recherche" })
          .click();
      } else if (!(await panel.isVisible())) {
        await toolbar
          .getByRole("button", { name: "Afficher les filtres" })
          .click();
      }
    };
    const closePanel = async () => {
      if (mobile)
        await panel.getByRole("button", { name: /Voir les résultats/ }).click();
    };
    const assertResults = async (categorySlug: string, sellerType: string) => {
      const response = await request.get("/api/v1/listings/search", {
        params: {
          marketCode: "FR",
          categorySlug,
          sellerType,
          sortBy: "date_desc",
          limit: "50",
        },
      });
      expect(response.ok()).toBe(true);
      const data = await response.json();
      const titles = data.items
        .map((item: { title: string }) => item.title)
        .sort();
      await expect
        .poll(async () =>
          (await page.locator("[data-listing-card-title]").allTextContents())
            .map((title) => title.trim())
            .sort(),
        )
        .toEqual(titles);
      return data.items as Array<{ publisherType: string }>;
    };

    for (const [value, desktopLabel, mobileLabel] of [
      ["pro", "Professionnels (Boutiques)", "Pros"],
      ["individual", "Particuliers uniquement", "Particuliers"],
      ["all", "Tous les vendeurs", "Tous"],
    ]) {
      await openPanel();
      if (mobile)
        await panel
          .getByRole("button", { name: mobileLabel, exact: true })
          .click();
      else {
        const radio = panel.getByRole("radio", {
          name: desktopLabel,
          exact: true,
        });
        await radio.click();
        await expect(radio).toBeChecked();
      }
      await closePanel();
      await expect
        .poll(() => new URL(page.url()).searchParams.get("sellerType") || "all")
        .toBe(value);
      const items = await assertResults("maison-jardin", value);
      expect(items.length).toBeGreaterThan(0);
      expect(
        [...new Set(items.map((item) => item.publisherType))].sort(),
      ).toEqual(
        value === "all"
          ? ["private", "professional"]
          : [value === "pro" ? "professional" : "private"],
      );
    }

    await openPanel();
    await panel
      .getByRole("button", { name: "Filtrer par catégorie", exact: true })
      .click();
    await page.getByRole("option", { name: /^Véhicules\s/ }).click();
    await closePanel();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("category"))
      .toBe("vehicules");
    await assertResults("vehicules", "all");
    await expectNoHorizontalOverflow(page, `seller filters ${width}`);
  });
}
