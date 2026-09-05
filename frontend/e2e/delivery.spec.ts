import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";
import { DEMO_DELIVERY_REQUEST_ID } from "./routes";

const blockingImpacts = new Set(["critical", "serious"]);

test.describe("Shongre Livraison & coursier", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("public discovery is responsive and keeps precise stops private", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await usePersona(page, "guest");
    await page.goto("/livraison", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Livraison & coursier" }),
    ).toBeVisible();
    await expect(page.getByText("Livrer un petit meuble")).toBeVisible();

    await page.goto(`/livraison/demande/${DEMO_DELIVERY_REQUEST_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    const body = page.locator("body");
    await expect(body).toContainText("Paris");
    await expect(body).toContainText("Boulogne-Billancourt");
    await expect(body).not.toContainText("12 rue Oberkampf");
    await expect(body).not.toContainText("8 avenue Victor-Hugo");
    await expect(body).not.toContainText("+33600000000");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        blockingImpacts.has(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("standalone request publication uses the protected delivery workflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await usePersona(page, "individual_buyer");
    await page.goto("/livraison/nouvelle-demande", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await page.getByLabel("Titre").fill("Livrer deux cartons à Lyon");
    await page
      .getByLabel("Description")
      .fill("Deux cartons fermés à transporter avec précaution.");
    await page.getByLabel("Adresse").nth(0).fill("10 rue de la République");
    await page.getByLabel("Ville").nth(0).fill("Lyon");
    await page.getByLabel("Code postal").nth(0).fill("69002");
    await page.getByLabel("Adresse").nth(1).fill("5 avenue des Frères Lumière");
    await page.getByLabel("Ville").nth(1).fill("Lyon");
    await page.getByLabel("Code postal").nth(1).fill("69008");
    await page.getByLabel("Nom du contact").fill("Thomas Laurent");
    await page.getByLabel("Téléphone du contact").fill("+33612345678");
    await page.getByLabel("Type de colis").fill("Cartons");
    await page.getByLabel("Poids approximatif (kg)").fill("12");

    await page.getByRole("button", { name: "Publier la demande" }).click();

    await expect(page).toHaveURL(/\/compte\/livraison\/[0-9a-f-]{36}$/);
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: "Livrer deux cartons à Lyon",
      }),
    ).toBeVisible();
    await expect(page.getByText("10 rue de la République")).toBeVisible();
  });

  test("authenticated members can report delivery UGC through moderation", async ({
    page,
  }) => {
    await usePersona(page, "individual_seller");
    await page.goto(`/livraison/demande/${DEMO_DELIVERY_REQUEST_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await page.getByRole("button", { name: "Signaler cette demande" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Signaler une demande de livraison",
    });
    await dialog.getByLabel("Motif").selectOption("prohibited");
    await dialog
      .getByLabel("Précisions")
      .fill("Le contenu décrit un bien potentiellement interdit.");
    await dialog
      .getByRole("button", { name: "Envoyer le signalement" })
      .click();

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Le signalement a été transmis." }),
    ).toBeVisible();
  });

  test("mobile marketplace and courier profile fit without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await usePersona(page, "individual_buyer");
    await page.goto("/livraison", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expectNoHorizontalOverflow(page);

    await page.goto("/compte/livraison/coursier", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    await expect(page.getByLabel("Première zone · ville")).toBeVisible();
    await expect(
      page.getByLabel("Deuxième zone · ville (facultatif)"),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
