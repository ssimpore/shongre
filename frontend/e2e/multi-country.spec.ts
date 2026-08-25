import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE_URL } from "../playwright.config";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const local = new URL(BASE_URL);
const globalGatewayUrl = `${local.protocol}//global.localhost:${local.port}/`;

test.describe("multi-country public routing", () => {
  test("keeps the local root as France and scopes Belgium and Switzerland", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Shongre\. France/ })).toBeVisible();

    await page.goto("/be", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Shongre\. Belgique/ })).toBeVisible();
    await expect(
      page.locator('button[aria-label="Localisation : Toute la Belgique"]'),
    ).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://shongre.com/be/",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-BE");

    await page.goto("/ch", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: /Shongre\. Suisse/ })).toBeVisible();
    await expect(
      page.locator('button[aria-label="Localisation : Toute la Suisse"]'),
    ).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://shongre.com/ch/",
    );
    await expect(page.locator("html")).toHaveAttribute("lang", "fr-CH");
  });

  test("renders the global gateway without marketplace chrome", async ({ page }) => {
    await page.goto(globalGatewayUrl, { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", {
        name: "Shongre, le marché local à l’échelle du monde",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Belgique" })).toHaveAttribute(
      "href",
      "https://shongre.com/be/",
    );
    await expect(page.getByText("Burkina Faso", { exact: true })).toBeVisible();
    await expect(page.getByRole("search")).toHaveCount(0);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ["critical", "serious"].includes(violation.impact || ""),
      ),
    ).toEqual([]);
  });

  test("keeps unlaunched markets fail closed and responsive", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    for (const [path, heading] of [
      ["/sn", "Shongre arrive bientôt au Sénégal"],
      ["/bf", "Shongre arrive bientôt au Burkina Faso"],
    ] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Être informé du lancement" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Me prévenir" })).toBeVisible();
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    }
  });

  test("permanently canonicalizes aliases while preserving queries", async ({
    request,
  }) => {
    const france = await request.get(
      "/fr/recherche?query=velo&page=2",
      { headers: { Host: "shongre.com" }, maxRedirects: 0 },
    );
    expect(france.status()).toBe(308);
    expect(france.headers().location).toBe(
      "https://shongre.fr/recherche?query=velo&page=2",
    );

    const www = await request.get("/be/annonce/123?src=test", {
      headers: { Host: "www.shongre.com" },
      maxRedirects: 0,
    });
    expect(www.status()).toBe(308);
    expect(www.headers().location).toBe(
      "https://shongre.com/be/annonce/123?src=test",
    );
  });
});
