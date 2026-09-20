import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test("desktop results controls share one vertical centerline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1408, height: 900 });
  await page.goto("/recherche?view=map");
  await waitForStableLayout(page);

  const toolbar = page.locator("#search-results-toolbar");
  const controls = [
    toolbar
      .locator("[data-search-filter-rail]")
      .getByRole("button", { name: "Catégories", exact: true }),
    toolbar.getByRole("button", {
      name: "Sauvegarder cette recherche",
      exact: true,
    }),
    toolbar.getByRole("group", { name: "Mode d'affichage des annonces" }),
    toolbar.getByRole("button", { name: "Trier les résultats", exact: true }),
  ];
  const boxes = await Promise.all(
    controls.map((control) => control.boundingBox()),
  );
  expect(boxes.every(Boolean)).toBe(true);
  const visibleBoxes = boxes.filter((box) => box !== null);
  const centers = visibleBoxes.map((box) => box.y + box.height / 2);

  expect(visibleBoxes.map((box) => box.height)).toEqual([40, 40, 40, 40]);
  expect(Math.max(...centers) - Math.min(...centers)).toBeLessThanOrEqual(1);

  const saveTrigger = toolbar.getByRole("button", {
    name: "Sauvegarder cette recherche",
    exact: true,
  });
  expect(visibleBoxes[1]?.width).toBe(40);
  await expect(saveTrigger).toHaveText("");
  await expect(saveTrigger.locator("svg")).toBeVisible();

  const viewGroup = toolbar.getByRole("group", {
    name: "Mode d'affichage des annonces",
  });
  expect(visibleBoxes[2]?.width).toBeLessThan(150);
  for (const name of [
    "Affichage grille",
    "Affichage liste",
    "Affichage carte",
  ]) {
    const viewButton = viewGroup.getByRole("button", { name, exact: true });
    await expect(viewButton).toHaveText("");
    await expect(viewButton).toHaveAttribute("title", name);
    await expect(viewButton.locator("svg")).toBeVisible();
  }

  const sortTrigger = toolbar.getByRole("button", {
    name: "Trier les résultats",
    exact: true,
  });
  await expect(sortTrigger).toHaveText("Plus récentes");
  expect(visibleBoxes.at(-1)?.width).toBeLessThan(150);
  await expect(toolbar.getByText("Trier par :", { exact: true })).toHaveCount(
    0,
  );
  await sortTrigger.click();
  await expect(
    page.getByRole("listbox", { name: "Trier les résultats" }),
  ).toContainText("Trier par");
  await page.keyboard.press("Escape");
});

for (const width of [1408, 390, 320]) {
  test(`results toolbar keeps search actions usable at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recherche");
    await waitForStableLayout(page);
    const toolbar = page.locator("#search-results-toolbar");
    await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(
      "Toutes les annonces",
    );
    await expect(toolbar.getByRole("status")).toContainText(/annonce/);

    if (width >= 1024) {
      await expect(toolbar.locator("[data-search-filter-rail]")).toBeVisible();
      await expect(page.locator("#search-filter-panel")).toBeHidden();
      await toolbar
        .getByRole("button", { name: "Catégories", exact: true })
        .click();
      await expect(page.locator("#search-filter-panel")).toBeVisible();
    } else {
      await toolbar
        .getByRole("button", { name: "Ouvrir les filtres de recherche" })
        .click();
      await expect(page.locator("#search-filter-panel")).toBeVisible();
    }
    const panel = page.locator("#search-filter-panel");
    await panel.getByRole("button", { name: /Voir les résultats/ }).click();
    await expect(panel).toBeHidden();

    await toolbar
      .getByRole("button", { name: "Trier les résultats", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Prix : croissant", exact: true })
      .click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("sortBy"))
      .toBe("price_asc");
    await toolbar.getByRole("button", { name: "Affichage liste" }).click();
    await expect
      .poll(() => new URL(page.url()).searchParams.get("view"))
      .toBe("list");
    await expect(
      toolbar.getByRole("button", { name: "Affichage liste" }),
    ).toHaveAttribute("aria-pressed", "true");
    await waitForStableLayout(page);
    await expectNoHorizontalOverflow(page, `results toolbar ${width}`);

    const destination = new URL(page.url());
    await toolbar
      .getByRole("button", { name: "Sauvegarder cette recherche", exact: true })
      .click();
    await expect(page).toHaveURL(/\/connexion\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(
      destination.pathname + destination.search,
    );
  });
}

test("@serial results heading follows the category and keyword context", async ({
  page,
}) => {
  await page.goto("/recherche?category=maison-jardin");
  await waitForStableLayout(page);
  const toolbar = page.locator("#search-results-toolbar");
  await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(/Maison/);
  await expect(toolbar).toContainText("Explorez les annonces de la catégorie");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await page.goto("/recherche?category=maison-jardin&query=table");
  await waitForStableLayout(page);
  await expect(toolbar.getByRole("heading", { level: 1 })).toHaveText(
    "Recherche : table",
  );
  await expect(toolbar).toContainText("Affinez les résultats avec les filtres");
  await expect(toolbar.getByRole("status")).toContainText(/annonce/);
});
