import { expect, test, type Page } from "@playwright/test";
import { colors } from "@shongre/design-tokens";
import { brand } from "@shongre/brand";
import { webBrandAssets } from "@shongre/brand/web";
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

test("real 404 pages reuse the header icon and wordmark composition", async ({
  page,
}) => {
  const browserProblems = captureBrowserProblems(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto("/does-not-exist", {
    waitUntil: "domcontentloaded",
  });

  expect(response?.status()).toBe(404);
  const signature = page.locator('[data-brand-signature="primary"]');
  await expect(signature).toBeVisible();
  await expect(signature).toHaveAttribute("aria-label", "SHONGRE. France");
  const icon = signature.locator("img").nth(0);
  const wordmark = signature.locator("img").nth(1);
  await expect(icon).toHaveAttribute("src", webBrandAssets.icon.primary.src);
  await expect(wordmark).toHaveAttribute(
    "src",
    webBrandAssets.logo.wordmark.primary.src,
  );
  expect(
    await icon.evaluate((image) => image.getBoundingClientRect().width),
  ).toBe(36);
  expect(
    await icon.evaluate((image) => getComputedStyle(image).borderRadius),
  ).toBe("4px");
  expect(
    await wordmark.evaluate((image) => image.getBoundingClientRect().width),
  ).toBe(96);
  await expect(signature.locator("[data-brand-market-label]")).toHaveText(
    "France",
  );

  await page.getByRole("link", { name: "Retour à l’accueil" }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    browserProblems.filter(
      (problem) =>
        !problem.includes(
          "Failed to load resource: the server responded with a status of 404",
        ),
    ),
  ).toEqual([]);
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
    webBrandAssets.icon.primary.src,
  );
  await expect(headerWordmark).toHaveAttribute(
    "src",
    webBrandAssets.logo.wordmark.primary.src,
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
    await headerIcon.evaluate((image) => getComputedStyle(image).borderRadius),
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
    webBrandAssets.icon.primary.src,
  );
  await expect(footerWordmark).toHaveAttribute(
    "src",
    webBrandAssets.logo.wordmark.reverse.src,
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
  ).toBe(
    await headerIcon.evaluate((image) => image.getBoundingClientRect().width),
  );
  expect(
    await footerWordmark.evaluate(
      (image) => image.getBoundingClientRect().width,
    ),
  ).toBe(
    await headerWordmark.evaluate(
      (image) => image.getBoundingClientRect().width,
    ),
  );

  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
    "content",
    "SHONGRE.",
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    new RegExp(
      webBrandAssets.social.openGraphLight.src.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ),
    ),
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    new RegExp(
      webBrandAssets.social.openGraphLight.src.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      ),
    ),
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(
    page.locator(
      'link[rel="preload"][as="image"][href*="/brand/shongre/logo/header-primary-"]',
    ),
    "a normal route must not preload the hidden not-found boundary logo",
  ).toHaveCount(0);
  expect(
    await page.locator('meta[name="theme-color"]').getAttribute("content"),
  ).toBe(colors.brand.primary);
  for (const size of [16, 32, 48, 64, 96]) {
    await expect(
      page.locator(`link[rel="icon"][sizes="${size}x${size}"]`),
    ).toHaveAttribute(
      "href",
      webBrandAssets.favicon.png.find(
        ({ sizes }) => sizes === `${size}x${size}`,
      )!.src,
    );
  }
  await expect(page.locator('link[rel="shortcut icon"]')).toHaveAttribute(
    "href",
    webBrandAssets.favicon.ico.src,
  );

  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: "SHONGRE.",
    theme_color: colors.brand.primary,
    background_color: colors.brand.background,
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        src: webBrandAssets.pwa.icons.find(
          ({ sizes, purpose }) => sizes === "192x192" && purpose === "any",
        )!.src,
        sizes: "192x192",
      }),
      expect.objectContaining({
        src: webBrandAssets.pwa.icons.find(
          ({ sizes, purpose }) => sizes === "512x512" && purpose === "maskable",
        )!.src,
        sizes: "512x512",
        purpose: "maskable",
      }),
    ]),
  );

  for (const path of [
    webBrandAssets.favicon.ico.src,
    ...webBrandAssets.favicon.png.map(({ src }) => src),
    webBrandAssets.favicon.appleTouch.src,
    webBrandAssets.social.openGraphLight.src,
  ]) {
    const response = await request.get(path);
    expect(response.ok(), `${path} is available`).toBe(true);
  }
  const solutionOpenGraph = await request.get("/og/solutions/prospects");
  expect(solutionOpenGraph.ok()).toBe(true);
  expect(solutionOpenGraph.headers()["content-type"]).toContain("image/png");
  expect((await solutionOpenGraph.body()).byteLength).toBeGreaterThan(1_000);
  expect(browserProblems).toEqual([]);
  expect(webBrandAssets.version).toBe(brand.version);
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

test("admin inverse chrome keeps the approved standalone icon recognizable", async ({
  page,
}) => {
  const browserProblems = captureBrowserProblems(page);
  await usePersona(page, "admin");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin", { waitUntil: "networkidle" });

  const icon = page.locator('header [data-brand-icon="primary"]');
  await expect(icon).toBeVisible();
  await expect(icon).toHaveAttribute("src", webBrandAssets.icon.primary.src);
  expect(
    await icon.evaluate((image) => image.getBoundingClientRect().width),
  ).toBeGreaterThanOrEqual(28);
  await expect(
    page.locator('header [data-brand-icon="mono-white"]'),
  ).toHaveCount(0);
  expect(browserProblems).toEqual([]);
});
