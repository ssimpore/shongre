import { expect, test, type Locator } from "@playwright/test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

test.setTimeout(120_000);

async function expectSeparateFormats(collection: Locator) {
  const cards = await collection
    .locator(".listing-card-standard")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        top: Math.round(element.getBoundingClientRect().top),
        compact: element.classList.contains("listing-card-no-media"),
      })),
    );
  expect(cards.length).toBeGreaterThan(0);
  const rows = new Map<number, Set<boolean>>();
  for (const card of cards) {
    const formats = rows.get(card.top) ?? new Set<boolean>();
    formats.add(card.compact);
    rows.set(card.top, formats);
  }
  for (const formats of rows.values()) expect(formats.size).toBe(1);
}

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test("search separates formats without changing sorting or list navigation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/recherche?sortBy=date_desc");
  const grid = page.locator('[data-listing-grid-variant="grid"]');
  await expect(grid.locator(".listing-card-standard").nth(5)).toBeAttached();
  const links = grid.locator("[data-listing-card] > a");
  const originalOrder = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("href")),
  );

  for (const width of [1352, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await waitForStableLayout(page);
    await expectSeparateFormats(grid);
    expect(
      await links.evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")),
      ),
    ).toEqual(originalOrder);
    await expectNoHorizontalOverflow(page, `listing format rows ${width}`);
    if (width === 1352 || width === 390) {
      await grid.screenshot({
        path: join(
          tmpdir(),
          `shongre-listing-rows-search-${width}-${testInfo.project.name}.png`,
        ),
      });
    }
  }

  await page.setViewportSize({ width: 1352, height: 900 });
  await page
    .getByRole("button", { name: "Affichage liste", exact: true })
    .click();
  const list = page.locator('[data-listing-grid-variant="list"]');
  await expect(list).toBeVisible();
  await expect(list.locator(".listing-card-standard")).toHaveCount(0);
  expect(
    await list
      .locator("[data-listing-card] > a")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("href")),
      ),
  ).toEqual(originalOrder);
  expect(new URL(page.url()).searchParams.get("sortBy")).toBe("date_desc");
  await page
    .getByRole("button", { name: "Affichage grille", exact: true })
    .click();
  await expect(grid).toBeVisible();
  await expectSeparateFormats(grid);
  const link = grid.locator("[data-listing-card] > a").first();
  const href = await link.getAttribute("href");
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test("wrapped vertical results start a new row when their media format changes", async ({
  page,
}) => {
  for (const path of ["/auto", "/emploi", "/education"]) {
    await page.setViewportSize({ width: 1352, height: 900 });
    await page.goto(path);
    const grid = page.locator('[data-listing-grid-variant="grid"]');
    await expect(grid.locator(".listing-card-standard").first()).toBeVisible();
    await expectSeparateFormats(grid);

    // Layout-only stress over the real cards; no API or business state changes.
    const classes = await grid
      .locator(".listing-card-standard")
      .evaluateAll((cards) => {
        const original = cards.map((card) => card.className);
        cards.forEach((card, index) =>
          card.classList.toggle("listing-card-no-media", index % 3 !== 2),
        );
        return original;
      });
    await expectSeparateFormats(grid);
    await expectNoHorizontalOverflow(page, `wrapped format rows ${path}`);
    await grid
      .locator(".listing-card-standard")
      .evaluateAll((cards, original) => {
        cards.forEach((card, index) => {
          card.className = original[index];
        });
      }, classes);
  }
});
