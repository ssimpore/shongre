import { test, expect } from "@playwright/test";
import { usePersona } from "./personas";
import { waitForStableLayout } from "./overflow";

test("desktop quick filters open the shared right drawer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const filterPanel = page.locator("#search-filter-panel");
  await expect(filterPanel).toBeHidden();
  const categoryFilter = page
    .locator("[data-search-filter-rail]")
    .getByRole("button", { name: "Catégories", exact: true });
  await expect(categoryFilter).toHaveAttribute("aria-expanded", "false");
  await categoryFilter.click();
  await expect(filterPanel).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(filterPanel).toBeHidden();
  await expect(categoryFilter).toHaveAttribute("aria-expanded", "false");
});

test("condition is filterable, not just displayed", async ({ page }) => {
  /* Every result card prints a condition, but nothing exposed it as a facet —
     while `filters.conditions` had been honoured by the data layer all along. */
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  await page
    .locator("[data-search-filter-rail]")
    .getByRole("button", { name: "État", exact: true })
    .click();
  await expect(page.locator("#search-filter-panel")).toBeVisible();

  const count = page
    .getByRole("status")
    .filter({ hasText: /annonce/ })
    .first();
  const total = Number.parseInt(await count.innerText(), 10);

  await page.getByRole("checkbox", { name: "Très bon état" }).click();
  await expect(page).toHaveURL(/condition=very_good/);

  // The count re-renders once the URL round-trips through the router, so poll
  // rather than reading it in the same tick as the click.
  await expect
    .poll(async () => Number.parseInt(await count.innerText(), 10))
    .toBeLessThan(total);
});

test("save search shares the results toolbar row with filters", async ({
  page,
}) => {
  await page.setViewportSize({ width: 888, height: 795 });
  await usePersona(page, "guest");
  await page.goto("/recherche?category=emploi", {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  const filterButton = page.locator(
    'button[aria-label^="Ouvrir les filtres de recherche"]',
  );
  const saveButton = page.getByRole("button", {
    name: "Sauvegarder cette recherche",
    exact: true,
  });

  await expect(filterButton).toBeVisible();
  await expect(saveButton).toBeVisible();

  const alignment = await page.evaluate(() => {
    const filter = document.querySelector<HTMLButtonElement>(
      'button[aria-label^="Ouvrir les filtres de recherche"]',
    );
    const save = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find(
      (button) =>
        button.getAttribute("aria-label") === "Sauvegarder cette recherche",
    );
    if (!filter || !save) return null;

    const filterRect = filter.getBoundingClientRect();
    const saveRect = save.getBoundingClientRect();
    return {
      sameRow: Math.abs(filterRect.top - saveRect.top) <= 1,
      saveStartsAfterFilter: saveRect.left >= filterRect.right,
    };
  });

  expect(alignment).toEqual({ sameRow: true, saveStartsAfterFilter: true });
});

test("empty-search save action fits and preserves the guest return path", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1408, height: 795 });
  await usePersona(page, "guest");
  await page.goto("/recherche?query=aucun-resultat-shongre-xyz", {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  const saveButton = page.locator("#search-no-results-save-search-btn");
  await expect(saveButton).toBeVisible();
  expect(
    await saveButton.evaluate(
      (button) => button.scrollWidth <= button.clientWidth,
    ),
  ).toBe(true);

  await saveButton.click();

  await expect(page).toHaveURL(/\/connexion\?/);
  const loginUrl = new URL(page.url());
  expect(loginUrl.searchParams.get("redirect")).toBe(
    "/recherche?query=aucun-resultat-shongre-xyz",
  );
});

test("the results route is searchable, not just filterable", async ({
  page,
}) => {
  /* `/recherche` was reachable and then unsearchable: the header suppressed its
     own search bar here on the premise that the filter panel owns refinement,
     and the panel carries category, location, seller type, condition and budget
     — never a keyword. */
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  const field = page.locator("#header-desktop-header-query-input");
  await expect(field).toBeVisible();
  // The in-page controls stay out: `shared-search-filters.spec.ts` locks them
  // out of all five search surfaces.
  await expect(page.locator("#search-results-page-query-input")).toHaveCount(0);
});

test("a submitted keyword drives the URL and the heading without resetting refinements", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche?sortBy=price_asc", {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  await expect(page.locator("h1")).toHaveText("Toutes les annonces");

  await page.locator("#header-desktop-header-query-input").fill("peugeot");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/query=peugeot/);
  /* Submitting from the header used to navigate to a freshly built
     `routes.search()` URL, which discarded every other refinement. */
  await expect(page).toHaveURL(/sortBy=price_asc/);
  // A radius with no city filters nothing and would mark the URL as arbitrary
  // state for `seo-policy`.
  await expect(page).not.toHaveURL(/radius=/);
  await expect(page.locator("h1")).toHaveText("Recherche : peugeot");
});

test("the header field carries the active query instead of rendering empty", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche?query=peugeot", {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  await expect(page.locator("#header-desktop-header-query-input")).toHaveValue(
    "peugeot",
  );
});

test("a `?q=` link agrees with the page it renders", async ({ page }) => {
  /* `seo-policy` builds the title from `query` or `q`; the page read only
     `query`, so `?q=peugeot` produced a "Recherche : peugeot" title over
     unfiltered results under a "Toutes les annonces" heading. */
  await page.setViewportSize({ width: 1280, height: 800 });
  await usePersona(page, "guest");
  await page.goto("/recherche?q=peugeot", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  await expect(page.locator("h1")).toHaveText("Recherche : peugeot");
  await expect(page).toHaveTitle(/Recherche : peugeot/);
  await expect(page.locator("#header-desktop-header-query-input")).toHaveValue(
    "peugeot",
  );
});

test("a phone can search the results route, not just filter it", async ({
  page,
}) => {
  /* The desktop header slot is `hidden md:block` and the bottom tab bar's
     "Rechercher" tab points at `/recherche`, so on a phone the tab promised
     search and delivered a facet list. */
  await page.setViewportSize({ width: 399, height: 602 });
  await usePersona(page, "guest");
  await page.goto("/recherche?sortBy=price_asc", {
    waitUntil: "domcontentloaded",
  });
  await waitForStableLayout(page);

  const field = page.locator("#search-mobile-minimal-query-input");
  await expect(field).toBeVisible();

  await field.fill("peugeot");
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/query=peugeot/);
  await expect(page).toHaveURL(/sortBy=price_asc/);
  await expect(page.locator("h1")).toHaveText("Recherche : peugeot");
  await expect(field).toHaveValue("peugeot");
});

test("the compact mobile field stays out of the desktop layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1408, height: 900 });
  await usePersona(page, "guest");
  await page.goto("/recherche", { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);

  await expect(page.locator("#search-mobile-minimal-query-input")).toBeHidden();
  await expect(page.locator("#header-desktop-header-query-input")).toBeVisible();
});
