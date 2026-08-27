import { expect, test } from "@playwright/test";

const apiUrl = process.env.PLAYWRIGHT_API_URL;
const franceUrl = process.env.PLAYWRIGHT_FR_URL;
const expectedEnvironment = process.env.PLAYWRIGHT_EXPECTED_ENVIRONMENT;
const expectedRelease = process.env.PLAYWRIGHT_EXPECTED_RELEASE;

function expectSecurityHeaders(headers: Record<string, string>) {
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  if (expectedEnvironment !== "production") {
    expect(headers["x-robots-tag"]).toContain("noindex");
  }
}

test.describe("hosted Cloudflare path", () => {
  test.skip(
    !apiUrl || !franceUrl || !expectedEnvironment || !expectedRelease,
    "Hosted deployment variables are required.",
  );

  test("serves the international gateway with environment-safe headers", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/Shongre/i);
    expectSecurityHeaders(response!.headers());
  });

  test("serves the France marketplace with environment-safe headers", async ({
    request,
  }) => {
    const response = await request.get(franceUrl!);
    expect(response.ok()).toBe(true);
    expect(await response.text()).toMatch(/Shongre/i);
    expectSecurityHeaders(response.headers());
  });

  test("serves live and ready API probes through the Tunnel", async ({
    request,
  }) => {
    for (const path of ["/livez", "/readyz"]) {
      const response = await request.get(new URL(path, apiUrl!).toString());
      expect(response.ok()).toBe(true);
      const payload = await response.json();
      expect(payload.environment).toBe(expectedEnvironment);
      expect(payload.release).toBe(expectedRelease);
      expect(response.headers()["x-request-id"]).toMatch(/^[A-Za-z0-9._-]+$/);
    }
  });

  test("returns a market-scoped public listings feed", async ({ request }) => {
    const headers = {
      Referer: franceUrl!,
      "X-Request-Id": `staging-cert-${expectedRelease}`,
      "X-Shongre-Market": "FR",
    };
    const [marketsResponse, listingsResponse] = await Promise.all([
      request.get(new URL("/api/v1/markets", apiUrl!).toString(), { headers }),
      request.get(
        new URL("/api/v1/listings?marketCode=FR", apiUrl!).toString(),
        { headers },
      ),
    ]);
    expect(marketsResponse.ok()).toBe(true);
    expect(listingsResponse.ok()).toBe(true);
    expect(marketsResponse.headers()["x-request-id"]).toBe(
      `staging-cert-${expectedRelease}`,
    );
    expect(listingsResponse.headers()["x-request-id"]).toBe(
      `staging-cert-${expectedRelease}`,
    );

    const markets = await marketsResponse.json();
    expect(markets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "FR", launchStatus: "active" }),
      ]),
    );
    const feed = await listingsResponse.json();
    expect(Array.isArray(feed.listings)).toBe(true);
    expect(feed.total).toBeGreaterThanOrEqual(0);
  });
});
