import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { useEstablishedConsent, usePersona } from "./personas";
import { readBrowserFixtures } from "./fixtures";

const providerNames = ["Google", "Apple", "Facebook"] as const;
const providers = "**/api/v1/auth/oauth/providers";
const allAvailable = {
  google: true,
  apple: true,
  facebook: true,
  linking: false,
};
const unavailable = {
  google: false,
  apple: false,
  facebook: false,
  linking: false,
};
const returnTo = "/compte/annonces";
const query = `?redirect=${encodeURIComponent(returnTo)}`;

async function expectProviderButtons(
  page: Page,
  enabled: boolean,
  hidden = false,
) {
  for (const name of providerNames) {
    const button = page.getByRole("button", {
      name: `Continuer avec ${name}`,
      exact: true,
    });
    if (enabled) {
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
    } else if (hidden) await expect(button).toHaveCount(0);
    else await expect(button).toBeDisabled();
  }
}

test.describe("social authentication and account security", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
  });

  // Provider responses are intercepted at the HTTP boundary. These tests do
  // not establish a session or claim external provider certification.
  for (const name of providerNames) {
    test(`starts ${name} through the API and preserves the listings destination`, async ({
      page,
    }) => {
      const provider = name.toLowerCase();
      await page.route(providers, (route) =>
        route.fulfill({ json: allAvailable }),
      );
      await page.route(
        `**/api/v1/auth/oauth/${provider}/start`,
        async (route) => {
          expect(route.request().method()).toBe("POST");
          expect(route.request().postDataJSON()).toMatchObject({
            provider,
            intent: "sign_in",
            returnTo,
            clientKind: "web",
          });
          await route.fulfill({
            json: {
              authorizationUrl: new URL(
                `/auth/callback?provider=${provider}&status=cancelled&returnTo=${encodeURIComponent(returnTo)}`,
                page.url(),
              ).href,
            },
          });
        },
      );
      await page.goto(`/connexion${query}`, { waitUntil: "domcontentloaded" });
      await page
        .getByRole("button", { name: `Continuer avec ${name}` })
        .click();
      await expect(page.getByText(/connexion a été annulée/i)).toBeVisible();
      await expect(page).toHaveURL(
        new RegExp(`provider=${provider}&status=cancelled`),
      );
    });
  }

  test("an external return target is collapsed before provider authorization", async ({
    page,
  }) => {
    await page.route(providers, (route) =>
      route.fulfill({ json: allAvailable }),
    );
    let submitted: unknown;
    await page.route("**/api/v1/auth/oauth/apple/start", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        json: {
          error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" },
        },
      });
    });
    await page.goto("/connexion?returnTo=https%3A%2F%2Fevil.example%2Fsteal", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Continuer avec Apple" }).click();
    await expect(
      page
        .getByRole("group", { name: "Connexion ou inscription" })
        .getByRole("alert"),
    ).toContainText("temporairement indisponible");
    expect(submitted).toMatchObject({ returnTo: "/" });
  });

  test("@serial unavailable providers explain email sign-in on mobile forms", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route(providers, (route) =>
      route.fulfill({ json: unavailable }),
    );
    for (const path of [
      "/connexion",
      "/inscription/particulier",
      "/inscription/professionnel",
    ]) {
      await page.goto(`${path}${query}`, { waitUntil: "domcontentloaded" });
      await expectProviderButtons(page, false, true);
      await expect(
        page
          .getByRole("group", { name: "Connexion ou inscription" })
          .getByRole("status"),
      ).toContainText("connexion par email");
      const legalNotice = page.locator("[data-auth-legal-notice]");
      await expect(legalNotice).toContainText(
        "En continuant, vous acceptez nos",
      );
      await expect(legalNotice.getByRole("link")).toHaveCount(2);
      const email = page.locator('input[type="email"]');
      await email.fill("buyer@example.test");
      await expect(email).toHaveValue("buyer@example.test");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(390);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });

  test("email sign-in still creates a real session when social providers are unavailable", async ({
    page,
  }) => {
    const { accounts } = readBrowserFixtures();
    await page.route(providers, (route) =>
      route.fulfill({ json: unavailable }),
    );
    await page.goto(`/connexion${query}`, { waitUntil: "domcontentloaded" });
    await expectProviderButtons(page, false, true);
    await page.getByLabel("Adresse email").fill(accounts.user_thomas.email);
    await page
      .locator("#login-password")
      .fill(process.env.DEMO_ACCOUNT_PASSWORD!);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await expect(page).toHaveURL(/\/compte\/annonces$/);
    await expect(
      page.getByRole("button", { name: "Menu du compte de Thomas Laurent" }),
    ).toBeVisible();
  });

  test("availability loads safely, supports retry, and honors individual provider flags", async ({
    page,
  }) => {
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let recovered = false;
    await page.route(providers, async (route) => {
      await held;
      await route.fulfill(
        recovered
          ? { json: { ...unavailable, google: true } }
          : {
              status: 503,
              json: {
                error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" },
              },
            },
      );
    });
    await page.goto(`/connexion${query}`, { waitUntil: "domcontentloaded" });
    await expectProviderButtons(page, false, true);
    await expect(
      page.getByRole("status").filter({ hasText: "Vérification des modes" }),
    ).toBeVisible();
    release();
    await expect(
      page.getByRole("status").filter({ hasText: "Impossible de vérifier" }),
    ).toBeVisible();
    recovered = true;
    await page.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Continuer avec Google" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("button", { name: "Continuer avec Apple" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Continuer avec Facebook" }),
    ).toHaveCount(0);
    await expect(
      page
        .getByRole("group", { name: "Connexion ou inscription" })
        .getByRole("status"),
    ).toHaveCount(0);
  });

  test("provider startup locks competing submissions and recovers after failure", async ({
    page,
  }) => {
    await page.route(providers, (route) =>
      route.fulfill({ json: allAvailable }),
    );
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requests = 0;
    await page.route("**/api/v1/auth/oauth/google/start", async (route) => {
      requests += 1;
      await held;
      await route.fulfill({
        status: 503,
        json: {
          error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" },
        },
      });
    });
    await page.goto(`/connexion${query}`, { waitUntil: "domcontentloaded" });
    const google = page.getByRole("button", { name: "Continuer avec Google" });
    await expect(google).toBeEnabled();
    await google.focus();
    await page.keyboard.press("Enter");
    await expectProviderButtons(page, false);
    await expect(page.getByLabel("Adresse email")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Se connecter", exact: true }),
    ).toBeDisabled();
    release();
    await expect(
      page
        .getByRole("group", { name: "Connexion ou inscription" })
        .getByRole("alert"),
    ).toContainText("temporairement indisponible");
    await expectProviderButtons(page, true);
    await expect(page.getByLabel("Adresse email")).toBeEnabled();
    expect(requests).toBe(1);
  });

  test("registration preserves profile selection and the return path for both sign-up methods", async ({
    page,
  }) => {
    await page.route(providers, (route) =>
      route.fulfill({ json: allAvailable }),
    );
    let submitted: unknown;
    await page.route("**/api/v1/auth/oauth/facebook/start", async (route) => {
      submitted = route.request().postDataJSON();
      await route.fulfill({
        status: 503,
        json: {
          error: { code: "SERVICE_UNAVAILABLE", message: "Unavailable" },
        },
      });
    });
    await page.goto(`/connexion${query}`, { waitUntil: "domcontentloaded" });
    await page
      .getByRole("link", { name: "Créer un compte", exact: true })
      .click();
    await expect(page).toHaveURL(`/inscription${query}`);
    await expect(
      page.getByRole("group", { name: "Connexion ou inscription" }),
    ).toHaveCount(0);
    // Each profile card carries its own continue control.
    await page
      .getByRole("button", { name: "Choisir ce profil : Professionnel" })
      .click();
    await expect(page).toHaveURL(`/inscription/professionnel${query}`);
    await expectProviderButtons(page, true);
    await page.getByRole("button", { name: "Continuer avec Facebook" }).click();
    await expect(
      page
        .getByRole("group", { name: "Connexion ou inscription" })
        .getByRole("alert"),
    ).toBeVisible();
    expect(submitted).toMatchObject({ accountType: "professional", returnTo });
    await page.goto(`/inscription${query}`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: "Choisir ce profil : Particulier" })
      .click();
    await expect(page).toHaveURL(`/inscription/particulier${query}`);
    await page.getByRole("button", { name: "Continuer avec Facebook" }).click();
    await expect(
      page
        .getByRole("group", { name: "Connexion ou inscription" })
        .getByRole("alert"),
    ).toBeVisible();
    expect(submitted).toMatchObject({ accountType: "individual", returnTo });
  });

  test("cancellation is neutral and account security fits a mobile viewport", async ({
    page,
  }) => {
    await page.goto(
      "/auth/callback?provider=facebook&status=cancelled&returnTo=%2Fcompte",
    );
    await expect(page.getByText(/connexion a été annulée/i)).toBeVisible();
    await usePersona(page, "individual_buyer");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/compte/securite-compte", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByRole("heading", { level: 1, name: "Connexion & sécurité" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Méthodes de connexion" }),
    ).toBeVisible();
    await expect(page.getByText("Google", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
  });
});
