import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test.describe("Collections catalog density", () => {
  test("exposes filter selection to assistive technology", async ({ page }) => {
    await usePersona(page, "guest");
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const filters = page.getByRole("group", { name: "Toutes les collections" });
    const all = filters.getByRole("button", {
      name: "Toutes les collections",
      exact: true,
    });
    const editorial = filters.getByRole("button", {
      name: "Tendances & Éditoriales",
      exact: true,
    });

    await expect(all).toHaveAttribute("aria-pressed", "true");
    await editorial.click();
    await expect(editorial).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
  });

  test("matches the homepage collection-card size on desktop and keeps navigation working", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const homeCard = page
      .getByTestId("home-collection-explorer")
      .getByRole("link", { name: /^Explorer la collection / })
      .first();
    const homeBox = await homeCard.boundingBox();
    expect(homeBox).not.toBeNull();

    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page.getByTestId("collections-grid").getByRole("link");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(5);

    const boxes = await cards.evaluateAll((elements) =>
      elements.slice(0, 5).map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      }),
    );

    expect(new Set(boxes.map((box) => box.top)).size).toBe(1);
    for (const box of boxes) {
      expect(Math.abs(box.width - homeBox!.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(box.height - homeBox!.height)).toBeLessThanOrEqual(1);
    }

    await cards.first().click();
    await expect(page).toHaveURL(/\/collections\/[a-z0-9-]+$/);
  });

  test("keeps a two-column compact grid on mobile without page overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await usePersona(page, "guest");
    await page.goto("/collections", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const cards = page.getByTestId("collections-grid").getByRole("link");
    const positions = await cards.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: Math.round(rect.left), top: Math.round(rect.top) };
      }),
    );

    expect(positions[0].top).toBe(positions[1].top);
    expect(positions[0].left).toBeLessThan(positions[1].left);
    expect(positions[2].top).toBeGreaterThan(positions[0].top);
    await expectNoHorizontalOverflow(page, "collections compact grid");
  });

  test("renders an unknown collection as a recoverable missing resource", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/collections/selection-inconnue", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Collection introuvable",
      }),
    ).toBeVisible();
    await expect(page).toHaveTitle(/Collection introuvable/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/i,
    );
    await page
      .getByRole("link", { name: "Retour aux collections", exact: true })
      .click();
    await expect(page).toHaveURL(/\/collections$/);
  });

  test("clears detail filters when navigating to another collection", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.goto("/collections/pepites-semaine", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const tag = page.getByRole("button", {
      name: "Sélection hebdo",
      exact: true,
    });
    await tag.click();
    await expect(tag).toHaveAttribute("aria-pressed", "true");

    await page.locator('a[href="/collections/offres-prix-reduit"]').click();
    await expect(page).toHaveURL(/\/collections\/offres-prix-reduit$/);
    await expect(
      page.getByRole("button", { name: /^Tout/ }).first(),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("textbox", { name: /filtrer dans la sélection/i }),
    ).toHaveValue("");
  });
});
