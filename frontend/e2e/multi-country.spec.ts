import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE_URL } from "../playwright.config";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";
import {
  COUNTRY_REGISTRY,
  getDefaultCountryConfig,
  listGatewayCountries,
  publicMarketExperience,
} from "@shongre/contracts";

const local = new URL(BASE_URL);
const globalGatewayUrl = `${local.protocol}//global.localhost:${local.port}/`;
const localCanonical = (path: string) => new URL(path, `${local.origin}/`).href;

test.describe("multi-country public routing", () => {
  test("resolves every active registered market from registry configuration", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");

    for (const country of COUNTRY_REGISTRY.filter(
      (entry) => publicMarketExperience(entry) === "active",
    )) {
      const path = country.isDefault ? "/" : country.basePath;
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("link", {
          name: new RegExp(`Shongre\\. ${country.name}`),
        }),
      ).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        localCanonical(path),
      );
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        country.defaultLocale,
      );
    }
  });

  test("renders the global gateway without marketplace chrome", async ({
    page,
  }) => {
    await page.goto(globalGatewayUrl, { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", {
        name: "Shongre, le marché local à l’échelle du monde",
      }),
    ).toBeVisible();
    for (const country of listGatewayCountries()) {
      const path = country.isDefault ? "/" : country.basePath;
      await expect(
        page.getByRole("link", { name: new RegExp(country.name) }).last(),
      ).toHaveAttribute("href", localCanonical(path));
    }
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

  test("keeps unlaunched markets fail closed and responsive", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 812 });
    for (const country of COUNTRY_REGISTRY.filter(
      (entry) => publicMarketExperience(entry) !== "active",
    )) {
      await page.goto(country.basePath, { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: country.launchContent.title }),
      ).toBeVisible();
      if (country.launchContent.earlyAccessEnabled) {
        await expect(
          page.getByRole("heading", { name: "Être informé du lancement" }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Me prévenir" }),
        ).toBeVisible();
      }
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    }
  });

  test("keeps a manual market choice until the user resets it", async ({
    page,
  }) => {
    const defaultCountry = getDefaultCountryConfig();
    const alternative = listGatewayCountries().find(
      (country) =>
        country.code !== defaultCountry.code &&
        publicMarketExperience(country) === "active",
    )!;
    await useEstablishedConsent(page);
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await page
      .getByRole("button", { name: /Langue : Français/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Préférences" }).click();
    const preferences = page.getByRole("dialog", {
      name: "Préférences régionales",
    });
    await preferences
      .getByRole("radio", { name: new RegExp(alternative.name) })
      .click();
    await expect(page).toHaveURL(new RegExp(`${alternative.basePath}(?:\\?|$)`));

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${alternative.basePath}(?:\\?|$)`));

    await page
      .getByRole("button", { name: /Langue : Français/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Préférences" }).click();
    await page
      .getByRole("button", { name: "Réactiver la suggestion automatique" })
      .click();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/$/);
  });

  test("refreshes market-scoped search data and price formatting", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");

    await page.goto("/be/recherche?query=v%C3%A9lo", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Vélo urbain électrique Cowboy Classic"),
    ).toBeVisible();
    await expect(
      page.getByText(/1[\s.\u202f]?450,00[\s\u00a0\u202f]*€/),
    ).toBeVisible();

    await page.goto("/recherche?query=Cowboy", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      page.getByText("Vélo urbain électrique Cowboy Classic"),
    ).toHaveCount(0);
  });

  test("canonicalizes path aliases and rejects unconfigured hosts", async ({
    request,
  }) => {
    const defaultCountry = getDefaultCountryConfig();
    const france = await request.get(
      `/${defaultCountry.slug}/recherche?query=velo&page=2&token=secret&utm_source=test`, {
      maxRedirects: 0,
      },
    );
    expect(france.status()).toBe(308);
    expect(new URL(france.headers().location!, BASE_URL).href).toBe(
      localCanonical("/recherche?query=velo&page=2"),
    );

    const mismatchedCountry = COUNTRY_REGISTRY.find(
      (country) => !country.isDefault,
    )!;
    const mismatchedHost = await request.get(mismatchedCountry.basePath, {
      headers: { Host: "shongre.fr" },
      maxRedirects: 0,
    });
    expect(mismatchedHost.status()).toBe(400);

    const unknownHost = await request.get("/be/annonce/123?src=test", {
      headers: { Host: "unconfigured.invalid" },
      maxRedirects: 0,
    });
    expect(unknownHost.status()).toBe(400);
    expect(unknownHost.headers().location).toBeUndefined();
  });
});
