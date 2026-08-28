import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { usePersona } from "./personas";

test.describe("Collections catalog density", () => {
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
});
