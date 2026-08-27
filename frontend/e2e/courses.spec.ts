import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

const blockingImpacts = new Set(["critical", "serious"]);

test.describe("Shongre Education", () => {
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

  test("search is URL-driven, comparable and accessible", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/education", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "professeur",
    );
    const cards = page.getByRole("article");
    await expect(cards.first()).toBeVisible();

    await page
      .getByRole("button", { name: "Matière", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Mathématiques", exact: true })
      .click();
    await expect(page).toHaveURL(/subject=subject_mathematics/);
    await expect(cards.first()).toContainText("Mathématiques");

    const compare = cards.first().getByRole("checkbox", { name: "Comparer" });
    await compare.check();
    await expect(compare).toBeChecked();
    await expect
      .poll(() =>
        page.locator("h2, p").evaluateAll((elements) =>
          elements.some((element) => {
            const rect = element.getBoundingClientRect();
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              /Comparer \(1\/4\)|1 professeur à comparer/.test(
                element.textContent || "",
              )
            );
          }),
        ),
      )
      .toBe(true);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        blockingImpacts.has(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("mobile filters fit the viewport and expose a named dialog", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/education", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Filtres" }).click();
    const dialog = page.getByRole("dialog", {
      name: "Filtrer les professeurs",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Matière", { exact: true })).toBeVisible();
  });

  test("public tutor profile has one canonical head and no private contact details", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/education/professeur/sophie-martin-lyon", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", { level: 1, name: "Sophie Martin" }),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText(
      /sophie@|06\s?\d{2}|adresse exacte/i,
    );
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="canonical"]')).toHaveCount(1);
    await expect(
      page.locator('body meta[name="description"], body link[rel="canonical"]'),
    ).toHaveCount(0);
  });

  test("minor requests require a guardian and never persist guardian identity locally", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.goto("/education/demande", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Matière").selectOption("subject_mathematics");
    await page.getByLabel("Niveau de l’élève").selectOption("middle_school");
    await page
      .getByLabel("Objectif principal")
      .fill("Préparer le brevet avec une méthode régulière.");
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.getByRole("checkbox", { name: "Week-end" }).check();
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.getByLabel("Date de début souhaitée").fill("2026-09-15");
    await page.getByRole("button", { name: "Continuer" }).click();

    await page.getByLabel("Tranche d’âge de l’élève").selectOption("13_15");
    await expect(page.getByText("Responsable légal requis")).toBeVisible();
    const submit = page.getByRole("button", { name: "Envoyer ma demande" });
    await expect(submit).toBeDisabled();

    await page.getByLabel("Nom du responsable").fill("Julie Test");
    await page.getByLabel("Lien avec l’élève").fill("Mère");
    await page
      .getByRole("checkbox", { name: /je confirme être habilité/i })
      .check();
    await expect(submit).toBeEnabled();

    const storedDraft = await page.evaluate(
      () => localStorage.getItem("shongre_course_request_draft_v1") || "",
    );
    expect(storedDraft).not.toContain("Julie Test");
    expect(storedDraft).not.toContain("Mère");
  });

  test("legacy public URLs redirect permanently and preserve query parameters", async ({
    page,
  }) => {
    const response = await page.request.get("/cours?query=maths", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/education?query=maths");

    await page.goto("/cours/professeur/sophie-martin-lyon?source=legacy");
    await expect(page).toHaveURL(
      /\/education\/professeur\/sophie-martin-lyon\?source=legacy$/,
    );
  });
});
