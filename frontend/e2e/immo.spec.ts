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
    await usePersona(page, "guest");
    await page.goto("/immo", { waitUntil: "networkidle" });
    await waitForStableLayout(page);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Trouvez le bien qui vous ressemble",
      }),
    ).toBeVisible();
    await expect(page.getByRole("article").first()).toBeVisible();
    await page.getByLabel("Ville").fill("Écully");
    await expect(page).toHaveURL(/city=%C3%89cully/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("button", { name: "Créer une alerte" }).click();
    const stored = await page.evaluate(() =>
      localStorage.getItem("shongre_saved_searches_v1"),
    );
    expect(stored).toContain("real-estate");
    expect(await page.locator("body").innerText()).not.toContain(
      "Adresse privée",
    );
  });

  test("mobile filter sheet fits and passes blocking WCAG checks", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/immo", { waitUntil: "networkidle" });
    await waitForStableLayout(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Filtres", exact: true }).click();
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
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Appartement lumineux",
    );
    await expect(page.getByText("Contacter l’annonceur")).toBeVisible();
    const body = page.locator("body");
    await expect(body).not.toContainText(
      /Adresse privée|documents-private|riskSignals|Montchat, Lyon 3e/,
    );
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
    await expect(
      page.locator('head script[type="application/ld+json"]'),
    ).toHaveCount(1);
  });

  test("publisher preserves non-sensitive draft state through its service-shaped payload", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/deposer/immo", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Publier un bien" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.getByLabel("Adresse exacte").fill("14 rue test, 69003 Lyon");
    await page.getByLabel("Ville").fill("Lyon");
    await page.waitForTimeout(500);
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    expect(storage).toContain("14 rue test");
    expect(storage).not.toContain("paymentSecret");
    expect(storage).not.toContain("riskSignals");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  });

  test("agency and admin workspaces expose operational controls", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/compte/immo", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Agence Canopée" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Imports", exact: true }).click();
    await page.getByRole("button", { name: "Importer un CSV" }).click();
    await expect(page.getByText("portefeuille-lyon.csv")).toBeVisible();

    const adminPage = await page.context().newPage();
    await usePersona(adminPage, "admin");
    await adminPage.goto("/admin/immo", { waitUntil: "networkidle" });
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
