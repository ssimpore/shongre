import { test, expect } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { SHONGRE_PERFORMANCE_BUDGETS } from "@shongre/contracts/performance";

/**
 * Size ceilings for the server-rendered document.
 *
 * `scripts/check-client-bundle-budget.mjs` parses the client reference
 * manifest and gzips `.js` chunks, so it can only see executable payload. That
 * blind spot is not hypothetical: the generated taxonomy left the JS bundle and
 * reappeared inlined in the RSC payload, at 79% of a 1.14 MB `/recherche`
 * document, while the bundle budget reported "within bounds" throughout.
 *
 * This runs against the served document instead, so payload is measured where
 * the browser actually receives it regardless of which pipe it arrives through.
 */
const BUDGETS = SHONGRE_PERFORMANCE_BUDGETS.serverDocument;

const ROUTES = [
  { key: "home", path: "/" },
  { key: "search", path: "/recherche" },
  { key: "category", path: "/categorie/vehicules" },
  { key: "employment", path: "/emploi" },
  { key: "login", path: "/connexion" },
] as const;

const kib = (bytes: number) => `${(bytes / 1024).toFixed(1)} KiB`;

test.describe("server document budget", () => {
  for (const { key, path } of ROUTES) {
    test(`${path} stays within its document budget`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(200);

      const body = await response.body();
      const raw = body.byteLength;
      const gzip = gzipSync(body).byteLength;

      const rawBudget = BUDGETS.routeRawBytes[key];
      const gzipBudget = BUDGETS.routeGzipBytes[key];

      expect(
        gzip,
        `${path} server document is ${kib(gzip)} gzip, over the ${kib(gzipBudget)} budget. ` +
          `If this is deliberate, raise the budget in operational-performance.ts with a reason.`,
      ).toBeLessThanOrEqual(gzipBudget);

      expect(
        raw,
        `${path} server document is ${kib(raw)} raw, over the ${kib(rawBudget)} budget.`,
      ).toBeLessThanOrEqual(rawBudget);
    });
  }

  /*
   * The specific regression the budgets above exist to catch. A single resolved
   * category node is expected on `/categorie/:slug`; the whole snapshot is not.
   */
  test("the search document does not inline the full taxonomy", async ({
    request,
  }) => {
    const body = await (await request.get("/recherche")).text();
    const taxonomyEntries = (body.match(/"taxonomyVersion"/g) ?? []).length;
    expect(
      taxonomyEntries,
      "more than one taxonomy snapshot is inlined in /recherche",
    ).toBeLessThanOrEqual(1);
  });
});
