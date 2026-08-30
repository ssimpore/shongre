import { expect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("Staff marketplace navigation", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("keeps ordinary Staff signed in across admin and read-only public pages", async ({
    page,
  }) => {
    await usePersona(page, "support");
    await page.goto("/admin/support", { waitUntil: "domcontentloaded" });

    await page
      .getByRole("link", { name: "Retour à la place de marché" })
      .click();
    await expect(page).toHaveURL((url) => url.pathname === "/");
    await expect(page.getByTestId("staff-marketplace-mode")).toHaveAttribute(
      "data-mode",
      "read-only",
    );
    await expect(
      page.getByTestId("staff-marketplace-mode"),
    ).toHaveAccessibleName(
      /Navigation Staff — lecture seule\..*Ouvrir l’administration/,
    );
    await expect(
      page.locator('section[data-testid="staff-marketplace-mode"]'),
    ).toHaveCount(0);
    await expect(
      page.locator('button[aria-label^="Menu du compte"]'),
    ).toContainText("Hugo");
    await expect(
      page.locator("[data-header-search-shell] input"),
    ).toBeVisible();
    await expect(page.locator("[data-header-publish-cta]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Favoris" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messagerie" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Notifications" }),
    ).toBeVisible();

    const marketplaceUrl = page.url();
    const publishAction = page.locator("[data-header-publish-cta] a");
    await publishAction.focus();
    await publishAction.press("Enter");
    await expect(page).toHaveURL(marketplaceUrl);
    await expect(publishAction).toBeFocused();
    await expect(
      page.getByRole("status").filter({
        hasText: "Action indisponible pour les comptes Staff",
      }),
    ).toContainText("Aucune opération n’a été lancée");

    await page.getByRole("link", { name: "Ouvrir l’administration" }).click();
    await expect(page).toHaveURL((url) => url.pathname === "/admin");
    await expect(
      page.getByText("Hugo Vasseur", { exact: false }),
    ).toBeVisible();
  });

  test("keeps restricted listing actions visible and intercepts them before side effects", async ({
    page,
  }) => {
    await usePersona(page, "support");
    await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
      waitUntil: "domcontentloaded",
    });

    const favorite = page.getByRole("button", { name: "Favori" });
    const send = page.getByRole("button", { name: "Envoyer la demande" });
    await expect(favorite).toBeVisible();
    await expect(send).toBeVisible();
    await expect(page.getByText("Contacter l’annonceur")).toBeVisible();

    const message = page.getByRole("textbox", { name: "Message" });
    await message.fill("État de formulaire Staff à préserver");
    await page.getByRole("checkbox").check();

    const protectedRequests: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        protectedRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    const currentUrl = page.url();
    await send.focus();
    await send.press("Enter");

    await expect(page).toHaveURL(currentUrl);
    await expect(send).toBeFocused();
    await expect(message).toHaveValue("État de formulaire Staff à préserver");
    await expect(page.getByText("Demande envoyée")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Notifications" }),
    ).toHaveAttribute("aria-live", "polite");
    await expect(
      page.getByRole("status").filter({
        hasText: "Action indisponible pour les comptes Staff",
      }),
    ).toContainText(
      "Les comptes Staff peuvent parcourir la marketplace, mais ne peuvent pas effectuer cette action.",
    );
    expect(protectedRequests).toEqual([]);
  });

  test("shows Staff the regular five-item mobile marketplace navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "support");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const navigation = page.getByRole("navigation", {
      name: "Navigation mobile",
    });
    await expect(
      navigation.getByRole("link", { name: "Accueil" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Recherche" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Déposer une annonce" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Messages" }),
    ).toBeVisible();
    await expect(
      navigation.getByRole("link", { name: "Compte" }),
    ).toBeVisible();
  });

  test("retains the existing listing action for an authorized marketplace user", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("[data-header-publish-cta]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Favoris" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Messagerie" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Favori" })).toBeVisible();

    await page.getByRole("textbox", { name: "Nom" }).fill("Thomas Laurent");
    await page
      .getByRole("textbox", { name: "E-mail" })
      .fill("thomas.laurent@example.test");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page.getByText("Demande envoyée")).toBeVisible();
  });

  test("shows the isolated Staff demo state only to the dedicated tester", async ({
    page,
  }) => {
    await usePersona(page, "operations");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("staff-marketplace-mode")).toHaveAttribute(
      "data-mode",
      "demo",
    );
    await expect(
      page.getByTestId("staff-marketplace-mode"),
    ).toHaveAccessibleName(
      /Mode test Staff — données isolées\..*Ouvrir l’administration/,
    );
    await expect(page.locator("[data-header-publish-cta]")).toBeVisible();
    await page.locator("[data-header-publish-cta] a").click();
    await expect(page).toHaveURL((url) => url.pathname === "/deposer");
    await expect(page.getByTestId("staff-marketplace-mode")).toHaveAttribute(
      "data-mode",
      "demo",
    );
  });

  test("shows only status-authorized destinations in the desktop account panel", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await page
      .getByRole("button", { name: /Menu du compte de Antoine Fabre/ })
      .click();
    const panel = page.getByRole("group", {
      name: /Menu du compte de Antoine Fabre/,
    });

    await expect(panel.getByText("Staff actif")).toBeVisible();
    await expect(
      panel.locator('[data-account-menu-item="admin"]'),
    ).toBeVisible();
    await expect(
      panel.locator('[data-account-menu-item="account"]'),
    ).toHaveCount(0);
    await expect(
      panel.locator('[data-account-menu-item="listings"]'),
    ).toHaveCount(0);
    await expect(
      panel.locator('[data-account-menu-item="favorites"]'),
    ).toHaveCount(0);
    await expect(
      panel.locator('[data-account-menu-item="purchases"]'),
    ).toHaveCount(0);
    await expect(
      panel.locator('[data-account-menu-item="public_profile"]'),
    ).toHaveCount(0);
    await expect(
      panel.locator('[data-account-menu-item="pro_solutions"]'),
    ).toHaveCount(0);
  });

  test("keeps customer shortcuts for an authorized professional account", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await page.locator('button[aria-controls="header-account-menu"]').click();
    const panel = page.locator("#header-account-menu");

    for (const item of [
      "account",
      "listings",
      "favorites",
      "purchases",
      "public_profile",
      "pro_solutions",
    ]) {
      await expect(
        panel.locator(`[data-account-menu-item="${item}"]`),
      ).toBeVisible();
    }
    await expect(panel.locator('[data-account-menu-item="admin"]')).toHaveCount(
      0,
    );
  });

  test("labels the dedicated tester entry and reuses it in the mobile drawer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "operations");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Wait for persisted-persona restoration before opening local Header
    // state; otherwise the guest-to-Staff hydration transition can replace the
    // Header immediately after the click and close the freshly opened drawer.
    await expect(page.getByTestId("staff-marketplace-mode")).toHaveAttribute(
      "data-mode",
      "demo",
    );
    await expect(
      page.getByRole("button", { name: "16. Opérations Shongre" }),
    ).toBeVisible();
    const menuToggle = page.getByRole("button", { name: "Ouvrir le menu" });
    await menuToggle.focus();
    await menuToggle.press("Enter");
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    await expect(drawer.getByText("Démo marketplace autorisée")).toBeVisible();
    await expect(
      drawer.locator('[data-account-menu-item="admin"]'),
    ).toBeVisible();
    const demo = drawer.locator('[data-account-menu-item="demo_workspace"]');
    await expect(demo).toBeVisible();
    await expect(demo).toHaveAttribute("data-staff-demo-destination", "true");
    await expect(demo).toContainText("Démo");
    await expect(
      drawer.locator('[data-account-menu-item="purchases"]'),
    ).toHaveCount(0);
    await expect(
      drawer.locator('[data-account-menu-item="pro_solutions"]'),
    ).toHaveCount(0);
  });
});
