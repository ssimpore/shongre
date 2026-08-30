import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const REQUESTED_WIDTHS = [
  320, 375, 390, 430, 768, 1024, 1280, 1408, 1440, 1536,
];

async function expectCardContentContained(card: Locator, label: string) {
  await card.scrollIntoViewIfNeeded();
  await expect(card, `${label}: card should be visible`).toBeVisible();
  const geometry = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const interactiveElements = Array.from(
      element.querySelectorAll<HTMLElement>("a, button"),
    )
      .filter((item) => item.getClientRects().length > 0)
      .map((item) => {
        const itemRect = item.getBoundingClientRect();
        return {
          left: itemRect.left,
          right: itemRect.right,
          top: itemRect.top,
          bottom: itemRect.bottom,
        };
      });
    return {
      variant: element.getAttribute("data-listing-card-variant"),
      viewportWidth: window.innerWidth,
      width: rect.width,
      height: rect.height,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      },
      interactiveElements,
    };
  });

  expect(
    geometry.scrollWidth,
    `${label}: card has horizontally clipped content`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(
    geometry.scrollHeight,
    `${label}: card has vertically clipped content`,
  ).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(
    geometry.width,
    `${label}: card is wider than its responsive limit`,
  ).toBeLessThanOrEqual(
    geometry.variant === "list" ? geometry.viewportWidth : 304,
  );
  expect(
    geometry.height,
    `${label}: card is unexpectedly tall`,
  ).toBeLessThanOrEqual(520);
  for (const control of geometry.interactiveElements) {
    expect(
      control.left,
      `${label}: control escapes the left edge`,
    ).toBeGreaterThanOrEqual(geometry.rect.left - 1);
    expect(
      control.right,
      `${label}: control escapes the right edge`,
    ).toBeLessThanOrEqual(geometry.rect.right + 1);
    expect(
      control.top,
      `${label}: control escapes the top edge`,
    ).toBeGreaterThanOrEqual(geometry.rect.top - 1);
    expect(
      control.bottom,
      `${label}: control escapes the bottom edge`,
    ).toBeLessThanOrEqual(geometry.rect.bottom + 1);
  }
}

async function openAsGuest(page: Page, path: string) {
  await usePersona(page, "guest");
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
}

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test.describe("canonical listing cards", () => {
  for (const width of REQUESTED_WIDTHS) {
    test(`homepage cards stay compact and contained at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
      await openAsGuest(page, "/");

      const cards = page.locator('[data-listing-card="true"]');
      await expect(cards.first()).toBeVisible();
      expect(await cards.count()).toBeGreaterThan(3);
      await expectCardContentContained(cards.first(), `homepage @ ${width}px`);
      await expectNoHorizontalOverflow(page, `homepage cards @ ${width}px`);
    });
  }

  test("homepage discovery fits five complete compact cards in a desktop row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/");

    const firstRail = page
      .locator(".listing-rail-track")
      .filter({
        has: page.locator('[data-listing-card-variant="showcase"]'),
      })
      .first();
    await expect(firstRail).toBeVisible();
    const geometry = await firstRail.evaluate((rail) => {
      const viewport = rail.closest(".scrollable-region");
      const viewportRect = viewport?.getBoundingClientRect();
      const cards = Array.from(
        rail.querySelectorAll<HTMLElement>(":scope > .listing-rail-cell"),
      ).map((card) => {
        const rect = card.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          radius: Number.parseFloat(
            getComputedStyle(
              card.querySelector<HTMLElement>('[data-listing-card="true"]') ??
                card,
            ).borderRadius,
          ),
        };
      });
      return {
        completeCards: viewportRect
          ? cards.filter(
              (card) =>
                card.left >= viewportRect.left - 1 &&
                card.right <= viewportRect.right + 1,
            ).length
          : 0,
        cards,
      };
    });

    expect(geometry.completeCards).toBeGreaterThanOrEqual(5);
    expect(geometry.cards[0]?.width).toBeLessThanOrEqual(209);
    expect(geometry.cards[0]?.radius).toBeLessThanOrEqual(14);
  });

  test("structured category searches reuse the canonical card at phone, tablet, and desktop widths", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const categories = [
      { path: "/immo", consumer: "real-estate" },
      { path: "/auto", consumer: "auto" },
      { path: "/emploi", consumer: "employment" },
    ] as const;

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 320 ? 844 : 900 });
      for (const category of categories) {
        await test.step(`${category.consumer} @ ${width}px`, async () => {
          await openAsGuest(page, category.path);
          const consumer = page.locator(
            `[data-listing-card-consumer="${category.consumer}"]`,
          );
          await expect(consumer.first()).toBeVisible();
          const card = consumer
            .locator(
              ':scope > [data-listing-card="true"][data-listing-card-variant="list"]',
            )
            .first();
          await expect(card).toHaveAttribute(
            "data-listing-card-variant",
            "list",
          );
          await expectCardContentContained(
            card,
            `${category.consumer} @ ${width}px`,
          );
          await expectNoHorizontalOverflow(
            page,
            `${category.consumer} cards @ ${width}px`,
          );
        });
      }
    }
  });
});
