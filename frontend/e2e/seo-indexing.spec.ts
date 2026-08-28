import { expect, test } from "@playwright/test";

const ACTIVE_LISTING = "/annonce/list-102";
const ACTIVE_JOB =
  "/emploi/offre/developpeur-se-front-end-react-job-react-lyon";

function headValue(html: string, pattern: RegExp): string {
  return (html.match(pattern)?.[1] || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");
}

test.describe("SEO response and hydration contract", () => {
  test("renders active listing content and truthful schema in initial HTML", async ({
    request,
  }) => {
    const response = await request.get(ACTIVE_LISTING);
    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toContain("noindex");
    const html = await response.text();
    expect(html).toContain("<h1");
    expect(html).toContain("Peugeot 208 II");
    expect(html.match(/<link rel="canonical"/g)).toHaveLength(1);
    expect(html).toContain('/annonce/list-102"');
    const schemas = [
      ...html.matchAll(
        /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ].map((match) => JSON.parse(match[1]));
    expect(schemas.map((schema) => schema["@type"])).toEqual([
      "Product",
      "BreadcrumbList",
    ]);
    expect(schemas[0].offers).toMatchObject({
      price: 15400,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    });
    expect(schemas[0]).not.toHaveProperty("aggregateRating");
  });

  test("keeps server and hydrated listing metadata identical", async ({
    page,
    request,
  }) => {
    const response = await request.get(ACTIVE_LISTING);
    const html = await response.text();
    const serverTitle = headValue(html, /<title>([\s\S]*?)<\/title>/);
    const serverCanonical = headValue(
      html,
      /<link rel="canonical" href="([^"]+)"/,
    );
    const serverDescription = headValue(
      html,
      /<meta name="description" content="([^"]*)"/,
    );

    await page.goto(ACTIVE_LISTING);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Peugeot 208 II",
    );
    expect(await page.title()).toBe(serverTitle);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      serverCanonical,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      serverDescription,
    );
    await expect(
      page.locator('script[type="application/ld+json"]'),
    ).toHaveCount(2);
  });

  test("replaces temporary noindex metadata after a client-side listing navigation", async ({
    page,
  }) => {
    await page.goto("/categorie/vehicules");
    await page
      .getByRole("link", {
        name: /Peugeot 208 II.*15[\s\u00a0]400/,
      })
      .first()
      .click();
    await expect(page).toHaveURL(/\/annonce\/list-102$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Peugeot 208 II",
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/annonce\/list-102$/,
    );
  });

  test("renders valid active JobPosting data before hydration", async ({
    request,
  }) => {
    const response = await request.get(ACTIVE_JOB);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain("<h1");
    expect(html).toContain("Développeur·se front-end React");
    const schemas = [
      ...html.matchAll(
        /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
      ),
    ].map((match) => JSON.parse(match[1]));
    const job = schemas.find((schema) => schema["@type"] === "JobPosting");
    expect(job).toMatchObject({
      title: "Développeur·se front-end React",
      datePosted: expect.any(String),
      validThrough: expect.any(String),
      hiringOrganization: { name: "TechNova" },
    });
  });

  test("noindexes arbitrary search state while preserving crawlable links", async ({
    request,
  }) => {
    const response = await request.get(
      "/recherche?query=velo&sortBy=price_asc&view=list&page=3",
    );
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex, follow"');
    expect(html).toContain('<link rel="canonical"');
    expect(html).toContain('/recherche"');
  });

  test("returns real 404 responses for missing public resources and routes", async ({
    request,
  }) => {
    for (const path of [
      "/annonce/does-not-exist",
      "/emploi/offre/does-not-exist",
      "/auto/vehicule/does-not-exist",
      "/immo/bien/does-not-exist",
      "/education/professeur/does-not-exist",
      "/boutique/does-not-exist",
      "/collections/does-not-exist",
      "/does-not-exist",
    ]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(404);
      expect(response.headers()["x-robots-tag"], path).toContain("noindex");
      expect(await response.text(), path).toContain("Page introuvable");
    }
  });

  test("redirects legacy canonicals once and retains user state", async ({
    request,
  }) => {
    const response = await request.get("/privacy?source=footer", {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(308);
    expect(response.headers().location).toBe("/confidentialite?source=footer");
  });

  test("keeps lower environments blocked and omits public sitemaps", async ({
    request,
  }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Disallow: /");
    for (const sitemap of [
      "/sitemap.xml",
      "/be/sitemap.xml",
      "/gateway-sitemap.xml",
    ]) {
      expect((await request.get(sitemap)).status(), sitemap).toBe(404);
    }
  });
});
