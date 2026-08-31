import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test.describe("Shongre Facturation product boundary", () => {
  test("is reachable from the platform footer as a first-class product", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await page
      .getByRole("link", { name: "Shongre Facturation", exact: true })
      .click();
    await expect(page).toHaveURL(/\/facturation$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Facturez clairement/i,
      }),
    ).toBeVisible();
  });

  test("gives a Facturation-only organization a complete isolated workspace", async ({
    page,
  }) => {
    await usePersona(page, "standalone_facturation");
    await page.goto("/facturation/onboarding", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: "Continuer la configuration" })
      .click();

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Votre espace, prêt sans la marketplace",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Marketplace" })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "Plateforme Shongre" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Prospects/i })).toHaveCount(0);
    await expect(page.getByText("Studio Rivage").first()).toBeVisible();

    await page.getByRole("link", { name: "Ouvrir Facturation" }).click();
    await expect(page).toHaveURL(/\/facturation\/app$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Facturation" }),
    ).toBeVisible();
    await expect(
      page.locator('a[href*="/facturation/facturation/"]'),
    ).toHaveCount(0);

    await page.getByLabel("Raison sociale").fill("Atelier Test Facturation");
    await page
      .getByLabel("Email de facturation")
      .fill("facturation@atelier-test.example");
    await page.getByRole("button", { name: "Ajouter le client" }).click();
    await expect(
      page.getByText("Client ajouté à l’organisation.", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Nouvelle facture/i }).click();
    await page.getByLabel("Description").fill("Audit de conformité");
    await page.getByLabel("Quantité").fill("2");
    await page.getByLabel(/Prix unitaire/i).fill("120");
    await page
      .getByRole("button", { name: "Enregistrer le brouillon" })
      .click();
    await expect(
      page.getByText("Brouillon enregistré.", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Finaliser la facture" }).click();
    await expect(
      page.getByText("Facture finalisée localement.", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Voir le document" }).click();
    await expect(
      page.getByText(
        "Dérivé texte lisible — ce fichier n’est pas un original juridique.",
      ),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Équipe et permissions" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Abonnement Facturation" }),
    ).toBeVisible();
    await expect(page.getByText("À suivre").first()).toBeVisible();
  });

  test("lets an existing Shongre organization activate Facturation as an add-on", async ({
    page,
  }) => {
    await usePersona(page, "pro_immo");
    await page.goto("/facturation/activation", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", {
        name: "Ajoutez Facturation à votre organisation",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Activer Facturation" }).click();
    await expect(page).toHaveURL(/\/facturation\/onboarding$/);
    await page
      .getByRole("button", { name: "Continuer la configuration" })
      .click();
    await expect(page.getByText("Agence Canopée").first()).toBeVisible();
  });

  test("keeps Prospects-only organizations out of the Facturation workspace", async ({
    page,
  }) => {
    await usePersona(page, "standalone_prospects");
    await page.goto("/facturation/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/facturation\/activation$/);
    await expect(
      page.getByRole("heading", {
        name: "Ajoutez Facturation à votre organisation",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Facturation",
        exact: true,
      }),
    ).toHaveCount(0);
  });

  test("keeps both workspaces available to a multi-product Shongre customer", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/facturation/app", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Facturation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Plateforme Shongre" }).first(),
    ).toBeVisible();

    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        name: "Pilotez chaque relation commerciale",
      }),
    ).toBeVisible();
  });

  test("has no blocking accessibility violations in the product-only workspace", async ({
    page,
  }) => {
    await usePersona(page, "standalone_facturation");
    await page.goto("/facturation/app", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      result.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact || ""),
      ),
    ).toEqual([]);
  });
});
