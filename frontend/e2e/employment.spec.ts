import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

const seedConsent = async (page: Parameters<typeof usePersona>[0]) => {
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
};

test.describe("Shongre Emploi journeys", () => {
  test("job search and detail stay employment-specific", async ({ page }) => {
    await usePersona(page, "guest");
    await seedConsent(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/emploi?q=React", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { name: /emploi/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByText("Développeur·se front-end React"),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, "employment search @ 390px");

    await page.getByText("Développeur·se front-end React").click();
    await expect(page.getByRole("button", { name: /postuler/i })).toBeVisible();
    await expect(
      page.getByText(/aucun paiement ne peut être demandé/i),
    ).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/livraison|état du produit|ajouter au panier/i),
    ).toHaveCount(0);
  });

  test("a candidate applies directly without a payment step", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await seedConsent(page);
    await page.goto(
      "/emploi/offre/equipier-ere-polyvalent-e-saisonnier-job-seasonal-nice/postuler",
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.getByText("Aucun frais pour le candidat")).toBeVisible();
    await page
      .getByLabel(/j’accepte que ces informations soient transmises/i)
      .check();
    await page.getByRole("button", { name: "Envoyer ma candidature" }).click();
    await expect(
      page.getByRole("heading", { name: "Candidature envoyée" }),
    ).toBeVisible();
    await expect(
      page.locator("main").getByText(/paiement|carte bancaire/i),
    ).toHaveCount(0);
  });

  test("the recruiter workspace follows the selected demo persona", async ({
    page,
  }) => {
    await usePersona(page, "pro_employment");
    await seedConsent(page);
    await page.goto("/compte/emploi/recruteur", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "TechNova" })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact || ""),
      ),
    ).toEqual([]);
  });
});
