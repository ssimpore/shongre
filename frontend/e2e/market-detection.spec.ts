import { expect, test } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";

const useBelgianDetectionPersona = async (
  page: Parameters<typeof usePersona>[0],
) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_current_user_key_v1",
      JSON.stringify("market_mgr_be"),
    );
    window.localStorage.setItem(
      "shongre_current_role_v1",
      JSON.stringify("market_manager"),
    );
  });
};

test.describe("probable-country recommendation", () => {
  test("does not navigate or override consent before explicit confirmation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    const runtimeErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") runtimeErrors.push(message.text());
    });
    await useBelgianDetectionPersona(page);
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Vous semblez être en Belgique. Accéder à Shongre Belgique ?",
      }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("region", { name: "Vos préférences de confidentialité" }),
    ).toBeVisible();
    expect(runtimeErrors.filter((error) => /hydration/i.test(error))).toEqual(
      [],
    );
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

    await page.getByRole("button", { name: "Continuer vers Belgique" }).click();
    await expect(page).toHaveURL(/\/be(?:\?|$)/);
  });

  test("persists a declined suggestion for only the current subject and market", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await useBelgianDetectionPersona(page);
    await page.goto("/");

    const suggestion = page.getByRole("heading", {
      name: "Vous semblez être en Belgique. Accéder à Shongre Belgique ?",
    });
    await expect(suggestion).toBeVisible();
    await page.getByRole("button", { name: "Ignorer" }).click();
    await expect(suggestion).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem(
            "shongre_market_selection_preferences_v2",
          ),
        ),
      )
      .toContain('"account:user_market_mgr_be:FR":"BE"');

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(suggestion).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  });

  test("keeps public browsing and the selector usable when no country is known", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Nous n’avons pas pu estimer votre pays",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await page.getByRole("button", { name: "Choisir mon pays" }).click();
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
