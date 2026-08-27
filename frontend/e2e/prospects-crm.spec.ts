import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const PROSPECTS_ROUTES = [
  "/prospects",
  "/app",
  "/app/discover",
  "/app/companies",
  "/app/contacts",
  "/app/lists",
  "/app/pipeline",
  "/app/tasks",
  "/app/activities",
  "/app/campaigns",
  "/app/analytics",
  "/app/sources",
  "/app/team",
  "/app/billing",
  "/app/settings",
] as const;

const ACCESSIBILITY_ROUTES = [
  "/prospects",
  "/app",
  "/app/discover",
  "/app/companies",
  "/app/pipeline",
  "/app/settings",
] as const;

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "standalone_prospects");
});

test.describe("Shongre Prospects CRM", () => {
  test("runs discovery, evidence review and CRM import from product routes", async ({
    page,
  }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", {
        name: "Pilotez chaque relation commerciale",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", {
        name: "Navigation principale de Shongre Prospects",
      }),
    ).toContainText("Entreprises");

    await page.getByRole("link", { name: "Découvrir", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/discover$/);
    await page
      .getByRole("textbox", { name: "Décrivez les entreprises recherchées" })
      .fill("ateliers automobiles");
    await page
      .getByLabel("Contenu de Shongre Prospects")
      .getByRole("button", { name: "Découvrir", exact: true })
      .click();

    await expect(
      page.getByText("1 résultat · revue humaine requise"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Examiner Atelier Horizon Mobilité" })
      .click();
    await expect(page.getByText(/Preuves et provenance/i)).toBeVisible();
    await page
      .getByRole("button", { name: "Valider et ajouter au CRM" })
      .click();
    const confirmation = page.getByRole("dialog", {
      name: "Ajouter ce prospect au CRM ?",
    });
    await expect(confirmation).toContainText("Aucun message externe");
    await expect(
      page.getByRole("button", { name: "Ajouté au CRM", exact: true }),
    ).toHaveCount(0);
    await confirmation.getByRole("button", { name: "Ajouter au CRM" }).click();
    await expect(
      page.getByRole("button", { name: "Ajouté au CRM", exact: true }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Entreprises", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/companies$/);
    await expect(
      page.getByRole("heading", { name: "Entreprises" }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Listes", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/lists$/);
    await expect(
      page.getByRole("heading", { name: "Listes d’entreprises" }),
    ).toBeVisible();
  });

  test("keeps configuration routes permission-aware", async ({ page }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/app/settings", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: "Accès restreint" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Paramètres" })).toHaveCount(
      0,
    );
  });

  test("uses intentional mobile navigation and returns to evidence after cancelling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(page.getByText("Organisation active")).toBeVisible();
    await expect(page.getByText("Nova Croissance")).toBeVisible();
    const section = page.getByLabel("Section de l’espace");
    await section.selectOption("/app/discover");
    await expect(page).toHaveURL(/\/app\/discover$/);

    await page
      .getByRole("textbox", { name: "Décrivez les entreprises recherchées" })
      .fill("Mobilier reconditionné");
    await page
      .getByLabel("Contenu de Shongre Prospects")
      .getByRole("button", { name: "Découvrir", exact: true })
      .click();
    await page.getByRole("button", { name: /Maison Seconde Vie/ }).click();

    const evidence = page.getByRole("dialog", { name: "Brief et preuves" });
    await expect(evidence).toContainText("Pourquoi ce score");
    await expect(evidence).toContainText(
      "Registre professionnel de démonstration",
    );
    await evidence
      .getByRole("button", { name: "Examiner et relier le doublon" })
      .click();

    const confirmation = page.getByRole("dialog", {
      name: "Relier ce prospect au compte existant ?",
    });
    await expect(confirmation).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(
      await confirmation.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
    await confirmation
      .getByRole("button", { name: "Revenir aux preuves" })
      .click();
    const restoredEvidence = page.getByRole("dialog", {
      name: "Brief et preuves",
    });
    await expect(restoredEvidence).toBeVisible();
    expect(
      await restoredEvidence.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  });

  test("distinguishes an empty search from the initial discovery state", async ({
    page,
  }) => {
    await page.goto("/app/discover", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: "Lancez votre première découverte" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Décrivez les entreprises recherchées" })
      .fill("Entreprise qui ne correspond à rien");
    await page
      .getByLabel("Contenu de Shongre Prospects")
      .getByRole("button", { name: "Découvrir", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Aucun résultat vérifiable" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Élargir à toutes les entreprises" })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "2 résultats" }),
    ).toBeVisible();
  });

  test("uses a truthful account-creation CTA for signed-out visitors", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/prospects", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cta = page
      .getByRole("link", { name: "Créer mon espace Prospects" })
      .first();
    await expect(cta).toHaveAttribute(
      "href",
      /\/inscription\/professionnel\?redirect=%2Fapp/,
    );
  });

  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    test(`has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of PROSPECTS_ROUTES) {
        await test.step(route, async () => {
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await waitForStableLayout(page);

          const dimensions = await page.evaluate(() => ({
            viewport: document.documentElement.clientWidth,
            content: document.documentElement.scrollWidth,
          }));
          expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
        });
      }
    });
  }

  for (const width of [390, 1280]) {
    test(`has no serious accessibility violation at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ACCESSIBILITY_ROUTES) {
        await test.step(route, async () => {
          await page.goto(route, { waitUntil: "domcontentloaded" });
          await waitForStableLayout(page);

          const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            .analyze();
          const blocking = results.violations.filter((violation) =>
            ["critical", "serious"].includes(violation.impact ?? ""),
          );
          expect(blocking).toEqual([]);
        });
      }
    });
  }
});
