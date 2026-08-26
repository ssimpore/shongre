import { expect, test } from "@playwright/test";

const apiUrl = process.env.PLAYWRIGHT_API_URL;
const expectedEnvironment = process.env.PLAYWRIGHT_EXPECTED_ENVIRONMENT;

test.describe("hosted Cloudflare path", () => {
  test.skip(
    !apiUrl || !expectedEnvironment,
    "Hosted deployment variables are required.",
  );

  test("serves the marketplace with environment-safe headers", async ({
    page,
  }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/Shongre/i);
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response?.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    if (expectedEnvironment !== "production") {
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
    }
  });

  test("serves live and ready API probes through the Tunnel", async ({
    request,
  }) => {
    for (const path of ["/livez", "/readyz"]) {
      const response = await request.get(new URL(path, apiUrl!).toString());
      expect(response.ok()).toBe(true);
      const payload = await response.json();
      expect(payload.environment).toBe(expectedEnvironment);
      expect(payload.release).toMatch(/^[0-9a-f]{40}$/);
    }
  });
});
