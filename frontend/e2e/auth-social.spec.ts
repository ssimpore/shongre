import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";

test.describe("social authentication and account security", () => {
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

  test("a guest completes deterministic Google sign-in and restores the account", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/connexion?returnTo=%2Fcompte", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Continuer avec Google" }).click();

    await expect(page).toHaveURL(/\/compte$/);
    await expect(page.getByRole("button", { name: "Menu du compte de Thomas Laurent" })).toBeVisible();
  });

  test("an external return target is collapsed to a same-origin path", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/connexion?returnTo=https%3A%2F%2Fevil.example%2Fsteal", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Continuer avec Apple" }).click();

    await expect(page).toHaveURL(/\/$/);
    expect(new URL(page.url()).origin).not.toBe("https://evil.example");
  });

  test("cancellation is neutral and account security fits a mobile viewport", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/auth/callback?provider=facebook&status=cancelled&returnTo=%2Fcompte");
    await expect(page.getByText(/connexion a été annulée/i)).toBeVisible();

    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compte/securite-compte", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "Connexion & sécurité" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Méthodes de connexion" })).toBeVisible();
    await expect(page.getByText("Google", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
  });
});
