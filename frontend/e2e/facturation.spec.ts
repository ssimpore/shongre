import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";
import { FACTURATION_ORIGIN, facturationUrl } from "./routes";

/*
 * Facturation is its own application: the isolated runner serves it from a
 * dedicated origin, as production does, so every address below is built with
 * `facturationUrl` and every session is opened on that origin.
 */
const signIn = (
  page: Parameters<typeof usePersona>[0],
  persona: Parameters<typeof usePersona>[1],
) => usePersona(page, persona, { origin: FACTURATION_ORIGIN || undefined });
const facturationPath = (path: string) =>
  new RegExp(
    `${facturationUrl(path).replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`,
  );

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test.describe("Shongre Facturation product boundary", () => {
  test("is reachable from the platform footer through the solutions catalogue", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    // The footer no longer lists each product; the catalogue is the entry.
    await page
      .getByRole("link", { name: "Toutes les solutions Shongre", exact: true })
      .click();
    await expect(page).toHaveURL(/\/solutions$/);
    await waitForStableLayout(page);
    // The footer carries the same address in a collapsed menu; the catalogue
    // card is the visible one.
    await page
      .getByRole("main")
      .locator('a[href$="/solutions/facturation"]')
      .first()
      .click();
    await expect(page).toHaveURL(/\/solutions\/facturation$/);
    await page
      .getByRole("link", { name: "Découvrir Facturation", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(facturationPath("/"));
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
    await signIn(page, "standalone_facturation");
    await page.goto(facturationUrl("/onboarding"), {
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
    await expect(page).toHaveURL(facturationPath("/app"));
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
    await signIn(page, "pro_immo");
    await page.goto(facturationUrl("/activation"), {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", {
        name: "Ajoutez Facturation à votre organisation",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Activer Facturation" }).click();
    await expect(page).toHaveURL(facturationPath("/onboarding"));
    await page
      .getByRole("button", { name: "Continuer la configuration" })
      .click();
    await expect(page.getByText("Agence Canopée").first()).toBeVisible();
  });

  test("keeps Prospects-only organizations out of the Facturation workspace", async ({
    page,
  }) => {
    await signIn(page, "standalone_prospects");
    await page.goto(facturationUrl("/app"), { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(facturationPath("/activation"));
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
    await signIn(page, "pro_seller");
    await page.goto(facturationUrl("/app"), { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Facturation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Plateforme Shongre" }).first(),
    ).toBeVisible();

    // Prospects shares the marketplace origin here; its session is its own.
    await usePersona(page, "pro_seller");
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
    await signIn(page, "standalone_facturation");
    await page.goto(facturationUrl("/app"), { waitUntil: "domcontentloaded" });
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
