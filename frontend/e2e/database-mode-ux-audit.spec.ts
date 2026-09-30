import { expect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { browserApi } from "./browser-api";

test("database discovery preserves exact bounds and server-filtered city results", async ({
  page,
}, testInfo) => {
  await useEstablishedConsent(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recherche?maxPrice=195");
  await page
    .getByRole("button", {
      name: "Ouvrir les filtres de recherche",
      exact: true,
    })
    .click();
  const panel = page.locator("#search-filter-panel");
  await expect(
    panel.getByRole("textbox", { name: "Prix maximum", exact: true }),
  ).toHaveValue("195");
  const slider = panel.getByRole("slider", {
    name: "Prix maximum",
    exact: true,
  });
  await slider.focus();
  await slider.press("Tab");
  await expect(page).toHaveURL(/maxPrice=195/);
  const response = await browserApi(page, "/listings/search", {
    method: "POST",
    body: { marketCode: "FR", city: "Bordeaux", sortBy: "date_desc" },
    market: "FR",
  });
  expect(response.status, JSON.stringify(response.body)).toBe(200);
  const items = response.body.items as Array<{ city: string }>;
  expect(items.length).toBeGreaterThan(0);
  for (const item of items) expect(item.city).toBe("Bordeaux");
  await page.screenshot({
    path: testInfo.outputPath("database-exact-price.png"),
    fullPage: true,
  });
});

test("server-rendered search images remain visible before hydration", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const blockedScripts: string[] = [];
  try {
    // Preserve Next's inline stream reveal while preventing application hydration.
    await page.route("**/_next/static/**/*.js", (route) => {
      blockedScripts.push(route.request().url());
      return route.abort("blockedbyclient");
    });
    await page.goto(
      new URL("/recherche", testInfo.project.use.baseURL as string).href,
    );
    // Card photos are decorative because the enclosing link already names the listing.
    const images = page.locator("main article img");
    await expect(images.first()).toBeVisible();
    await images.first().scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        images
          .first()
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
      )
      .toBe(true);
    expect(
      await images.first().evaluate((image) => getComputedStyle(image).opacity),
    ).toBe("1");
    expect(blockedScripts.length).toBeGreaterThan(0);
    await page.screenshot({
      path: testInfo.outputPath("database-images-before-hydration.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});
