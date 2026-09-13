import { expect, test } from "@playwright/test";

/**
 * The one browser suite that runs against the PostgreSQL repositories.
 *
 * Every other spec runs through `scripts/e2e.sh`, which sets
 * `BACKEND_DATA_MODE=demo` and boots the in-memory fixture API. That is fast and
 * isolated, but it means the repository family production actually uses is
 * never exercised by a browser — and the two families do diverge. They diverged
 * badly enough that `/profil/:slug`, `/boutique/:slug`, `/vendeur/:slug` and
 * `/u/:slug` returned HTTP 500 for every seller while route coverage reported
 * all 172 screens covered: `DemoUserRepository` resolved a slug through a `Map`
 * miss, and `PostgresUserRepository` compared it against a `uuid` column, which
 * PostgreSQL rejects outright.
 *
 * This suite is deliberately small. It asserts the status codes of the public
 * route families against a database-mode stack, because that is the class of
 * defect the demo-mode suite structurally cannot see.
 *
 * Run with `make test-web-database-mode` against a running `make dev` stack.
 */

const SELLER_ROUTE_FAMILIES = [
  "/profil/camille-martin",
  "/boutique/atelier-nordique",
  "/boutique/agence-canopee",
  "/vendeur/camille-martin",
  "/u/camille-martin",
] as const;

const PUBLIC_ROUTES = [
  "/",
  "/recherche",
  "/categories",
  "/categorie/vehicules",
  "/collections",
  "/professionnels",
  "/emploi",
  "/immo",
  "/auto",
  "/education",
  "/aide",
] as const;

test.describe("database-mode public routes", () => {
  test.describe.configure({ mode: "serial" });

  test("resolves every seller route family by slug", async ({ request }) => {
    for (const route of SELLER_ROUTE_FAMILIES) {
      const response = await request.get(route, { maxRedirects: 0 });
      // Aliases redirect to the canonical profile; both are healthy answers.
      expect(
        [200, 301, 308].includes(response.status()),
        `${route} answered ${response.status()}`,
      ).toBe(true);
    }
  });

  test("renders a seller profile with its real name and listings", async ({
    page,
  }) => {
    const response = await page.goto("/profil/camille-martin", {
      waitUntil: "load",
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toBeVisible();
    // A 500 rendered by the error boundary would still have a body; a real
    // profile carries the seller's own name.
    await expect(page.locator("body")).toContainText(/Camille/i);
  });

  test("answers a real 404 for a seller that does not exist", async ({
    request,
  }) => {
    const response = await request.get("/profil/aucun-vendeur-connu", {
      maxRedirects: 0,
    });
    // Not 500: an absent seller is a miss, not a repository failure.
    expect(response.status()).toBe(404);
  });

  test("opens the Canopée storefront alias and its profile tabs", async ({
    page,
  }) => {
    const reviewsLoaded = page.waitForResponse(
      (apiResponse) =>
        apiResponse.status() === 200 &&
        apiResponse.url().includes("/api/v1/reviews/user/"),
    );
    const response = await page.goto("/boutique/agence-canopee", {
      waitUntil: "load",
    });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/boutique\/clara-dupont-agence-canopee$/);
    await expect(
      page.getByRole("heading", { name: "Clara Dupont", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Profil introuvable", { exact: true }),
    ).toHaveCount(0);
    await reviewsLoaded;
    const reviews = page.getByRole("tab", { name: /Avis vérifiés/ });
    await reviews.click();
    await expect(reviews).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/tab=reviews/);
    const listings = page.getByRole("tab", { name: /Annonces en ligne/ });
    await listings.click();
    await expect(listings).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toBeVisible();
  });

  test("serves the public discovery routes", async ({ request }) => {
    for (const route of PUBLIC_ROUTES) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(
        [200, 301, 308].includes(response.status()),
        `${route} answered ${response.status()}`,
      ).toBe(true);
    }
  });

  test("lists professionals from the database without an unbounded read", async ({
    request,
  }) => {
    const response = await request.get("/professionnels");
    expect(response.status()).toBe(200);
  });

  test("renders help articles returned by the database-backed API", async ({
    page,
  }) => {
    const helpArticleCalls: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/v1/support/help-articles")) {
        helpArticleCalls.push(`${response.status()} ${response.url()}`);
      }
    });

    const response = await page.goto("/aide", { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("button", {
        name: "Comment fonctionne le paiement en ligne ?",
      }),
    ).toBeVisible();
    expect(helpArticleCalls.some((call) => call.startsWith("200 "))).toBe(true);
  });

  test("names the category in the server-rendered h1", async ({ request }) => {
    // The heading a crawler reads is the one in the initial HTML, before any
    // client taxonomy fetch resolves. A category page used to render "Toutes
    // les annonces" there and only become "Véhicules" after hydration.
    for (const [route, heading] of [
      ["/categorie/vehicules", "Véhicules"],
      ["/categorie/mode", "Mode"],
    ] as const) {
      const html = await (await request.get(route)).text();
      const rendered = /<h1[^>]*>([^<]*)/.exec(html)?.[1]?.trim();
      expect(rendered, `${route} server h1`).toBe(heading);
      // Structured data and metadata must match what is visible.
      expect(html).toContain(`<title>${heading} | SHONGRE.</title>`);
    }

    // An unfiltered search is genuinely the whole catalogue; it keeps its own
    // heading rather than borrowing a category's.
    const search = await (await request.get("/recherche")).text();
    expect(/<h1[^>]*>([^<]*)/.exec(search)?.[1]?.trim()).toBe(
      "Toutes les annonces",
    );
  });

  test("assembles the collection rail in one request", async ({ page }) => {
    const searchCalls: string[] = [];
    const collectionCalls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("/api/v1/listings/search")) searchCalls.push(url);
      if (url.includes("/api/v1/discovery/collections"))
        collectionCalls.push(url);
    });
    await page.goto("/collections", { waitUntil: "load" });
    await page.waitForTimeout(2_500);

    expect(collectionCalls.length).toBeGreaterThan(0);
    // The regression this replaced: one search request per root category,
    // issued from the browser, purely to read a count and a cover image.
    expect(
      searchCalls.length,
      `expected no per-category search fan-out, saw:\n${searchCalls.join("\n")}`,
    ).toBeLessThan(3);
  });
});
