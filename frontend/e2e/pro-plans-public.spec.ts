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
      page.getByRole("heading", { name: "Aperçu du catalogue cible" }),
    ).toBeVisible();
    await expect(page.getByText("Aperçu v4 · marché FR")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro Starter", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro Growth", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pro Performance", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Shongre Pro", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Shongre Free", exact: true }),
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

  test("keeps the target preview read-only for Staff without side effects", async ({
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
      .locator('button[data-marketplace-action="subscription.start"]')
      .first();
    await expect(action).toBeVisible();
    await expect(action).toBeDisabled();
    await expect(action).toHaveText("Disponible après publication");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(protectedRequests).toEqual([]);
  });

  test("does not prepare a target subscription before publication", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    const action = page
      .locator('button[data-marketplace-action="subscription.start"]')
      .first();
    await expect(action).toBeVisible();
    await expect(action).toBeDisabled();

    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("keeps existing billing readable while target checkout stays blocked", async ({
    page,
  }) => {
    await usePersona(page, "pro_seller");
    await page.goto("/solutions-pro", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Votre abonnement et votre usage" }),
    ).toBeVisible();
    const action = page
      .locator('button[data-marketplace-action="subscription.start"]')
      .first();
    await expect(action).toBeVisible();
    await expect(action).toBeDisabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
