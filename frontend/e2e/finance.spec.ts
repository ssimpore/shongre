import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

test.describe("platform finance", () => {
  test("keeps platform totals, transaction detail and reconciliation coherent", async ({ page }) => {
    await usePersona(page, "finance");
    await page.goto("/admin/finance", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Finance de la plateforme/);
    await expect(page.getByRole("heading", { name: "Finance de la plateforme" })).toBeVisible();
    await expect(page.getByText("42 860 €", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Transactions", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Détail TX-20260822-1821" })).toBeVisible();
    await expect(page.getByRole("row", { name: "Total 120 € 120 €" })).toBeVisible();
    await expect(page.getByText("Écriture équilibrée", { exact: true })).toBeVisible();
    await expect(page.getByText("Écart 0,02 €", { exact: true })).toBeVisible();
  });

  test("filters one market without breaking finance invariants", async ({ page }) => {
    await usePersona(page, "finance");
    await page.goto("/admin/finance", { waitUntil: "domcontentloaded" });
    await page.getByRole("combobox").nth(1).selectOption("FR");
    await expect(page.getByText("32 140 €", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("row", { name: /FR · France/ })).toBeVisible();
    await expect(page.getByRole("row", { name: /BE · Belgique/ })).toHaveCount(0);
  });

  for (const viewport of [
    { name: "small phone", width: 320, height: 720 },
    { name: "phone", width: 390, height: 844 },
    { name: "tablet", width: 768, height: 900 },
  ]) {
    test(`is usable on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await usePersona(page, "finance");
      await page.goto("/admin/finance", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      await expectNoHorizontalOverflow(page, `platform finance @ ${viewport.width}px`);
      await expect(page.getByRole("heading", { name: "Finance de la plateforme" })).toBeVisible();
      await page.getByRole("button", { name: "Transactions", exact: true }).click();
      await expect(page.getByText("TX-20260822-1821", { exact: true }).last()).toBeVisible();
    });
  }

  test("has no critical or serious accessibility violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "finance");
    await page.goto("/admin/finance", { waitUntil: "domcontentloaded" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter((item) => ["critical", "serious"].includes(item.impact ?? ""))).toEqual([]);
  });

  test("keeps reconciliation operations restricted to finance operators", async ({ page }) => {
    await usePersona(page, "admin");
    await page.goto("/admin/finance", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Finance de la plateforme" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Rapprochement", exact: true })).toHaveCount(0);
  });
});

test.describe("account finance isolation", () => {
  test("shows only the active customer account", async ({ page }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/compte/finances", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Mes finances" })).toBeVisible();
    await expect(page.getByText("Thomas Laurent", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("Garage Martin", { exact: true })).toHaveCount(0);
  });

  test("shows the professional organization view without platform revenue", async ({ page }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/compte/pro/finances", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Finances de l’organisation" })).toBeVisible();
    await expect(page.getByText("Revenus vendeur", { exact: true })).toBeVisible();
    await expect(page.getByText("Revenus plateforme", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: /Factures et reçus/ }).click();
    await expect(page.getByRole("dialog", { name: "Factures et reçus" })).toBeVisible();
  });
});
