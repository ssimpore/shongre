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
    await page.goto("/auto", { waitUntil: "networkidle" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Voitures d’occasion" }),
    ).toBeVisible();
    const cards = page.getByRole("article");
    await expect(cards).toHaveCount(4);
    await page.getByLabel("Marque").selectOption("peugeot");
    await expect(page).toHaveURL(/make=peugeot/);
    await expect(cards).toHaveCount(3);

    await cards.nth(0).getByRole("button", { name: "Comparer" }).click();
    await cards.nth(1).getByRole("button", { name: "Comparer" }).click();
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
    await page.goto("/auto", { waitUntil: "networkidle" });
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
    await expect(dialog.getByLabel("Rayon")).toBeVisible();

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
      waitUntil: "networkidle",
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

  test("mobile publication never writes VIN or registration into local storage", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deposer/auto", { waitUntil: "networkidle" });
    await waitForStableLayout(page);

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
    await page.goto("/compte/auto", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Espace Auto" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Imports", exact: true }).click();
    await expect(page.getByText("Imports & synchronisation")).toBeVisible();
    await page.getByRole("button", { name: "Importer un CSV" }).click();
    await expect(page.getByText("stock_auto_demo.csv")).toBeVisible();

    const adminPage = await page.context().newPage();
    await usePersona(adminPage, "admin");
    await adminPage.goto("/admin/auto", { waitUntil: "networkidle" });
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
