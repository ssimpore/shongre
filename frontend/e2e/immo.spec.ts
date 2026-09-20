import { browserApi } from "./browser-api";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

const blockingImpacts = new Set(["critical", "serious"]);

test.describe("Shongre Immo", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "shongre_cookie_consent_v1",
        JSON.stringify({
          version: 1,
          decidedAt: new Date().toISOString(),
          categories: { necessary: true, analytics: false, marketing: false },
        }),
      );
    });
  });

  test("search is URL-driven, privacy-safe, and creates an existing saved-search alert", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/immo", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Trouvez le bien qui vous ressemble",
      }),
    ).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await page
      .getByRole("button", { name: "Localisation", exact: true })
      .click();
    const filterPanel = page.locator("#immo-filter-panel");
    const locationSelector = page.locator("#immo-location-selector");
    await expect(locationSelector).toHaveAttribute(
      "data-location-selector",
      "true",
    );
    await locationSelector.click();
    const locationDialog = page.getByRole("dialog", {
      name: "Zone géographique",
    });
    await locationDialog.locator("#location-city-input").fill("Écully");
    await locationDialog
      .getByRole("button", { name: "Appliquer la zone" })
      .click();
    await expect(page).toHaveURL(/city=%C3%89cully/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await filterPanel.getByRole("button", { name: /^Voir \d+ bien/ }).click();
    await page.getByRole("button", { name: "Créer une alerte" }).click();
    await expect(
      page.getByText(
        "Alerte Immo créée. Vous pouvez la gérer depuis votre compte.",
      ),
    ).toBeVisible();
    // Alerts are account subscriptions, not device state: the account's
    // watch list must carry the real-estate saved search on this city.
    await expect
      .poll(async () => {
        const { body } = await browserApi(page, "/watch-subscriptions");
        const items = (
          body as {
            items?: {
              targetType: string;
              searchFilter?: { categoryId?: string; city?: string };
            }[];
          }
        ).items;
        return (items ?? []).some(
          (item) =>
            item.targetType === "saved_search" &&
            item.searchFilter?.categoryId?.includes("real_estate") &&
            item.searchFilter?.city === "Écully",
        );
      })
      .toBe(true);
    expect(await page.locator("body").innerText()).not.toContain(
      "Adresse privée",
    );
  });

  test("mobile filter sheet fits and passes blocking WCAG checks", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/immo", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page
      .getByRole("button", { name: /Ouvrir les filtres de recherche/ })
      .click();
    const dialog = page.getByRole("dialog", { name: "Filtres immobiliers" });
    await expect(dialog.getByText("Type de bien")).toBeVisible();
    await expect(dialog.getByLabel("Budget maximum")).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        blockingImpacts.has(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("property detail owns metadata and never exposes exact address or private documents", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/immo/bien/appartement-lumineux-lyon-montchat", {
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Appartement lumineux",
    );
    await expect(
      page
        .locator("#immo-property-lead-form")
        .getByText("Contacter l’annonceur"),
    ).toBeVisible();
    await expect(page.getByTestId("immo-property-promotion")).toHaveCount(0);
    const body = page.locator("body");
    await expect(body).not.toContainText(
      /Adresse privée|documents-private|riskSignals|Montchat, Lyon 3e/,
    );
    await expect(page.locator('meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(1);
  });

  test("desktop property header replaces the scrolled summary and reuses its primary action", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await usePersona(page, "individual_buyer");
    await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const originalHeader = page.getByTestId("immo-original-listing-header");
    const stickyHeader = page.getByTestId("immo-desktop-sticky-header");
    await expect(originalHeader).toBeVisible();
    await expect(stickyHeader).toHaveAttribute("data-state", "hidden");
    await expect(stickyHeader).toBeHidden();

    await page.getByRole("textbox", { name: "Nom" }).fill("Thomas Laurent");
    await page
      .getByRole("textbox", { name: "E-mail" })
      .fill("thomas.laurent@example.test");
    await page.getByRole("checkbox").check();

    const placeOriginalBottom = async (gapFromChrome: number) => {
      await page.evaluate((gap) => {
        const original = document.querySelector<HTMLElement>(
          '[data-testid="immo-original-listing-header"]',
        );
        const chrome = document.querySelector<HTMLElement>(
          '[data-environment-header-stack="true"]',
        );
        if (!original || !chrome) throw new Error("Property headers not found");
        window.scrollBy(
          0,
          original.getBoundingClientRect().bottom -
            chrome.getBoundingClientRect().bottom -
            gap,
        );
      }, gapFromChrome);
    };

    // The replacement stays hidden while any of the original summary remains
    // below the global chrome, then appears as soon as it has fully passed.
    await placeOriginalBottom(2);
    await expect(stickyHeader).toHaveAttribute("data-state", "hidden");
    await page.evaluate(() => window.scrollBy(0, 8));
    await expect(stickyHeader).toHaveAttribute("data-state", "visible");
    await expect(stickyHeader).toBeVisible();
    expect(
      await page.evaluate(() => {
        const original = document.querySelector<HTMLElement>(
          '[data-testid="immo-original-listing-header"]',
        );
        const chrome = document.querySelector<HTMLElement>(
          '[data-environment-header-stack="true"]',
        );
        return Boolean(
          original &&
          chrome &&
          original.getBoundingClientRect().bottom <=
            chrome.getBoundingClientRect().bottom,
        );
      }),
    ).toBe(true);

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(stickyHeader).toHaveAttribute("data-state", "hidden");
    await expect(stickyHeader).toBeHidden();

    await placeOriginalBottom(-8);
    await expect(stickyHeader).toHaveAttribute("data-state", "visible");
    const stickyCta = stickyHeader.getByRole("button", {
      name: "Envoyer la demande",
    });
    await expect(stickyCta).toHaveAttribute("form", "immo-property-lead-form");
    await expect(stickyCta).toHaveAttribute(
      "data-marketplace-action",
      "message.send",
    );
    await stickyCta.click();
    await expect(
      stickyHeader.getByRole("button", { name: "Demander ce créneau" }),
    ).toBeVisible();
    await expect(page.getByText("Demande envoyée")).toBeVisible();
  });

  test("compact property header remains desktop-only", async ({ page }) => {
    await usePersona(page, "guest");

    for (const viewport of [
      { width: 390, height: 844 },
      { width: 820, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
        waitUntil: "domcontentloaded",
      });
      await waitForStableLayout(page);
      const stickyHeader = page.getByTestId("immo-desktop-sticky-header");
      await page.evaluate(() =>
        window.scrollTo(0, document.documentElement.scrollHeight),
      );
      await expect(stickyHeader).toHaveAttribute("data-state", "hidden");
      await expect(stickyHeader).toBeHidden();
    }
  });

  test("compact property header honors reduced-motion preferences", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 800 });
    await usePersona(page, "guest");
    await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const stickyHeader = page.getByTestId("immo-desktop-sticky-header");
    await page.evaluate(() => {
      const original = document.querySelector<HTMLElement>(
        '[data-testid="immo-original-listing-header"]',
      );
      const chrome = document.querySelector<HTMLElement>(
        '[data-environment-header-stack="true"]',
      );
      if (!original || !chrome) throw new Error("Property headers not found");
      window.scrollBy(
        0,
        original.getBoundingClientRect().bottom -
          chrome.getBoundingClientRect().bottom +
          8,
      );
    });
    await expect(stickyHeader).toHaveAttribute("data-state", "visible");
    const transitionDurations = await stickyHeader.evaluate((element) =>
      getComputedStyle(element)
        .transitionDuration.split(",")
        .map((duration) => Number.parseFloat(duration)),
    );
    expect(transitionDurations.every((duration) => duration <= 0.001)).toBe(
      true,
    );
  });

  test("property advertiser identity opens an owner profile or agency storefront", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/immo/bien/appartement-lumineux-lyon-montchat", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    const ownerContactPanel = page
      .getByRole("complementary")
      .filter({ hasText: "Contacter l’annonceur" });
    const ownerLink = ownerContactPanel.getByRole("link", {
      name: "Voir le profil de Marie D.",
    });
    await expect(
      ownerLink.getByRole("img", { name: "Avatar de Marie D." }),
    ).toBeVisible();
    await expect(ownerLink).toContainText("MD");
    await expect(
      ownerLink.getByRole("img", { name: "Note 4,9 sur 5, 7 avis" }),
    ).toBeVisible();
    await expect(ownerLink).toContainText("Lyon");
    await ownerLink.click();
    await expect(page).toHaveURL(/\/profil\/marie-durand$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Marie Durand/i }),
    ).toBeVisible();

    await page.goto("/immo/bien/maison-familiale-ecully-jardin", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    const agencyContactPanel = page
      .getByRole("complementary")
      .filter({ hasText: "Contacter l’annonceur" });
    const agencyLink = agencyContactPanel.getByRole("link", {
      name: "Visiter la boutique de Agence Canopée",
    });
    await expect(
      agencyLink.getByRole("img", { name: "Avatar de Agence Canopée" }),
    ).toBeVisible();
    await expect(agencyLink).toContainText("AC");
    await expect(agencyLink).toContainText("Agence Canopée");
    const professionalBadge = agencyLink.getByRole("img", {
      name: "Compte professionnel",
    });
    await expect(professionalBadge).toBeVisible();
    await expect(professionalBadge).toHaveAttribute(
      "data-ui-pro-badge",
      "true",
    );
    await expect(professionalBadge).toHaveClass(/\btext-overline\b/);
    await expect(professionalBadge).toHaveClass(/\bpx-1\b/);
    await expect(
      agencyLink.getByRole("img", { name: "Note 4,9 sur 5, 86 avis" }),
    ).toBeVisible();
    await expect(agencyLink).toContainText("Écully");
    await expect(agencyLink).toHaveAttribute(
      "href",
      "/boutique/agence-canopee",
    );
    await agencyLink.click();
    await expect(page).toHaveURL(/\/boutique\/agence-canopee$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Agence Canopée/i }),
    ).toBeVisible();
  });

  test("publisher preserves non-sensitive draft state through its service-shaped payload", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deposer/immo", { waitUntil: "domcontentloaded" });
    const preparation = page.getByRole("region", {
      name: "Avant de publier votre bien",
    });
    await expect(preparation).toBeVisible();
    await preparation
      .getByRole("button", { name: /l’annonce immobilière$/ })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Publier un bien" }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Votre projet", exact: true })
      .selectOption("sale");
    await page
      .getByRole("combobox", { name: "Type de bien", exact: true })
      .selectOption("apartment");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Adresse exacte").fill("14 rue test, 69003 Lyon");
    await page
      .getByRole("textbox", { name: "Ville", exact: true })
      .fill("Lyon");
    await expect
      .poll(
        async () =>
          (
            await browserApi(page, "/real-estate/drafts", {
              method: "POST",
              body: { marketCode: "FR" },
            })
          ).body.data,
      )
      .toMatchObject({
        address: { exactAddress: "14 rue test, 69003 Lyon", city: "Lyon" },
        propertyType: "apartment",
      });
    await page.reload();
    await page
      .getByRole("button", { name: /Reprendre l’annonce immobilière/ })
      .click();
    await expect(page.getByLabel("Adresse exacte")).toHaveValue(
      "14 rue test, 69003 Lyon",
    );
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(storage).not.toContain("14 rue test");
    expect(storage).not.toContain("paymentSecret");
    expect(storage).not.toContain("riskSignals");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("agency and admin workspaces expose operational controls", async ({
    page,
  }) => {
    await usePersona(page, "pro_immo");
    await page.goto("/compte/immo", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Agence Canopée" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Imports", exact: true }).click();
    // The commercial catalogue suspends portfolio imports on every agency plan
    // until the production journey ships; the workspace must say so instead
    // of offering a request the API refuses.
    const csvImport = page.getByRole("button", { name: "Importer un CSV" });
    await expect(csvImport).toBeDisabled();
    await expect(csvImport).toHaveAccessibleDescription(
      /ne sont pas inclus dans votre formule/,
    );
    await expect(
      page.getByRole("button", { name: "Déclarer un flux XML" }),
    ).toBeDisabled();
    await expect(page.getByText("portefeuille-lyon.csv")).toHaveCount(0);

    const adminPage = await page.context().newPage();
    await usePersona(adminPage, "admin");
    await adminPage.goto("/admin/immo", { waitUntil: "domcontentloaded" });
    await expect(
      adminPage.getByRole("heading", {
        level: 1,
        name: "Shongre Immo · France",
      }),
    ).toBeVisible();
    await expect(adminPage.getByText("Offres et quotas")).toBeVisible();
    await expect(adminPage.getByText("File de modération")).toBeVisible();
  });
});
