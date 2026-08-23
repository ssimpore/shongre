import { expect, test, type BrowserContext } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { usePersona } from "./personas";

const PARIS = { latitude: 48.8566, longitude: 2.3522 };

const allowParisGeolocation = async (context: BrowserContext) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation(PARIS);
};

test.describe("current location picker", () => {
  test("detects the current city and applies it to search", async ({
    context,
    page,
  }) => {
    await allowParisGeolocation(context);
    await page.setViewportSize({ width: 1408, height: 900 });
    await usePersona(page, "individual_buyer");
    await page.goto("/");

    await page.locator("#header-desktop-header-location-button").click();
    const dialog = page.getByRole("dialog", { name: "Zone géographique" });
    await expect(dialog).toBeVisible();

    const accessibility = await new AxeBuilder({ page })
      .include('[role="dialog"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact || ""),
      ),
    ).toEqual([]);

    await dialog
      .getByRole("button", { name: "Utiliser ma position actuelle" })
      .click();
    await expect(dialog.getByRole("status")).toHaveText(
      "Position détectée près de Paris.",
    );
    await expect(dialog.locator("#location-city-input")).toHaveValue("Paris");

    await dialog.getByRole("button", { name: "Appliquer la zone" }).click();
    await expect(
      page.locator("#header-desktop-header-location-button"),
    ).toHaveAttribute("aria-label", "Localisation : Paris");

    const storedLocation = await page.evaluate(() => {
      const entry = Object.entries(localStorage).find(([, value]) =>
        value.includes('"city":"Paris"'),
      );
      return entry?.[1] || "";
    });
    expect(storedLocation).toContain('"city":"Paris"');
    expect(storedLocation).not.toContain("latitude");
    expect(storedLocation).not.toContain("longitude");
  });

  test("remains usable in the mobile location flow", async ({
    context,
    page,
  }) => {
    await allowParisGeolocation(context);
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "guest");
    await page.goto("/");

    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.locator("#header-mobile-minimal-location-button").click();

    const dialog = page.getByRole("dialog", { name: "Zone géographique" });
    await dialog
      .getByRole("button", { name: "Utiliser ma position actuelle" })
      .click();
    await expect(dialog.locator("#location-city-input")).toHaveValue("Paris");

    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });
});
