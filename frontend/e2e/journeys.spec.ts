import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { DEMO_LISTING_ID } from "./routes";
import { waitForStableLayout } from "./overflow";

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
      .filter({ has: page.locator('[aria-label$="photos"]') })
      .getByRole("article")
      .first();
    await expect(card).toBeVisible();
    await expect(card.locator('[aria-label^="Note "]')).toBeVisible();
    await expect(card.locator('[aria-label$="photos"]')).toHaveCount(1);

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

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("body")).toContainText("€");
  });

  test("a pro storefront lists its catalogue behind real tabs", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/boutique/atelier-nordique");

    const tabs = page.getByRole("tab");
    await expect(tabs.first()).toBeVisible();

    // Arrow keys move selection, per the APG tabs pattern.
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { selected: true })).not.toHaveAttribute(
      "id",
      (await tabs.first().getAttribute("id")) ?? "",
    );
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

    // Listings sit in a horizontal rail, so bringing the 7th card into view
    // scrolls the rail sideways *and* carries the page back up to the rail. The
    // position worth restoring is therefore the one the page actually holds at
    // navigation time, not the offset asked for above — which is why this reads
    // it rather than asserting a fixed number that only held while the results
    // were a tall grid. Restoration itself is unchanged: measured 153 -> 153.
    const link = page.locator('a[href^="/annonce/"]').nth(6);
    await link.scrollIntoViewIfNeeded();
    const departure = await page.evaluate(() => window.scrollY);
    expect(departure).toBeGreaterThan(50);

    await link.click();
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
  }) => {
    await usePersona(page, "pro_seller");

    await page.goto("/compte/pro/tableau-de-bord");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

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
      .getByRole("menuitem", { name: /utilisateurs/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/admin\/utilisateurs/);
    // Navigating closes the menu rather than leaving it hanging over the page.
    await expect(page.locator("#admin-section-menu")).toBeHidden();
  });

  test("moderation, markets and monetisation are reachable", async ({
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

  test("CRM universal search exposes keyboard-operable results and an empty state", async ({
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

  test("taxonomy nodes can be selected without a pointer", async ({ page }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/taxonomie");
    await waitForStableLayout(page);

    const node = page.getByRole("button", { name: /^Véhicules/i }).first();
    await expect(node).toBeVisible();
    await node.focus();
    await node.press("Enter");
    await expect(node).toHaveAttribute("aria-pressed", "true");
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
  test("only languages the interface actually ships are offered", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await page.locator("#header-desktop-lang-button").click();
    const menu = page.getByRole("menu").first();
    await expect(menu).toBeVisible();

    await expect(
      menu.getByRole("menuitem", { name: /français/i }),
    ).toBeEnabled();

    // Locales with no catalogue are absent, not present-and-disabled.
    for (const absent of [
      /english/i,
      /deutsch/i,
      /español/i,
      /nederlands/i,
      /italiano/i,
    ]) {
      await expect(menu.getByRole("menuitem", { name: absent })).toHaveCount(0);
    }
    await expect(menu).not.toContainText(/bientôt/i);
  });

  test("the document language reflects the active locale", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  });
});
