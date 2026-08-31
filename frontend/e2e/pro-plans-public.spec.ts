import { expect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("public professional pricing", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("shows plans and prices to a visitor without loading private billing", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Développez votre activité avec Shongre Pro",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Un forfait pour chaque étape" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Shongre Pro", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Aperçu du catalogue cible" }),
    ).toHaveCount(0);
    await expect(page.getByText("Aperçu v4 · marché FR")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Pro Starter", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.locator("article").filter({ hasText: "HT / mois" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Créer un compte Pro" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Votre abonnement et votre usage" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("alert").filter({
        hasText: "Vous ne disposez pas des autorisations nécessaires",
      }),
    ).toHaveCount(0);
  });

  test("keeps read-only Staff on public pricing and blocks subscription before side effects", async ({
    page,
  }) => {
    await usePersona(page, "support");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Un forfait pour chaque étape" }),
    ).toBeVisible();
    await expect(page.getByText("HT / mois").first()).toBeVisible();

    const protectedRequests: string[] = [];
    page.on("request", (request) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
        protectedRequests.push(`${request.method()} ${request.url()}`);
      }
    });

    const action = page
      .locator(
        'button[data-marketplace-action="subscription.start"]:not([disabled])',
      )
      .first();
    await expect(action).toBeVisible();
    const currentUrl = page.url();
    await action.focus();
    await action.press("Enter");

    await expect(page).toHaveURL(currentUrl);
    await expect(action).toBeFocused();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({
        hasText: "Action indisponible pour les comptes Staff",
      }),
    ).toContainText("Aucune opération n’a été lancée");
    expect(protectedRequests).toEqual([]);
  });

  test("does not prepare a subscription for a customer without the Pro capability", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    const action = page
      .locator(
        'button[data-marketplace-action="subscription.start"]:not([disabled])',
      )
      .first();
    await expect(action).toBeVisible();
    await action.click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: "Souscription indisponible" }),
    ).toContainText("Un compte Professionnel actif");
  });

  test("lets an authorized professional prepare the existing checkout flow", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Votre abonnement et votre usage" }),
    ).toBeVisible();
    const action = page
      .locator(
        'button[data-marketplace-action="subscription.start"]:not([disabled])',
      )
      .first();
    await expect(action).toBeVisible();
    await action.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(
      dialog
        .getByText("Dû aujourd’hui")
        .or(dialog.getByText("Total dû maintenant")),
    ).toBeVisible();
    await expect(
      dialog.locator('[data-marketplace-action="subscription.confirm"]'),
    ).toBeVisible();
  });
});
