import { expect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";

/**
 * Every market's public pages, actually rendered.
 *
 * Shongre ships five markets and the browser suite only ever opened one. BE,
 * CH, SN and BF were reasoned about — through market-scoped API assertions and
 * a shared route table — but nobody had watched their pages come up. That is
 * the same shape of gap as the one that let every public seller profile return
 * 500 behind a green suite: the thing was covered in principle and never run.
 *
 * This is deliberately shallow. It asserts what a market sweep can honestly
 * assert without a per-market fixture: the page renders, it is not an error
 * page, the document is in the market's language, and nothing throws. Depth
 * belongs in the per-vertical specs, which run against FR.
 */

/*
 * `marketplaceOpen` matters: SN and BF ship the brand and the market pages with
 * the marketplace switched off, so "the page rendered" is a much weaker claim
 * there. A sweep that cannot tell an open market from a closed one would pass
 * just as happily if BE quietly stopped serving listings.
 */
const MARKETS = [
  { code: "BE", basePath: "/be", marketplaceOpen: true },
  { code: "CH", basePath: "/ch", marketplaceOpen: true },
  { code: "SN", basePath: "/sn", marketplaceOpen: false },
  { code: "BF", basePath: "/bf", marketplaceOpen: false },
] as const;

/** The public surfaces every market has, whatever its verticals are. */
const ROUTES = ["", "/recherche", "/categories", "/aide"] as const;

function internationalOrigin(baseURL: string): string {
  // The market prefixes live on the international origin; the FR origin serves
  // France at the root and knows nothing about `/be`.
  return baseURL.replace("//fr.", "//intl.");
}

for (const market of MARKETS) {
  test(`${market.code}: public pages render`, async ({ page, baseURL }) => {
    const origin = internationalOrigin(baseURL ?? "");
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(String(error)));

    await page.goto(origin);
    await useEstablishedConsent(page);

    for (const route of ROUTES) {
      const url = `${origin}${market.basePath}${route}`;
      const response = await page.goto(url, { waitUntil: "domcontentloaded" });

      expect(response?.status(), `${url} status`).toBeLessThan(400);
      // Next's error pages render 200 with a known shell, so the status alone
      // is not proof the route resolved.
      await expect(page.locator("h1").first(), `${url} heading`).toBeVisible({
        timeout: 15_000,
      });
      expect(
        await page.title(),
        `${url} title`,
      ).not.toMatch(/404|500|not found|error/i);
    }

    /*
     * An open market has to actually serve discovery, not just a shell. This is
     * the assertion that would have caught the class of defect that let every
     * public seller page return 500 behind a green suite.
     */
    await page.goto(`${origin}${market.basePath}/recherche`, {
      waitUntil: "load",
    });
    const cards = page.locator('[data-listing-card="true"]');
    if (market.marketplaceOpen) {
      await expect(cards.first(), `${market.code} results`).toBeVisible({
        timeout: 20_000,
      });
    } else {
      // A closed market is a deliberate state, not an error: the page resolves
      // and simply has no marketplace behind it.
      await expect(cards, `${market.code} closed market`).toHaveCount(0);
    }

    expect(failures, `${market.code} page errors`).toEqual([]);
  });
}
