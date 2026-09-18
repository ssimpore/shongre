import { expect as baseExpect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(90_000);

for (const width of [1408, 768, 390, 320]) {
  test(`category cards match collection geometry at ${width}px`, async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 795 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/collections");
    const collection = page
      .getByTestId("collections-grid")
      .getByRole("link")
      .first();
    await expect(collection).toBeVisible();
    const reference = await collection.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      radius: getComputedStyle(element).borderRadius,
      imageHeight: element.firstElementChild!.getBoundingClientRect().height,
      titleSize: getComputedStyle(element.querySelector("h2")!).fontSize,
      padding: getComputedStyle(element.lastElementChild!).padding,
    }));

    await page.goto("/categories");
    await expect(page).toHaveURL(/\/categories$/);
    await expect(page).toHaveTitle(/catégories.*Shongre/i);
    await expect(
      page.getByRole("heading", { name: "Toutes nos catégories" }),
    ).toBeVisible();
    const grid = page.getByTestId("categories-grid");
    const cards = grid.getByRole("link");
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();
    const columns = width >= 1024 ? 5 : width >= 640 ? 3 : 2;
    const geometry = await cards.evaluateAll(
      (elements, count) =>
        elements.slice(0, count).map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height, top: rect.top };
        }),
      columns,
    );
    expect(geometry).toHaveLength(columns);
    for (const box of geometry) {
      expect(Math.abs(box.width - reference.width)).toBeLessThan(1);
      expect(Math.abs(box.height - reference.height)).toBeLessThan(1);
      expect(box.height).toBeCloseTo(geometry[0]!.height, 0);
      expect(box.top).toBeCloseTo(geometry[0]!.top, 0);
    }
    await expect(cards.first()).toHaveCSS("border-radius", reference.radius);
    await expect(cards.first()).toHaveCSS("overflow", "hidden");
    await expect(cards.first().getByRole("heading")).toHaveCSS(
      "font-size",
      reference.titleSize,
    );
    await expect(cards.first().locator("div").last()).toHaveCSS(
      "padding",
      reference.padding,
    );
    const image = (await cards
      .first()
      .locator(":scope > div")
      .first()
      .boundingBox())!;
    expect(Math.abs(image.height - reference.imageHeight)).toBeLessThan(1);
    expect(image.width / image.height).toBeCloseTo(4 / 3, 2);
    await expectNoHorizontalOverflow(page, `categories ${width}`);

    const search = page.getByRole("searchbox", {
      name: "Filtrer une catégorie, sous-catégorie...",
    });
    await search.fill("Voitures");
    const vehicles = grid.getByRole("link", {
      name: "Explorer Véhicules",
      exact: true,
    });
    await expect(vehicles).toBeVisible();
    await search.fill("Services");
    await expect(
      grid.getByRole("link", { name: "Explorer Services", exact: true }),
    ).toBeVisible();
    await search.fill("aucune-categorie-correspondante");
    await expect(grid).toHaveCount(0);
    await page
      .getByRole("button", { name: "Afficher toutes les catégories" })
      .click();
    await expect(cards).toHaveCount(initialCount);
    await expect(vehicles).toBeVisible();
    await vehicles.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/categorie\/vehicules$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (width >= 1024) {
      // Desktop filters live behind the shared disclosure, closed by default.
      await page.getByRole("button", { name: "Afficher les filtres" }).click();
      await page
        .locator("#search-filter-panel-desktop")
        .getByRole("button", {
          name: "Filtrer par sous-catégorie",
          exact: true,
        })
        .click();
      await page.getByRole("option", { name: "Voitures", exact: true }).click();
      await expect(page).toHaveURL(/[?&]subCategory=[^&]+/);
    }
    expect(errors).toEqual([]);
  });
}
