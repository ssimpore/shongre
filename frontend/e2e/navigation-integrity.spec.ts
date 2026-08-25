import { expect, test } from "@playwright/test";
import { usePersona } from "./personas";
import { DEMO_LISTING_ID } from "./routes";
import { waitForStableLayout } from "./overflow";

test.describe("navigation integrity", () => {
  test("homepage search context reaches a listing and Back restores it", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/");

    const search = page
      .getByRole("combobox", { name: /rechercher une annonce/i })
      .first();
    // The header intentionally expands on focus. Model that interaction as two
    // user steps so WebKit does not combine the focus transition and synthetic
    // fill into one automation event.
    await search.focus();
    await expect(search).toBeFocused();
    await expect(page.locator("[data-header-search-shell]")).toHaveClass(
      /max-w-none/,
    );
    await search.fill("vélo");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/recherche\?[^#]*query=v(%C3%A9|é)lo/);
    await waitForStableLayout(page);

    const listing = page.locator('a[href^="/annonce/"]').first();
    await expect(listing).toBeVisible();
    const resultsUrl = page.url();
    await listing.click();
    await expect(page).toHaveURL(/\/annonce\//);

    await page.goBack();
    await expect(page).toHaveURL(resultsUrl);
    await expect(search).toHaveValue("vélo");
  });

  test("a guest contact action resumes on the exact listing after login", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto(`/annonce/${DEMO_LISTING_ID}`);
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: /message|contacter|demander un cours/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/connexion\?redirect=/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(
      `/annonce/${DEMO_LISTING_ID}?contact=1`,
    );

    await page.getByRole("button", { name: /Thomas \(Particulier\)/i }).click();
    await expect(page).toHaveURL(new RegExp(`/annonce/${DEMO_LISTING_ID}`));
    const dialog = page.getByRole("dialog", { name: /contacter/i });
    await expect(dialog).toBeVisible();

    await dialog
      .getByRole("textbox")
      .fill("Bonjour, cette annonce est-elle disponible ?");
    await dialog.getByRole("button", { name: /envoyer le message/i }).click();
    await expect(page).toHaveURL(/\/compte\/messages\?convId=.+/);
  });

  test("category, listing and seller links follow the marketplace hierarchy", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/categories");

    const category = page.locator('a[href^="/categorie/"]').first();
    await expect(category).toBeVisible();
    await category.click();
    await expect(page).toHaveURL(/\/categorie\//);

    const listing = page.locator('a[href^="/annonce/"]').first();
    await expect(listing).toBeVisible();
    await listing.click();
    const seller = page
      .locator('a[href^="/profil/"], a[href^="/boutique/"]')
      .first();
    await expect(seller).toBeVisible();
    await seller.click();
    await expect(page).toHaveURL(/\/(profil|boutique)\//);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("invalid and removed resources provide recovery actions", async ({
    page,
  }) => {
    await usePersona(page, "guest");

    await page.goto("/route-inexistante-navigation-test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /page introuvable/i,
    );
    await expect(
      page.getByRole("link", { name: /accueil/i }).first(),
    ).toBeVisible();

    await page.goto("/annonce/ressource-supprimee-navigation-test");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /annonce introuvable/i,
    );
    await expect(
      page.getByRole("link", { name: /annonces|explorer|recherche/i }).first(),
    ).toBeVisible();
  });

  test("an entity notification deep link opens the exact transaction", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/compte/achats?transactionId=tx-901");

    const dialog = page.getByRole("dialog", { name: /SHG-849201/ });
    await expect(dialog).toBeVisible();
    await dialog.locator('button[aria-label="Fermer"]').click();
    await expect(page).toHaveURL("/compte/achats");
  });
});
