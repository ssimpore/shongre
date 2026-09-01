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
  test("recent jobs reuse the homepage listing rail spacing tokens", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await seedConsent(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "shongre_employment_recent_jobs:user_thomas",
        JSON.stringify([
          "job-product-intern-bordeaux",
          "job-react-lyon",
          "job-data-paris",
          "job-seasonal-nice",
        ]),
      );
    });
    await page.setViewportSize({ width: 1408, height: 749 });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const homepageGap = await page
      .locator(".listing-rail-track")
      .first()
      .evaluate((track) =>
        Number.parseFloat(getComputedStyle(track).columnGap),
      );

    await page.goto("/emploi", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const recentSection = page.locator("section", {
      has: page.getByRole("heading", {
        name: "Offres consultées récemment",
      }),
    });
    const recentTrack = recentSection.locator(".listing-rail-track");
    const cells = recentTrack.locator(".listing-rail-cell");
    await expect(cells).toHaveCount(4);

    const employmentCards = page.locator(
      '[data-listing-card-consumer="employment"]',
    );
    await expect(employmentCards).toHaveCount(12);
    await expect(
      employmentCards.locator('img[src$="/images/categories/emploi.jpg"]'),
    ).toHaveCount(12);
    await expect(
      page.getByRole("img", { name: "Image indisponible" }),
    ).toHaveCount(0);

    const desktopContract = await recentTrack.evaluate((track) => {
      const root = getComputedStyle(document.documentElement);
      const cardCells = [
        ...track.querySelectorAll<HTMLElement>(".listing-rail-cell"),
      ];
      return {
        gap: Number.parseFloat(getComputedStyle(track).columnGap),
        tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
        widths: cardCells.map((cell) => cell.getBoundingClientRect().width),
      };
    });
    expect(desktopContract.gap).toBe(homepageGap);
    expect(desktopContract.tokenWidth).toBe("13rem");
    expect(desktopContract.widths).toEqual([208, 208, 208, 208]);

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForStableLayout(page);
    const mobileGap = await recentTrack.evaluate((track) =>
      Number.parseFloat(getComputedStyle(track).columnGap),
    );
    expect(mobileGap).toBe(12);
    await expectNoHorizontalOverflow(page, "employment recent jobs @ 390px");
  });

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
    const locationSelector = page.locator("#employment-location-selector");
    await expect(locationSelector).toHaveAttribute(
      "data-location-selector",
      "true",
    );
    await locationSelector.click();
    const locationDialog = page.getByRole("dialog", {
      name: "Zone géographique",
    });
    await locationDialog.locator("#location-city-input").fill("Lyon");
    await locationDialog
      .getByRole("button", { name: "Appliquer la zone" })
      .click();
    await expect(page).toHaveURL(/location=Lyon/);
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

    const employerLink = page.getByRole("link", { name: "TechNova" }).first();
    await expect(employerLink).toHaveAttribute("href", "/boutique/technova");
    await employerLink.click();
    await expect(page).toHaveURL(/\/boutique\/technova$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "TechNova" }),
    ).toBeVisible();
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
    await page.goto("/compte/emploi/recruteur", {
      waitUntil: "domcontentloaded",
    });
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
