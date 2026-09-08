import { expect, test } from "@playwright/test";
import { browserApi } from "./browser-api";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("API-owned country recommendation", () => {
  test("retired local identities cannot invent a detected country or bypass consent", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 320, height: 812 });
    await page.addInitScript(() => {
      localStorage.setItem(
        "shongre_current_user_key_v1",
        JSON.stringify("market_mgr_be"),
      );
      localStorage.setItem(
        "shongre_current_role_v1",
        JSON.stringify("market_manager"),
      );
    });
    await page.goto("/");
    const detection = await browserApi(page, "/markets/detection");
    expect(detection.status).toBe(200);
    expect(detection.body.country).toBeNull();
    expect((await browserApi(page, "/auth/me")).body.id).toBeUndefined();
    await expect(
      page.getByRole("heading", { name: /Vous semblez être en Belgique/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Vos préférences de confidentialité" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("explicit geolocation reaches the API and requires confirmation before changing market", async ({
    page,
    context,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({
      latitude: 50.8503,
      longitude: 4.3517,
      accuracy: 25,
    });
    await page.goto("/");
    await page
      .getByRole("combobox", { name: /rechercher une annonce/i })
      .first()
      .focus();
    await page
      .getByRole("button", { name: /^Localisation :/ })
      .first()
      .click();
    const response = page.waitForResponse((entry) =>
      entry.url().includes("/markets/detection/coordinates"),
    );
    await page
      .getByRole("button", { name: "Utiliser ma position actuelle" })
      .click();
    expect((await response).status()).toBe(200);
    await expect(page.locator("#location-geolocation-status")).toContainText(
      "Votre position ne se trouve pas dans le marché",
    );
    await page.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: /Vous semblez être en Belgique/ }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Continuer vers Belgique" }).click();
    await expect(page).toHaveURL(/\/be(?:\?|$)/);
  });

  test("keeps the regional selector usable when no country is known", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page
      .getByRole("button", { name: /préférences régionales : Français/i })
      .first()
      .click();
    const selector = page.getByRole("dialog", {
      name: "Préférences régionales",
    });
    await expect(selector).toBeVisible();
    await expect(
      selector.getByRole("radio", { name: /Sénégal/ }),
    ).toBeVisible();
    await expect(
      selector.getByRole("radio", { name: /Burkina Faso/ }),
    ).toBeVisible();
  });
});
