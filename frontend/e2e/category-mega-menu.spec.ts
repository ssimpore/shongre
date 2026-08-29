import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const desktopWidths = [1024, 1280, 1440] as const;

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
  await usePersona(page, "guest");
});

const categoryNav = (page: Page) =>
  page.locator('header nav[aria-label="Filtres par catégorie"]');

test.describe("desktop category mega-menu", () => {
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
