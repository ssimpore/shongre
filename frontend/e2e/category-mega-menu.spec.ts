import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { getTaxonomyV4PublicBundle } from "@shongre/contracts/taxonomy-v4-public";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent } from "./personas";

const desktopWidths = [1024, 1280, 1440] as const;

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

const categoryNav = (page: Page) =>
  page.locator('header nav[aria-label="Filtres par catégorie"]');

async function configureHeaderCategories(page: Page, categoryIds: string[]) {
  await page.route("**/api/v1/taxonomy/header-navigation", async (route) => {
    const response = await route.fetch();
    const configuration = await response.json();
    await route.fulfill({
      response,
      json: {
        ...configuration,
        items: categoryIds.map((categoryId, displayOrder) => {
          const item = configuration.items.find(
            (candidate) => candidate.categoryId === categoryId,
          );
          expect(item, `API category ${categoryId}`).toBeDefined();
          return { ...item, isActive: true, displayOrder };
        }),
        links: (configuration.links ?? []).map((link, index) => ({
          ...link,
          displayOrder: categoryIds.length + index,
        })),
      },
    });
  });
}

test.describe("desktop category mega-menu", () => {
  test("backend-managed utility links share labels, order, styling and navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 800 });
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          "/api/v1/taxonomy/header-navigation" && response.ok(),
    );
    await page.goto("/");
    const configuration = await (await responsePromise).json();
    const expected = [...configuration.items, ...(configuration.links ?? [])]
      .filter((item) => item.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => item.shortLabels["fr-FR"]);
    const nav = categoryNav(page);
    await expect(nav.locator('[data-header-nav-item="true"]')).toHaveText(
      expected,
    );
    const overview = nav.locator("#header-category-trigger-category_overview");
    const promotions = nav.locator("#header-category-trigger-promotions");
    await expect(promotions).toContainClass("font-medium");
    await overview.hover();
    await expect(page.getByRole("menu")).toHaveAttribute(
      "data-active-category",
      "category_overview",
    );
    await page.keyboard.press("Escape");
    await promotions.click();
    await expect(page).toHaveURL(/\/offres-prix-reduit$/);
    await expect(
      categoryNav(page).locator("#header-category-trigger-promotions"),
    ).toHaveAttribute("aria-current", "page");
  });

  test("backend-managed utility links disappear on failure and recover through retry", async ({
    page,
  }) => {
    await page.route("**/api/v1/taxonomy/header-navigation", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "SERVICE_UNAVAILABLE", message: "Indisponible" },
        }),
      }),
    );
    await page.goto("/");
    const nav = categoryNav(page);
    await expect(nav.getByRole("status")).toHaveText("Navigation indisponible");
    await expect(nav.locator('[data-header-nav-item="true"]')).toHaveCount(0);
    await page.unroute("**/api/v1/taxonomy/header-navigation");
    await nav.getByRole("button", { name: "Réessayer", exact: true }).click();
    await expect(
      nav.locator("#header-category-trigger-promotions"),
    ).toBeVisible();
    await expect(nav.getByRole("status")).toHaveCount(0);
  });

  test("backend-managed utility links use the same mobile category list", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page
      .getByRole("button", { name: "Ouvrir le menu", exact: true })
      .click();
    const drawer = page.getByRole("dialog");
    await drawer
      .locator('button[aria-controls="header-mobile-navigation-categories"]')
      .click();
    const promotions = drawer.getByRole("link", {
      name: "Promotions",
      exact: true,
    });
    await expect(promotions).toBeVisible();
    await expect(
      drawer.getByRole("link", { name: "Autres", exact: true }),
    ).toBeVisible();
    await promotions.click();
    await expect(page).toHaveURL(/\/offres-prix-reduit$/);
    await expectNoHorizontalOverflow(page, "backend-driven mobile navigation");
  });
  test("opens on hover, switches categories, stays open over the panel, and closes on exit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const nav = categoryNav(page);
    const property = nav.getByRole("link", { name: "Immobilier", exact: true });
    const vehicles = nav.getByRole("link", { name: "Véhicules", exact: true });
    const menu = page.getByRole("menu");

    await expect(property).toHaveAttribute("aria-haspopup", "menu");
    await expect(property).toHaveAttribute(
      "aria-controls",
      "header-category-mega-menu",
    );
    await expect(property).toHaveAttribute("aria-expanded", "false");

    await property.hover();
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute("data-active-category", "immobilier");
    await expect(property).toHaveAttribute("aria-expanded", "true");
    await expect(
      menu.getByRole("menuitem", { name: "Ventes immobilières", exact: true }),
    ).toBeVisible();

    await vehicles.hover();
    await expect(menu).toHaveAttribute("data-active-category", "vehicules");
    await expect(
      menu.getByRole("menuitem", { name: "Voitures", exact: true }),
    ).toBeVisible();

    await menu.hover({ position: { x: 320, y: 120 } });
    await page.waitForTimeout(250);
    await expect(menu).toBeVisible();

    await page.mouse.move(4, 700);
    await expect(menu).toHaveCount(0);
    await expect(vehicles).toHaveAttribute("aria-expanded", "false");
  });

  test("opens every category after an admin configuration change", async ({
    page,
  }) => {
    await configureHeaderCategories(page, [
      "electronics",
      "fashion",
      "home_garden",
    ]);
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname ===
          "/api/v1/taxonomy/header-navigation" && response.ok(),
    );

    await page.setViewportSize({ width: 1408, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const configuration = await (await responsePromise).json();
    const configuredCategories = configuration.items.map((item) => ({
      slug: item.slug,
      label: item.shortLabels["fr-FR"],
    }));

    const nav = categoryNav(page);
    await nav.hover();
    await expect(
      nav.locator('a[data-header-nav-item="true"][aria-haspopup="menu"]'),
    ).toHaveCount(configuredCategories.length + 1);

    for (const category of configuredCategories) {
      const trigger = nav.getByRole("link", {
        name: category.label,
        exact: true,
      });
      await expect(trigger).toHaveAttribute(
        "id",
        `header-category-trigger-${category.slug}`,
      );
      await trigger.hover();
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute("data-active-category", category.slug);
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(trigger).toHaveText(category.label);
    }
  });

  test("opens from focus, supports keyboard movement, closes on focus exit and Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const nav = categoryNav(page);
    const property = nav.getByRole("link", { name: "Immobilier", exact: true });
    const menu = page.getByRole("menu");

    await expect(property).toHaveAttribute("aria-haspopup", "menu");
    await property.focus();
    await expect(menu).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem", {
        name: "Voir toutes les annonces",
        exact: true,
      }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      menu.getByRole("menuitem", { name: "Ventes immobilières", exact: true }),
    ).toBeFocused();

    await page.locator("main a[href]").first().focus();
    await expect(menu).toHaveCount(0);

    await property.focus();
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(property).toBeFocused();
    await expect(property).toHaveAttribute("aria-expanded", "false");
  });

  test("navigates through a taxonomy destination and closes the panel", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const property = categoryNav(page).getByRole("link", {
      name: "Immobilier",
      exact: true,
    });
    await expect(property).toHaveAttribute("aria-haspopup", "menu");
    await property.hover();
    const menu = page.getByRole("menu");
    await menu
      .getByRole("menuitem", { name: "Ventes immobilières", exact: true })
      .click();

    await expect(page).toHaveURL(
      /\/categorie\/immobilier\?subCategory=ventes-immobilieres$/,
    );
    await expect(menu).toHaveCount(0);
  });

  test("keeps Autres as the exact complement of the active market header", async ({
    page,
  }) => {
    const promotedCategoryIds = ["real_estate", "vehicles", "jobs"];
    await configureHeaderCategories(page, promotedCategoryIds);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const nav = categoryNav(page);
    await nav.hover();
    await expect(
      nav.getByRole("link", { name: "Mode", exact: true }),
    ).toHaveCount(0);

    await nav.getByRole("link", { name: "Autres", exact: true }).hover();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();

    const renderedOtherIds = await menu
      .locator("section[data-category-id]")
      .evaluateAll((sections) =>
        sections.map((section) => section.getAttribute("data-category-id")),
      );
    const expectedOtherIds = getTaxonomyV4PublicBundle()
      .categories.filter(
        (category) =>
          !category.parentId &&
          category.status === "active" &&
          category.marketAvailability.some(
            (availability) =>
              availability.marketCode === "FR" &&
              availability.marketplaceEnabled,
          ) &&
          !promotedCategoryIds.includes(category.id),
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.id.localeCompare(right.id),
      )
      .map((category) => category.id);

    expect(renderedOtherIds).toEqual(expectedOtherIds);
    expect(new Set(renderedOtherIds).size).toBe(renderedOtherIds.length);
    promotedCategoryIds.forEach((categoryId) =>
      expect(renderedOtherIds).not.toContain(categoryId),
    );
  });

  test("renders the canonical digital-products icon in the header category picker", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const categoryTrigger = page.locator(
      "#header-desktop-header-category-button",
    );
    await categoryTrigger.click();
    const digitalCategory = page
      .locator("#header-desktop-header-category-menu")
      .getByRole("button", { name: "Numérique", exact: true });

    await expect(digitalCategory).toBeVisible();
    await expect(digitalCategory.locator("svg")).toHaveClass(/lucide-file-key/);
    await digitalCategory.click();
    await expect(categoryTrigger).toContainText("Numérique");
    await expect(categoryTrigger.locator("svg").first()).toHaveClass(
      /lucide-file-key/,
    );
  });

  test("keeps the open menu accessible and token-aligned at representative widths", async ({
    page,
  }) => {
    for (const width of desktopWidths) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const nav = categoryNav(page);
      const property = nav.getByRole("link", {
        name: "Immobilier",
        exact: true,
      });
      await expect(property).toHaveAttribute("aria-haspopup", "menu");
      await property.hover();
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();

      const [navBox, menuBox] = await Promise.all([
        nav.boundingBox(),
        menu.boundingBox(),
      ]);
      expect(navBox).not.toBeNull();
      expect(menuBox).not.toBeNull();
      expect(
        Math.abs(menuBox!.y - (navBox!.y + navBox!.height)),
      ).toBeLessThanOrEqual(1);
      expect(menuBox!.x).toBeGreaterThanOrEqual(0);
      expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
      await expectNoHorizontalOverflow(
        page,
        `category mega-menu at ${width}px`,
      );

      const results = await new AxeBuilder({ page })
        .include("#header-category-mega-menu")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = results.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      );
      expect(blocking, `mega-menu accessibility at ${width}px`).toEqual([]);
    }
  });

  test("does not add the mega-menu interaction on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const property = categoryNav(page).getByRole("link", {
      name: "Immobilier",
      exact: true,
    });
    await expect(property).toBeVisible();
    await expect(property).not.toHaveAttribute("aria-haspopup");
    await expect(property).not.toHaveAttribute("aria-controls");
    await expect(page.locator("#header-category-mega-menu")).toHaveCount(0);

    await property.hover();
    await expect(page.locator("#header-category-mega-menu")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, "mobile category navigation");
  });
});
