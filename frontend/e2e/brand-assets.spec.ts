import { expect, test, type Page } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";

function captureBrowserProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

test("official desktop signatures and metadata are served from the curated runtime set", async ({
  page,
  request,
}) => {
  const browserProblems = captureBrowserProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page).toHaveTitle(/SHONGRE\./);
  const headerSignature = page
    .locator('header [data-brand-signature="primary"]')
    .first();
  await expect(headerSignature).toBeVisible();
  await expect(headerSignature).toHaveAttribute("aria-label", "SHONGRE.");
  const headerIcon = headerSignature.locator("img").nth(0);
  const headerWordmark = headerSignature.locator("img").nth(1);
  await expect(headerIcon).toHaveAttribute(
    "src",
    "/brand/shongre/pwa/icon-maskable-192.png",
  );
  await expect(headerWordmark).toHaveAttribute(
    "src",
    "/brand/shongre/logo/wordmark-primary.svg",
  );
  await expect
    .poll(() => headerIcon.evaluate((image) => image.naturalWidth))
    .toBe(192);
  await expect
    .poll(() => headerWordmark.evaluate((image) => image.naturalWidth))
    .toBe(2024);
  expect(
    await headerIcon.evaluate((image) => image.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(36);
  expect(
    await headerIcon.evaluate(
      (image) => getComputedStyle(image).borderRadius,
    ),
  ).toBe("4px");
  expect(
    await headerWordmark.evaluate(
      (image) => image.getBoundingClientRect().width,
    ),
  ).toBeGreaterThanOrEqual(96);
  const marketLabel = page.locator("header [data-brand-market-label]").first();
  await expect(marketLabel).toHaveText(/^France$/i);
  const [
    wordmarkBox,
    marketLabelBox,
    marketLabelFontSize,
    marketLabelTransform,
  ] = await Promise.all([
    headerWordmark.boundingBox(),
    marketLabel.boundingBox(),
    marketLabel.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    ),
    marketLabel.evaluate((element) => getComputedStyle(element).textTransform),
  ]);
  expect(wordmarkBox).not.toBeNull();
  expect(marketLabelBox).not.toBeNull();
  expect(marketLabelFontSize).toBeLessThanOrEqual(11);
  expect(marketLabelTransform).toBe("uppercase");
  expect(marketLabelBox!.y).toBeGreaterThanOrEqual(
    wordmarkBox!.y + wordmarkBox!.height,
  );
  expect(
    Math.abs(
      marketLabelBox!.x +
        marketLabelBox!.width / 2 -
        (wordmarkBox!.x + wordmarkBox!.width / 2),
    ),
  ).toBeLessThanOrEqual(2);

  const footerSignature = page.locator(
    'footer [data-brand-signature="reverse"]',
  );
  await footerSignature.scrollIntoViewIfNeeded();
  await expect(footerSignature).toBeVisible();
  await expect(footerSignature).toHaveAttribute("aria-hidden", "true");
  const footerIcon = footerSignature.locator("img").nth(0);
  const footerWordmark = footerSignature.locator("img").nth(1);
  await expect(footerIcon).toHaveAttribute(
    "src",
    "/brand/shongre/pwa/icon-maskable-192.png",
  );
  await expect(footerWordmark).toHaveAttribute(
    "src",
    "/brand/shongre/logo/wordmark-reverse.png",
  );
  await expect
    .poll(() => footerIcon.evaluate((image) => image.naturalWidth))
    .toBe(192);
  await expect
    .poll(() => footerWordmark.evaluate((image) => image.naturalWidth))
    .toBe(2024);
  expect(
    await footerIcon.evaluate((image) => getComputedStyle(image).borderRadius),
  ).toBe("4px");
  expect(
    await footerIcon.evaluate((image) => image.getBoundingClientRect().width),
  ).toBe(36);
  expect(
    await footerWordmark.evaluate(
      (image) => image.getBoundingClientRect().width,
    ),
  ).toBe(96);

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "SHONGRE.",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /\/brand\/shongre\/social\/open-graph-light\.png$/,
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    /\/brand\/shongre\/social\/open-graph-light\.png$/,
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  expect(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
  ).toBe("#FF6500");
  for (const size of [16, 32, 48, 64, 96]) {
    await expect(
      page.locator(`link[rel="icon"][sizes="${size}x${size}"]`),
    ).toHaveAttribute("href", `/favicon-${size}x${size}.png?v=1.0.0`);
  }
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute(
    "href",
    "/favicon.ico?v=1.0.0",
  );

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: "SHONGRE.",
    theme_color: "#FF6500",
    background_color: "#FFFFFF",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: "/brand/shongre/pwa/icon-192.png",
        sizes: "192x192",
      }),
      expect.objectContaining({
        src: "/brand/shongre/pwa/icon-maskable-512.png",
        sizes: "512x512",
        purpose: "maskable",
      }),
    ]),
  );

  for (const path of [
    "/favicon.ico",
    "/favicon-16x16.png",
    "/favicon-32x32.png",
    "/favicon-48x48.png",
    "/favicon-64x64.png",
    "/favicon-96x96.png",
    "/apple-touch-icon.png",
    "/brand/shongre/social/open-graph-light.png",
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} is available`).toBe(true);
  }
  const solutionOpenGraph = await request.get("/og/solutions/prospects");
  expect(solutionOpenGraph.ok()).toBe(true);
  expect(solutionOpenGraph.headers()["content-type"]).toContain("image/png");
  expect((await solutionOpenGraph.body()).byteLength).toBeGreaterThan(1_000);
  expect(browserProblems).toEqual([]);
});

test("mobile header keeps the official signature while the navigation opens", async ({
  page,
}) => {
  const browserProblems = captureBrowserProblems(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });

  const headerSignature = page
    .locator('header [data-brand-signature="primary"]')
    .first();
  await expect(headerSignature).toBeVisible();
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await expect(
    page.getByRole("button", { name: "Fermer le menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-brand-signature="primary"]').nth(1),
  ).toBeVisible();
  expect(browserProblems).toEqual([]);
});

test("authentication shell uses the accessible official signature", async ({
  page,
}) => {
  const browserProblems = captureBrowserProblems(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/connexion", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { name: /connexion/i })).toBeVisible();
  const logo = page.locator('[data-brand-signature="primary"]');
  await expect(logo).toBeVisible();
  await expect(logo).toHaveAttribute("aria-label", "SHONGRE.");
  expect(browserProblems).toEqual([]);
});
