import { test, expect } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { DEMO_LISTING_ID } from "./routes";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

/**
 * The journeys that have to keep working, checked on Chromium, Firefox and
 * WebKit. Sticky headers, `dvh` sizing, focus handling in overlays and form
 * behaviour are the parts that diverge between engines, so the flows that lean
 * on them are here rather than in the Chromium-only responsive sweep.
 */

test.describe("public browsing", () => {
  test("homepage offers search and reaches results", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const search = page
      .getByRole("combobox", { name: /rechercher une annonce/i })
      .first();
    await search.fill("velo");
    await search.press("Enter");

    await expect(page).toHaveURL(/\/recherche/);
    await expect(page.getByRole("link", { name: /.+/ }).first()).toBeVisible();
  });

  test("listing rail cards expose metadata, focus state and favourite action", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/");
    await waitForStableLayout(page);

    const card = page
      .locator("div.w-listing-card")
      .getByRole("article")
      .filter({ has: page.locator('[aria-label^="Note "]') })
      .first();
    await expect(card).toBeVisible();
    await expect(
      card.locator('[data-listing-card-media="true"]'),
    ).toBeVisible();
    await expect(card.locator('[aria-label^="Note "]')).toBeVisible();

    const titleLink = card.getByRole("link").filter({ hasText: /.+/ }).last();
    await titleLink.focus();
    await expect
      .poll(() => card.evaluate((element) => element.matches(":focus-within")))
      .toBe(true);

    const favorite = card.getByRole("button", {
      name: /ajouter aux favoris|retirer des favoris/i,
    });
    const initialState = await favorite.getAttribute("aria-pressed");
    await favorite.click();
    await expect(favorite).toHaveAttribute(
      "aria-pressed",
      initialState === "true" ? "false" : "true",
    );
    await favorite.click();
  });

  test("expands the desktop search while active and restores the publish CTA on handoff", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/");
    await waitForStableLayout(page);

    const search = page
      .getByRole("combobox", { name: /rechercher une annonce/i })
      .first();
    const publish = page.locator("[data-header-publish-cta]");
    const initialSearchWidth = await search.evaluate((input) =>
      Math.round(input.getBoundingClientRect().width),
    );

    await expect(publish).toHaveAttribute("aria-hidden", "false");
    await expect(publish).not.toHaveCSS("opacity", "0");

    await search.focus();
    await expect(publish).toHaveAttribute("aria-hidden", "true");
    await expect
      .poll(() =>
        publish.evaluate((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      )
      .toBe(0);
    await expect
      .poll(() =>
        search.evaluate((input) =>
          Math.round(input.getBoundingClientRect().width),
        ),
      )
      .toBeGreaterThan(initialSearchWidth);

    await search.fill("velo");
    await expect(publish).toHaveAttribute("aria-hidden", "true");
    await expect
      .poll(() =>
        publish.evaluate((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      )
      .toBe(0);
    await expect
      .poll(() =>
        search.evaluate((input) =>
          Math.round(input.getBoundingClientRect().width),
        ),
      )
      .toBeGreaterThan(initialSearchWidth);

    await page.locator("#main-content").focus();
    await expect(publish).toHaveAttribute("aria-hidden", "false");
    await expect
      .poll(() =>
        publish.evaluate((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      )
      .toBeGreaterThan(0);

    await search.focus();
    await expect(publish).toHaveAttribute("aria-hidden", "true");
    await page
      .getByRole("button", { name: /effacer le texte/i })
      .first()
      .click();
    // Clearing keeps keyboard focus in search so the user can type again.
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
    await expect(publish).toHaveAttribute("aria-hidden", "true");
    await page.locator("#main-content").focus();
    await expect(publish).toHaveAttribute("aria-hidden", "false");
    await expect
      .poll(() =>
        publish.evaluate((element) =>
          Math.round(element.getBoundingClientRect().width),
        ),
      )
      .toBeGreaterThan(0);
  });

  test("search state lives in the URL and survives a reload", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/recherche?query=velo&sortBy=price_asc");

    /**
     * The sort control is a custom listbox trigger rather than a `<select>`, so
     * the state it carries is the option it displays, not a form value. The
     * assertion is on that label — `toHaveValue` reads nothing from a `<button>`
     * and passed vacuously against the old markup.
     */
    const sort = page.getByRole("button", { name: /trier les résultats/i });
    await expect(sort).toContainText(/prix\s*:\s*croissant/i);

    await page.reload();
    await expect(sort).toContainText(/prix\s*:\s*croissant/i);
    await expect(page).toHaveURL(/sortBy=price_asc/);
  });

  test("a listing page shows price, seller and a primary action", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto(`/annonce/${DEMO_LISTING_ID}`);
    await waitForStableLayout(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText("€");
    const sellerIdentity = page.locator('[data-seller-identity="true"]');
    await expect(sellerIdentity).toHaveCount(1);
    await expect(sellerIdentity).toContainText("Camille Martin");
    await expect(
      sellerIdentity.getByRole("img", { name: "Note 5,0 sur 5, 42 avis" }),
    ).toBeVisible();
    await expect(sellerIdentity).toContainText("Lyon");
  });

  test("a pro storefront lists its catalogue behind real tabs", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/boutique/atelier-nordique");
    await waitForStableLayout(page);

    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible();

    // Arrow keys move selection, per the APG tabs pattern.
    await tabs.first().press("ArrowRight");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toBeFocused();
  });
});

test.describe("navigation shell", () => {
  test("the tablet header keeps search and the publish action", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 834, height: 1112 });
    await page.goto("/");
    await waitForStableLayout(page);

    await expect(
      page.getByRole("combobox", { name: /rechercher une annonce/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /déposer une annonce/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /ouvrir le menu/i }),
    ).toBeVisible();
  });

  test("the mobile bottom navigation exposes the core destinations", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const bottomNav = page
      .locator("nav")
      .filter({ hasText: /accueil/i })
      .last();
    await expect(bottomNav).toBeVisible();
  });

  test("moving to a new page starts at the top, and back restores position", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/recherche");
    await waitForStableLayout(page);

    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.waitForTimeout(200);

    // Focus before measuring: pointer actionability can scroll the card again
    // after scrollIntoViewIfNeeded, changing the actual departure position.
    const link = page.locator('a[href^="/annonce/"]').nth(6);
    await link.scrollIntoViewIfNeeded();
    await link.focus();
    const departure = await page.evaluate(() => window.scrollY);
    expect(departure).toBeGreaterThan(50);

    await link.press("Enter");
    await page.waitForURL(/\/annonce\//);
    await waitForStableLayout(page);
    // Poll rather than sample once: WebKit applies the scroll a frame or two
    // later than Blink, and reading immediately made this flake under parallel
    // workers while passing in isolation.
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeLessThan(50);

    await page.goBack();
    await page.waitForURL(/\/recherche/);
    await waitForStableLayout(page);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
      .toBeGreaterThan(departure - 50);
  });
});

