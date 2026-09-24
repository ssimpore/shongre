import { createRequire } from "node:module";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { BASE_URL } from "../playwright.config";
import { waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  getDefaultCountryConfig,
  listGatewayCountries,
  publicMarketExperience,
  type CountryConfig,
  type MarketInfrastructureConfig,
} from "@shongre/contracts";

/*
 * The runner serves France and the international markets from two hosts
 * (`PUBLIC_FR_URL` and `PUBLIC_INTL_URL`), exactly as production does with
 * shongre.fr and shongre.com. Every expected URL is therefore built through the
 * canonical builder from that configuration, never by appending a country
 * prefix to the France host — that alias is precisely what the market resolver
 * redirects away from.
 */
const local = new URL(BASE_URL);
const international = new URL(process.env.PUBLIC_INTL_URL!);
const infrastructure: MarketInfrastructureConfig = {
  franceDomain: local.host,
  globalDomain: international.host,
  canonicalProtocol: local.protocol === "https:" ? "https" : "http",
};
const globalGatewayUrl = `${international.protocol}//${international.host}/`;
const marketUrl = (country: CountryConfig, route = "/") =>
  buildPublicUrl({ country: country.code, route, infrastructure });
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
      await page.goto(marketUrl(country), { waitUntil: "domcontentloaded" });
      const brandLink = page.getByRole("link", {
        name: new RegExp(`SHONGRE\\. ${country.name}`),
      });
      await expect(brandLink).toBeVisible();
      // The brand marks are host-level files: on the international origin
      // they used to answer 404 and every market page painted a broken logo.
      await expect
        .poll(() =>
          brandLink.locator("img").evaluateAll((images) =>
            images.map((image) => {
              const element = image as HTMLImageElement;
              return element.complete && element.naturalWidth > 0;
            }),
          ),
        )
        .not.toContain(false);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        marketUrl(country),
      );
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        country.defaultLocale,
      );
    }
  });

  test("serves host-level assets on every marketplace origin", async ({
    request,
  }) => {
    const mapVersion: string = createRequire(import.meta.url)(
      "maplibre-gl/package.json",
    ).version;
    const assets: [string, RegExp][] = [
      ["/brand/shongre/logo/header-primary-480.png?brand=1.0.0", /^image\/png/],
      ["/apple-touch-icon.png", /^image\/png/],
      ["/favicon-32x32.png", /^image\/png/],
      ["/manifest.webmanifest", /manifest\+json/],
      ["/sw.js", /javascript/],
      [
        `/vendor/maplibre-gl/${mapVersion}/maplibre-gl-worker.mjs`,
        /javascript/,
      ],
      ["/robots.txt", /^text\/plain/],
    ];
    for (const origin of [local.origin, international.origin]) {
      for (const [path, contentType] of assets) {
        const response = await request.get(`${origin}${path}`, {
          maxRedirects: 0,
        });
        expect(response.status(), `${origin}${path}`).toBe(200);
        expect(
          response.headers()["content-type"] || "",
          `${origin}${path}`,
        ).toMatch(contentType);
      }
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
      await expect(
        page.getByRole("link", { name: new RegExp(country.name) }).last(),
      ).toHaveAttribute("href", marketUrl(country));
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
      await page.goto(marketUrl(country), { waitUntil: "domcontentloaded" });
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

  test("keeps a manual choice authoritative without silently changing a direct request", async ({
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
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: /préférences régionales : Français/i })
      .first()
      .click();
    const preferences = page.getByRole("dialog", {
      name: "Préférences régionales",
    });
    await preferences.getByRole("button", { name: "Marché / Pays" }).click();
    await page
      .getByRole("listbox", { name: "Marché / Pays" })
      .getByRole("option", { name: new RegExp(alternative.name) })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`${alternative.basePath}(?:\\?|$)`),
    );

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: /Vous semblez être en/i }),
    ).toHaveCount(0);

    await page
      .getByRole("button", { name: /préférences régionales : Français/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Réactiver la suggestion automatique" })
      .click();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test("refreshes market-scoped search data and price formatting", async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await usePersona(page, "guest");

    await page.goto(
      `${marketUrl(
        COUNTRY_REGISTRY.find((entry) => entry.code === "BE")!,
        "/recherche",
      )}?query=v%C3%A9lo`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByText("Vélo urbain électrique Cowboy Classic"),
    ).toBeVisible();
    // Cards use the compact money format: a whole amount carries no ",00".
    await expect(
      page.getByText(/1[\s.\u202f]?450(?:,00)?[\s\u00a0\u202f]*€/).first(),
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
      `/${defaultCountry.slug}/recherche?query=velo&page=2&token=secret&utm_source=test`,
      {
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
