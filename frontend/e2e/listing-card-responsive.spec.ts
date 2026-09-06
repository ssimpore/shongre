import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

const REQUESTED_WIDTHS = [320, 375, 390, 430, 768, 1024, 1408, 1440];

async function expectCardContentContained(card: Locator, label: string) {
  await card.scrollIntoViewIfNeeded();
  await expect(card, `${label}: visible card`).toBeVisible();
  const geometry = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const media = element
      .querySelector<HTMLElement>('[data-listing-card-media="true"]')
      ?.getBoundingClientRect();
    return {
      variant: element.getAttribute("data-listing-card-variant"),
      viewportWidth: window.innerWidth,
      width: rect.width,
      height: rect.height,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      mediaRatio: media ? media.width / media.height : 0,
      controlsContained: Array.from(
        element.querySelectorAll<HTMLElement>("a, button"),
      )
        .filter((control) => control.getClientRects().length > 0)
        .every((control) => {
          const controlRect = control.getBoundingClientRect();
          return (
            controlRect.left >= rect.left - 1 &&
            controlRect.right <= rect.right + 1 &&
            controlRect.top >= rect.top - 1 &&
            controlRect.bottom <= rect.bottom + 1
          );
        }),
    };
  });

  expect(
    geometry.scrollWidth,
    `${label}: horizontal card clipping`,
  ).toBeLessThanOrEqual(geometry.clientWidth + 1);
  expect(
    geometry.scrollHeight,
    `${label}: vertical card clipping`,
  ).toBeLessThanOrEqual(geometry.clientHeight + 1);
  expect(geometry.width, `${label}: width`).toBeLessThanOrEqual(
    geometry.variant === "list" ? geometry.viewportWidth : 304,
  );
  expect(geometry.height, `${label}: height`).toBeLessThanOrEqual(520);
  expect(geometry.controlsContained, `${label}: controls`).toBe(true);
  if (geometry.variant !== "list" && geometry.width <= 210) {
    expect(geometry.mediaRatio, `${label}: portrait media`).toBeCloseTo(0.8, 1);
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

  test("uses the exact compact hierarchy and only real optional facts", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/recherche");

    const branded = page
      .locator('[data-listing-card="true"]', {
        has: page.locator('a[href="/annonce/list-113"]'),
      })
      .first();
    await branded.scrollIntoViewIfNeeded();
    await expect(branded).toBeVisible();
    await expect(
      branded.locator('[data-listing-card-category-row="true"]'),
    ).toHaveText("Bébé & Famille·Cybex");
    await expect(branded.locator('[data-ui-pro-badge="true"]')).toHaveCount(0);
    await expect(
      branded.locator('[data-listing-card-rating="true"]'),
    ).toContainText("5,0");
    await expect(branded.locator("svg.lucide-star")).toHaveCount(1);

    const order = await branded.evaluate((element) => {
      const top = (selector: string) =>
        element.querySelector<HTMLElement>(selector)?.getBoundingClientRect()
          .top ?? -1;
      return [
        top('[data-listing-card-category-row="true"]'),
        top('[data-listing-card-price-row="true"]'),
        top('[data-listing-card-title="true"]'),
        top('[data-listing-card-meta="true"]'),
      ];
    });
    expect(
      order.every((value, index) => index === 0 || value > order[index - 1]!),
    ).toBe(true);

    const professional = page
      .locator('[data-listing-card="true"]', {
        has: page.locator('a[href="/annonce/list-115"]'),
      })
      .first();
    await professional.scrollIntoViewIfNeeded();
    await expect(professional.locator('[data-ui-pro-badge="true"]')).toHaveText(
      "Pro",
    );
    await expect(
      professional.locator('[data-listing-card-rating="true"]'),
    ).toBeVisible();

    const withoutReviews = page
      .locator('[data-listing-card="true"]', {
        has: page.locator(
          'a[href="/emploi/offre/auxiliaire-de-vie-a-temps-partiel-job-private-care-lyon"]',
        ),
      })
      .first();
    await withoutReviews.scrollIntoViewIfNeeded();
    await expect(
      withoutReviews.locator('[data-ui-pro-badge="true"]'),
    ).toHaveCount(0);
    await expect(
      withoutReviews.locator('[data-listing-card-rating="true"]'),
    ).toHaveCount(0);

    for (const selector of [
      '[data-listing-card-characteristics="true"]',
      '[data-listing-card-photo-count="true"]',
      '[data-listing-card-delivery-overlay="true"]',
      '[data-listing-card-seller-avatar="true"]',
      '[data-listing-card-original-price="true"]',
      '[data-listing-card-negotiable="true"]',
    ]) {
      await expect(page.locator(selector)).toHaveCount(0);
    }
  });

  test("shows the single Boosté indicator only on promoted results", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/recherche");

    const promoted = page
      .locator('[data-listing-card="true"]')
      .filter({ has: page.locator('[data-listing-card-promotion="true"]') })
      .first();
    await promoted.scrollIntoViewIfNeeded();
    await expect(
      promoted.locator('[data-listing-card-promotion="true"]'),
    ).toHaveText("Boosté");
    await expect(promoted.locator("svg.lucide-zap")).toHaveCount(1);

    const standard = page
      .locator('[data-listing-card="true"]', {
        has: page.locator('a[href="/annonce/list-113"]'),
      })
      .first();
    await standard.scrollIntoViewIfNeeded();
    await expect(
      standard.locator('[data-listing-card-promotion="true"]'),
    ).toHaveCount(0);
  });

  test("keeps the favourite independent from listing navigation", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await usePersona(page, "individual_buyer");
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const card = page
      .locator('[data-listing-card="true"]', {
        has: page.locator('a[href="/annonce/list-113"]'),
      })
      .first();
    await card.scrollIntoViewIfNeeded();
    const favorite = card.locator(
      '[data-marketplace-action="favorite.manage"]',
    );
    await expect(favorite).toBeVisible();
    const originalUrl = page.url();
    const previousState = await favorite.getAttribute("aria-pressed");
    await favorite.click();
    await expect(page).toHaveURL(originalUrl);
    await expect(favorite).toHaveAttribute(
      "aria-pressed",
      previousState === "true" ? "false" : "true",
    );
    await expect(favorite).toHaveAttribute(
      "aria-label",
      new RegExp(
        `^${previousState === "true" ? "Ajouter aux favoris" : "Retirer des favoris"} .+`,
      ),
    );

    await card.locator('a[href="/annonce/list-113"]').focus();
    await expect(card.locator('a[href="/annonce/list-113"]')).toBeFocused();
    await card.locator('a[href="/annonce/list-113"]').press("Enter");
    await expect(page).toHaveURL(/\/annonce\/list-113$/);
  });

  test("truncates long fields without shrinking the shared typography", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/recherche");
    const card = page
      .locator('[data-listing-card="true"]', {
        has: page.locator('a[href="/annonce/list-113"]'),
      })
      .first();
    await card.scrollIntoViewIfNeeded();

    for (const target of [
      card.locator('[data-listing-card-title="true"]'),
      card.locator('[data-listing-card-location="true"]'),
    ]) {
      const style = await target.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          overflow: computed.overflow,
          textOverflow: computed.textOverflow,
          whiteSpace: computed.whiteSpace,
          fontSize: Number.parseFloat(computed.fontSize),
        };
      });
      expect(style).toMatchObject({
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      });
      expect(style.fontSize).toBeGreaterThanOrEqual(11);
    }
  });

  test("homepage discovery fits five complete token-width cards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/");
    const rail = page
      .locator(".listing-rail-track")
      .filter({ has: page.locator('[data-listing-card-variant="showcase"]') })
      .first();
    await rail.scrollIntoViewIfNeeded();
    await expect(rail).toBeVisible();

    const geometry = await rail.evaluate((element) => {
      const viewport = element.parentElement?.getBoundingClientRect();
      const cards = Array.from(
        element.querySelectorAll<HTMLElement>(":scope > .listing-rail-cell"),
      ).map((item) => item.getBoundingClientRect());
      return {
        complete: viewport
          ? cards.filter(
              (card) =>
                card.left >= viewport.left - 1 &&
                card.right <= viewport.right + 1,
            ).length
          : 0,
        firstWidth: cards[0]?.width,
        firstHeight: cards[0]?.height,
      };
    });
    expect(geometry.complete).toBeGreaterThanOrEqual(5);
    expect(geometry.firstWidth).toBeCloseTo(208, 0);
    expect(geometry.firstHeight).toBeCloseTo(368, 0);
  });

  test("structured searches reuse the primitive at phone, tablet and desktop widths", async ({
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
          const card = page
            .locator(`[data-listing-card-consumer="${category.consumer}"]`)
            .first()
            .locator(':scope > [data-listing-card="true"]');
          await expect(card).toHaveAttribute(
            "data-listing-card-variant",
            "grid",
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