test.describe("buyer", () => {
  test("favourites can be opened and report a consistent count", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/compte/favoris");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      /favori/i,
    );
  });

  test("messaging is a full-height surface with a reachable composer", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compte/messages");
    await waitForStableLayout(page);

    // The composer must sit inside the viewport, above the mobile chrome —
    // not below the fold where the keyboard would bury it.
    const composer = page.locator('textarea, input[type="text"]').last();
    if (await composer.count()) {
      const box = await composer.boundingBox();
      if (box) expect(box.y).toBeLessThan(844);
    }
  });
});

test.describe("seller", () => {
  test("the publication wizard opens on a focused layout", async ({ page }) => {
    await usePersona(page, "individual_seller");
    await page.goto("/deposer");
    await waitForStableLayout(page);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("listing management filters through real tabs", async ({ page }) => {
    await usePersona(page, "individual_seller");
    await page.goto("/compte/annonces");
    await waitForStableLayout(page);

    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible();
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });

  test("the verification centre states what is required now", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.goto("/compte/verification");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("pro workspace", () => {
  test("the dashboard and subscription pages render for a pro seller", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await useEstablishedConsent(page);
    await usePersona(page, "pro_seller");

    await page.goto("/compte/pro/tableau-de-bord");
    await expect(
      page.getByRole("button", { name: /^Menu du compte/ }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/compte\/pro\/tableau-de-bord$/);
    await expect(page).toHaveTitle(/Tableau de bord vendeur Pro/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText("Vues du catalogue analysé", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Ventes terminées ce mois-ci", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Gérer mes annonces/ }),
    ).toBeVisible();
    await expect(
      page.getByText("Publier votre première annonce", { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText(/undefined|NaN|Unexpected Application Error/),
    ).toHaveCount(0);
    await page.screenshot({
      path: testInfo.outputPath("pro-dashboard.png"),
      fullPage: false,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expectNoHorizontalOverflow(page, "mobile Pro dashboard");
    await page.screenshot({
      path: testInfo.outputPath("pro-dashboard-mobile.png"),
      fullPage: false,
    });
    expect(runtimeErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);

    await page.goto("/compte/pro/abonnements");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("admin console", () => {
  test("shows the administrator role as an icon in the account identity", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/compte");
    await waitForStableLayout(page);

    await expect(page).toHaveURL(/\/admin$/);
    const identity = page.getByRole("banner");
    await expect(identity).toContainText("Antoine Fabre");
    await expect(identity).not.toContainText("(Administrateur)");
    await expect(
      identity.getByRole("img", { name: "Administrateur", exact: true }),
    ).toBeVisible();
    await expect(identity).toContainText("Administrateur Plateforme");
    await expect(page.locator("[data-account-hero]")).toHaveCount(0);
  });

  test("the compact section menu navigates below lg", async ({ page }) => {
    await usePersona(page, "admin");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/admin");
    await waitForStableLayout(page);

    const sectionButton = page.locator('[aria-controls="admin-section-menu"]');
    await expect(sectionButton).toBeVisible();

    await sectionButton.click();
    await expect(page.locator("#admin-section-menu")).toBeVisible();

    await page
      .getByRole("navigation", { name: "Sections de la console" })
      .getByRole("link", { name: /utilisateurs/i })
      .click();
    await expect(page).toHaveURL(/\/admin\/utilisateurs/);
    // Navigating closes the menu rather than leaving it hanging over the page.
    await expect(page.locator("#admin-section-menu")).toBeHidden();
  });

  test("moderation, markets and monetisation are reachable @serial", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    for (const path of [
      "/admin/moderation",
      "/admin/marches",
      "/admin/monetisation",
      "/admin/taxonomie",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("monetisation governance exposes publication controls", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/monetisation");
    await waitForStableLayout(page);

    await page.getByRole("tab", { name: "Gouvernance" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Migration, coûts et synchronisation",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Migrations de forfaits" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Readiness prestataire" }),
    ).toBeVisible();
  });

  test("CRM universal search exposes keyboard-operable results and an empty state @serial", async ({
    page,
  }) => {
    // CRM access is intentionally separated from platform administration.
    // Exercise the workspace with the commercial persona that owns crm.*
    // permissions instead of weakening the production-shaped RBAC boundary.
    await usePersona(page, "commercial");
    await page.goto("/admin/crm");
    await waitForStableLayout(page);

    const search = page.getByRole("combobox", {
      name: /recherche universelle crm/i,
    });
    await search.fill("Atelier");

    const result = page
      .getByRole("button", { name: /Atelier Nordique/i })
      .first();
    await expect(result).toBeVisible();
    await result.focus();
    await result.press("Enter");
    await expect(page).toHaveURL(/\/admin\/crm\/entreprises\//);

    await page.goto("/admin/crm");
    await page
      .getByRole("combobox", { name: /recherche universelle crm/i })
      .fill("aucun-resultat-shongre-xyz");
    await expect(
      page.getByText(/aucun contact, entreprise ou opportunité/i),
    ).toBeVisible();
  });

  test("taxonomy navigation can be edited without a pointer", async ({
    page,
  }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/taxonomie");
    await waitForStableLayout(page);

    const node = page.getByRole("switch", {
      name: "Activer ou désactiver Véhicules",
    });
    await expect(node).toBeVisible();
    const initial = await node.isChecked();
    await node.focus();
    await node.press("Space");
    await expect(node).toBeChecked({ checked: !initial });
    await node.press("Space");
    await expect(node).toBeChecked({ checked: initial });
  });
});

test.describe("watch subscriptions", () => {
  test("saves a search as a market-scoped alert", async ({
    page,
  }, testInfo) => {
    await usePersona(page, "individual_buyer");
    const query = `velo-${testInfo.project.name}`;
    await page.goto(`/recherche?query=${query}`);
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: "Sauvegarder cette recherche" })
      .first()
      .click();
    await expect(
      page.getByText("Recherche enregistrée avec alertes activées."),
    ).toBeVisible();

    await page.goto("/compte/alertes");
    const alert = page.locator("article").filter({
      has: page.getByRole("heading", {
        name: `Recherche « ${query} »`,
        level: 2,
      }),
    });
    await expect(alert).toBeVisible();
    await expect(alert.getByText("Recherche sauvegardée")).toBeVisible();
    await alert.getByRole("button", { name: /^Supprimer l’alerte/ }).click();
    await expect(alert).toHaveCount(0);
  });

  test("creates a price alert from a listing and manages its cadence", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto(`/annonce/${DEMO_LISTING_ID}`);
    await waitForStableLayout(page);
    const listingTitle = await page
      .getByRole("heading", { level: 1 })
      .innerText();

    const priceAlert = page.getByRole("button", {
      name: "Alerte prix",
    });
    await expect(priceAlert).toBeVisible();
    await priceAlert.click();
    await expect(page.getByText("Alerte activée.")).toBeVisible();

    await page.goto("/compte/alertes");
    await expect(
      page.getByRole("heading", { name: "Mes alertes suivies" }),
    ).toBeVisible();
    const card = page.locator("article").filter({
      has: page.getByRole("heading", {
        level: 2,
        name: listingTitle,
        exact: true,
      }),
    });
    await expect(card).toBeVisible();
    const cadence = card.getByLabel("Fréquence de l’alerte");
    await cadence.selectOption("weekly");
    await expect(cadence).toHaveValue("weekly");
    await expect(
      page.getByText("Préférences d’alerte mises à jour."),
    ).toBeVisible();
    await page.reload();
    await expect(cadence).toHaveValue("weekly");
    await card.getByRole("button", { name: /^Supprimer l’alerte/ }).click();
    await expect(card).toHaveCount(0);
  });
});

test.describe("honest product surfaces", () => {
  /**
   * The picker offers working languages only.
   *
   * It used to list all six and disable five behind a "Bientôt" tag, which is a
   * menu that is mostly not choices. Absence is the stronger version of the same
   * promise: nothing in the control claims to do something it cannot.
   */
  test("the single shipped language opens regional preferences honestly", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator("#header-desktop-lang-button").click();
    const dialog = page.getByRole("dialog", {
      name: "Préférences régionales",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("h2 + div")).toHaveCount(0);
    const dialogBounds = (await dialog.boundingBox())!;
    expect(dialogBounds.width).toBeGreaterThanOrEqual(312);
    expect(dialogBounds.width).toBeLessThanOrEqual(320);
    const dialogRadii = await dialog.evaluate((element) => {
      const probe = document.createElement("div");
      probe.style.borderRadius = "var(--radius-listing-card)";
      document.body.append(probe);
      const expected = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();

      return {
        actual: getComputedStyle(element).borderTopLeftRadius,
        expected,
      };
    });
    expect(dialogRadii.actual).toBe(dialogRadii.expected);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    const dropdownTriggers = dialog.locator('button[aria-haspopup="listbox"]');
    await expect(dropdownTriggers).toHaveCount(3);
    const marketDropdown = dialog.getByRole("button", {
      name: "Marché / Pays",
    });
    await marketDropdown.click();
    const marketOptions = dialog.getByRole("listbox", {
      name: "Marché / Pays",
    });
    await expect(marketOptions.getByRole("option")).toHaveCount(6);
    await expect(
      marketOptions.getByRole("option", { name: "France" }),
    ).toHaveAttribute("aria-selected", "true");
    await marketDropdown.press("Escape");
    await expect(marketOptions).toHaveCount(0);
    await expect(marketDropdown).toBeFocused();
    await expect(
      dialog.getByRole("button", { name: "Valider les préférences" }),
    ).toHaveCount(0);
    await expect(dialog.getByRole("radiogroup")).toHaveCount(0);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });

  test("the document language reflects the active locale", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-FR");
  });
});
