import { expect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

const returnTo = "/compte/messages?tab=unread#latest";
const query = `?redirect=${encodeURIComponent(returnTo)}`;

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

for (const width of [1408, 390, 320]) {
  test(`@serial authentication screens share a responsive frame at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 950 });
    await page.route("**/api/v1/auth/oauth/providers", (route) =>
      route.fulfill({
        json: { google: false, apple: false, facebook: false, linking: false },
      }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of [
      "/connexion",
      "/inscription",
      "/inscription/particulier",
      "/inscription/professionnel",
      "/mot-de-passe-oublie",
      "/verification-email",
      "/auth/callback?status=cancelled",
    ]) {
      await page.goto(path);
      await expect(page.locator("[data-auth-layout] h1")).toBeVisible();
      const card = page.locator("[data-auth-card]");
      await expect(card).toBeVisible();
      if (path === "/connexion" || path.startsWith("/inscription")) {
        const legalNotice = card.locator("[data-auth-legal-notice]");
        await expect(legalNotice).toHaveCount(1);
        await expect(legalNotice).toContainText(
          "En continuant, vous acceptez nos",
        );
        await expect(
          legalNotice.getByRole("link", {
            name: "Conditions d’utilisation",
            exact: true,
          }),
        ).toHaveAttribute("href", "/conditions-utilisation");
        await expect(
          legalNotice.getByRole("link", {
            name: "Politique de confidentialité",
            exact: true,
          }),
        ).toHaveAttribute("href", "/confidentialite");
        expect(
          await legalNotice.evaluate(
            (element) => element === element.parentElement?.lastElementChild,
          ),
        ).toBe(true);
        const socialGroup = card.getByRole("group", {
          name: "Connexion ou inscription",
        });
        if (path === "/inscription") {
          await expect(socialGroup).toHaveCount(0);
          await expect(
            card.getByText("ou avec votre adresse email", { exact: true }),
          ).toHaveCount(0);
          await expect(
            card.getByRole("button", {
              name: "Choisir ce profil : Professionnel",
              exact: true,
            }),
          ).toBeEnabled();
          await expect(
            card.getByRole("button", {
              name: "Choisir ce profil : Particulier",
              exact: true,
            }),
          ).toBeEnabled();
          await expect(
            card.getByText("Recommandé", { exact: true }),
          ).toBeVisible();
          const optionBounds = await card
            .locator("[data-account-type]")
            .evaluateAll((options) =>
              options.map((option) => {
                const bounds = option.getBoundingClientRect();
                return {
                  top: bounds.top,
                  bottom: bounds.bottom,
                  left: bounds.left,
                  right: bounds.right,
                  width: bounds.width,
                };
              }),
            );
          expect(optionBounds).toHaveLength(2);
          expect(optionBounds[0]!.width).toBeCloseTo(optionBounds[1]!.width, 0);
          if (width >= 768) {
            expect(optionBounds[0]!.width).toBeCloseTo(280, 0);
            expect(optionBounds[0]!.top).toBeCloseTo(optionBounds[1]!.top, 0);
            expect(optionBounds[0]!.bottom).toBeCloseTo(
              optionBounds[1]!.bottom,
              0,
            );
            expect(optionBounds[1]!.left).toBeGreaterThan(
              optionBounds[0]!.right,
            );
          } else {
            expect(optionBounds[1]!.top).toBeGreaterThan(
              optionBounds[0]!.bottom,
            );
          }
        } else {
          await expect(
            socialGroup.locator("[data-auth-legal-notice]"),
          ).toHaveCount(0);
          await expect(socialGroup.getByRole("status")).toHaveCount(0);
          for (const provider of ["Google", "Apple", "Facebook"]) {
            const providerButton = socialGroup.getByRole("button", {
              name: `Continuer avec ${provider}`,
            });
            await expect(providerButton).toBeDisabled();
            expect(
              await providerButton.evaluate(
                (element) => getComputedStyle(element).flexDirection,
              ),
            ).toBe("row");
          }
          const providerTops = await socialGroup
            .getByRole("button")
            .evaluateAll((buttons) =>
              buttons.map((button) => button.getBoundingClientRect().top),
            );
          expect(Math.max(...providerTops) - Math.min(...providerTops)).toBe(0);
        }
      }
      const availableWidth = await page.evaluate(
        () => document.documentElement.clientWidth,
      );
      const bounds = (await card.boundingBox())!;
      const expectedWidth = Math.min(
        availableWidth - 32,
        path === "/inscription" ? 1024 : 448,
      );
      expect(bounds.width).toBeCloseTo(expectedWidth, 0);
      expect(
        Math.abs(bounds.x + bounds.width / 2 - availableWidth / 2),
      ).toBeLessThan(1);
      await expectNoHorizontalOverflow(page, `${path} ${width}`);
      await expect(
        page.locator('header a[aria-label="SHONGRE., accueil"]'),
      ).toHaveCount(1);
      if (path === "/connexion" || path === "/inscription") {
        await page.screenshot({
          path: testInfo.outputPath(`${path.slice(1)}-${width}.png`),
          fullPage: true,
        });
      }
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [1408, 390, 320]) {
  test(`keyboard account selection and professional steps preserve the journey at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`/inscription${query}`);
    const individual = page.getByRole("radio", {
      name: "Particulier",
      exact: true,
    });
    const professional = page.getByRole("radio", {
      name: "Professionnel",
      exact: true,
    });
    await expect(professional).toBeChecked();
    await professional.focus();
    await page.keyboard.press("ArrowDown");
    await expect(individual).toBeChecked();
    await page.keyboard.press("ArrowUp");
    await expect(professional).toBeChecked();
    await expect(
      page.getByRole("button", {
        name: "Choisir ce profil : Professionnel",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: "Choisir ce profil : Professionnel",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(`/inscription/professionnel${query}`);
    await page.locator("#reg-pro-name").fill("Test Contact");
    await page.locator("#reg-email-professionnel").fill("contact@example.test");
    await page
      .locator('input[autocomplete="new-password"]')
      .fill("Example-password-42!");
    await page.getByRole("button", { name: "Continuer", exact: true }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText(
      "Votre entreprise",
    );
    await expect(page.locator("[data-auth-layout] h1")).toBeFocused();
    await expect(
      page.locator("[data-auth-card] > [data-auth-legal-notice]:last-child"),
    ).toBeVisible();
    await expectNoHorizontalOverflow(
      page,
      `professional company form ${width}`,
    );
    const submit = page.getByRole("button", {
      name: /Valider mon inscription Pro|Créer mon compte Pro/,
    });
    const cardBounds = (await page.locator("[data-auth-card]").boundingBox())!;
    const submitBounds = (await submit.boundingBox())!;
    expect(submitBounds.x + submitBounds.width).toBeLessThanOrEqual(
      cardBounds.x + cardBounds.width,
    );
    await page
      .locator("[data-auth-card]")
      .getByRole("button", { name: /Retour/ })
      .click();
    await expect(page.locator("#reg-pro-name")).toHaveValue("Test Contact");
    await expect(page.locator("#reg-email-professionnel")).toHaveValue(
      "contact@example.test",
    );
    await page.getByRole("link", { name: "Se connecter", exact: true }).click();
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(returnTo);
  });
}

test("recovery retains the destination and announces a neutral confirmation", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/password/forgot", (route) =>
    route.fulfill({ json: { accepted: true } }),
  );
  await page.goto(`/connexion${query}`);
  await page.getByRole("link", { name: "Mot de passe oublié ?" }).click();
  expect(new URL(page.url()).searchParams.get("redirect")).toBe(returnTo);
  await page
    .getByLabel("Adresse email de votre compte")
    .fill("recovery@example.test");
  await page
    .getByRole("button", { name: "Envoyer le lien de réinitialisation" })
    .click();
  await expect(
    page.locator("[data-auth-card]").getByRole("status"),
  ).toContainText("Si ce compte existe");
  await page.getByRole("link", { name: "Se connecter", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("redirect")).toBe(returnTo);
});

test("password reset hides the link token and validates matching passwords", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/auth/password/reset", (route) => {
    requests += 1;
    return route.fulfill({ status: 204 });
  });
  await page.goto(`/mot-de-passe-oublie${query}&token=browser-test-link`);
  // WebKit can expose the server-rendered field before hydration replaces it.
  await waitForStableLayout(page);
  const password = page
    .getByLabel("Nouveau mot de passe", { exact: false })
    .first();
  const confirmation = page.getByLabel("Confirmer le nouveau mot de passe");
  await expect(page.getByRole("textbox", { name: /token|jeton/i })).toHaveCount(
    0,
  );
  await password.fill("Aa1!");
  await expect(page.getByText("Faible", { exact: true })).toBeVisible();
  await password.fill("Example-password-42!");
  await confirmation.fill("Different-password-42!");
  await page
    .getByRole("button", { name: "Mettre à jour mon mot de passe" })
    .click();
  await expect(
    page.locator("[data-auth-card]").getByRole("alert"),
  ).toContainText("ne correspondent pas");
  expect(requests).toBe(0);
  const toggle = page
    .getByRole("button", { name: "Afficher le mot de passe" })
    .first();
  await toggle.click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(
    page.getByRole("button", { name: "Masquer le mot de passe" }),
  ).toHaveAttribute("aria-pressed", "true");
  await confirmation.fill("Example-password-42!");
  await page
    .getByRole("button", { name: "Mettre à jour mon mot de passe" })
    .click();
  await expect(page).toHaveURL(`/connexion${query}`);
  expect(requests).toBe(1);
});

test("an invalid email confirmation link announces a recoverable error", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/auth/verify-email", (route) => {
    requests += 1;
    return route.fulfill({ json: { verified: false } });
  });
  await page.goto(`/verification-email${query}&token=expired-browser-test`);
  await expect(
    page.locator("[data-auth-card]").getByRole("alert"),
  ).toContainText("invalide ou a expiré");
  expect(requests).toBe(1);
  await expect(
    page.getByLabel(/Code de confirmation|Jeton de validation ou code/i),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Se connecter", exact: true }).click();
  expect(new URL(page.url()).searchParams.get("redirect")).toBe(returnTo);
});
