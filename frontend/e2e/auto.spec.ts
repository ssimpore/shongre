import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

const blockingImpacts = new Set(["critical", "serious"]);

test.describe("Shongre Auto", () => {
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

  test("search filters are URL-driven and lead into a 2-to-4 vehicle comparison", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/auto", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Voitures d’occasion" }),
    ).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    await page.getByRole("button", { name: "Marque", exact: true }).click();
    await page.getByRole("option", { name: "Peugeot", exact: true }).click();
    await expect(page).toHaveURL(/make=peugeot/);
    await expect(cards).toHaveCount(3);

    await cards
      .nth(0)
      .getByRole("button", { name: /ajouter .+ à la comparaison/i })
      .click();
    await cards
      .nth(1)
      .getByRole("button", { name: /ajouter .+ à la comparaison/i })
      .click();
    const compareLink = page.getByRole("link", {
      name: /Voir la comparaison|Comparer/,
    });
    await expect(compareLink).toBeVisible();
    await compareLink.click();
    await expect(page).toHaveURL(/\/auto\/comparer\?ids=/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Comparer les véhicules" }),
    ).toBeVisible();
    await expect(page.getByRole("table")).toContainText("Kilométrage");
  });

  test("mobile filters fit the viewport and expose vehicle-specific EV controls", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auto", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Filtres" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Filtrer les véhicules",
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByLabel("Capacité de batterie minimum"),
    ).toBeVisible();
    await expect(
      dialog.getByLabel("Autonomie électrique minimum"),
    ).toBeVisible();
    await expect(
      dialog.locator("#auto-location-selector-mobile"),
    ).toHaveAttribute("data-location-selector", "true");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        blockingImpacts.has(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("vehicle detail exposes trust context without private identity values", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/auto/vehicule/peugeot-3008-puretech-130-gt-line-2020", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Peugeot 3008",
    );
    await expect(page.getByText("Documents et confiance")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /VF3[A-Z0-9]{8}|AA-123-AA|sha256:/,
    );
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
    await expect(
      page.locator('head script[type="application/ld+json"]'),
    ).toHaveCount(1);
  });

  test("vehicle detail supports multiple publication photos without breaking single-photo listings", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const gallery = page.getByRole("group", {
      name: "Galerie de photos (3)",
    });
    await expect(gallery).toBeVisible();
    await expect(page.getByRole("status")).toContainText("Photo 1 sur 3");
    await expect(
      gallery.getByRole("img", {
        name: /Peugeot 3008 BlueHDi 130 S&S BVM6 Allure - Photo 1/,
      }),
    ).toBeVisible();

    await gallery.getByRole("button", { name: "Photo suivante" }).click();
    await expect(page.getByRole("status")).toContainText("Photo 2 sur 3");
    await expect(
      gallery.getByRole("img", {
        name: /Peugeot 3008 BlueHDi 130 S&S BVM6 Allure - Photo 2/,
      }),
    ).toBeVisible();

    await page.goto("/auto/vehicule/peugeot-3008-puretech-130-gt-line-2020", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    await expect(
      page.getByRole("group", { name: "Galerie de photos (1)" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Photo suivante" }),
    ).toHaveCount(0);
  });

  test("similar vehicles use one horizontal responsive listing rail", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 900 });
    await page.goto("/auto/vehicule/peugeot-3008-bluehdi-130-allure-2019", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const heading = page.getByRole("heading", {
      level: 2,
      name: "Véhicules similaires",
    });
    const section = page.locator("section", { has: heading });
    const cards = section.locator('[data-listing-card="true"]');
    await expect(cards).toHaveCount(2);

    const desktopRects = await cards.evaluateAll((items) =>
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top };
      }),
    );
    expect(new Set(desktopRects.map(({ top }) => Math.round(top))).size).toBe(
      1,
    );
    expect(desktopRects[1]?.left).toBeGreaterThan(desktopRects[0]?.right ?? 0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(1408);

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForStableLayout(page);

    const track = section.locator(".scroll-rail-shell > div").first();
    const mobileOverflow = await track.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
    }));
    expect(mobileOverflow.scrollWidth).toBeGreaterThan(
      mobileOverflow.clientWidth,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);

    const maxScrollLeft =
      mobileOverflow.scrollWidth - mobileOverflow.clientWidth;
    const scrollTowardsStart = mobileOverflow.scrollLeft > maxScrollLeft / 2;
    await page
      .getByRole("button", {
        name: scrollTowardsStart
          ? /faire défiler les véhicules similaires vers la gauche/i
          : /faire défiler les véhicules similaires vers la droite/i,
      })
      .click();
    const observedScrollLeft = expect.poll(() =>
      track.evaluate((element) => element.scrollLeft),
    );
    if (scrollTowardsStart) {
      await observedScrollLeft.toBeLessThan(mobileOverflow.scrollLeft);
    } else {
      await observedScrollLeft.toBeGreaterThan(mobileOverflow.scrollLeft);
    }
  });

  test("mobile publication never writes VIN or registration into local storage", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deposer/auto", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await page
      .getByRole("button", {
        name: /^(?:Commencer|Reprendre) l’annonce véhicule$/,
      })
      .click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Publier un véhicule" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("VIN").fill("VF3SECRET12345678");
    await page.getByLabel("Immatriculation").fill("BB-456-BB");
    await page.waitForTimeout(500);
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(storage).not.toContain("VF3SECRET12345678");
    expect(storage).not.toContain("BB-456-BB");
    await page.getByRole("button", { name: "Vérifier les doublons" }).click();
    await expect(page.getByText("Aucun doublon détecté")).toBeVisible();
    await expect(page.getByLabel("VIN")).toHaveValue("");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("dealer and admin workspaces expose gated operational surfaces", async ({
    page,
  }) => {
    await usePersona(page, "pro_auto");
    await page.goto("/compte/auto", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Espace Auto" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Imports", exact: true }).click();
    await expect(page.getByText("Imports & synchronisation")).toBeVisible();
    await expect(
      page.getByText(
        "Les imports historiques restent consultables. Les nouveaux imports CSV et XML sont temporairement indisponibles.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Importer un CSV" }),
    ).toBeDisabled();
    await expect(page.getByText("stock_auto_demo.csv")).toHaveCount(0);

    const adminPage = await page.context().newPage();
    await usePersona(adminPage, "admin");
    await adminPage.goto("/admin/auto", { waitUntil: "domcontentloaded" });
    await expect(
      adminPage.getByRole("heading", {
        level: 1,
        name: "Administration Shongre Auto",
      }),
    ).toBeVisible();
    await adminPage
      .getByRole("button", { name: "Partenaires", exact: true })
      .click();
    await expect(
      adminPage.getByText("Parrainages partenaires — inactifs"),
    ).toBeVisible();
  });
});
