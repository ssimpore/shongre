import { testListingPath } from "./fixtures";
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
    geometry.variant === "list" || geometry.variant === "hero"
      ? geometry.viewportWidth
      : 304,
  );
  expect(geometry.height, `${label}: height`).toBeLessThanOrEqual(520);
  expect(geometry.controlsContained, `${label}: controls`).toBe(true);
  if (geometry.variant !== "list" && geometry.width <= 210) {
    expect(geometry.mediaRatio, `${label}: portrait media`).toBeCloseTo(0.8, 1);
  }
  if (geometry.variant === "grid" || geometry.variant === "showcase") {
    const title = card.locator('[data-listing-card-title="true"]');
    const textGeometry = await title.evaluate((element) => ({
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      bottom: element.getBoundingClientRect().bottom,
    }));
    const meta = await card
      .locator('[data-listing-card-meta="true"]')
      .boundingBox();
    expect(
      textGeometry.scrollHeight,
      `${label}: complete title`,
    ).toBeLessThanOrEqual(textGeometry.clientHeight + 1);
    expect(
      textGeometry.bottom,
      `${label}: title above metadata`,
    ).toBeLessThanOrEqual(meta!.y + 1);
  }
}

async function openAsGuest(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await waitForStableLayout(page);
}

test.beforeEach(async ({ page }) => {
  await useEstablishedConsent(page);
});

test.describe("canonical listing cards", () => {
  for (const width of [1408, 390]) {
    test(`online payment uses an accessible payment-card glyph at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await openAsGuest(page, "/");
      await expect(page).toHaveTitle(/Shongre/i);
      const card = page
        .locator('[data-listing-card="true"]')
        .filter({
          has: page.locator('[data-listing-capability="online_payment"]'),
        })
        .first();
      await card.scrollIntoViewIfNeeded();
      const payment = card.locator(
        '[data-listing-capability="online_payment"]',
      );
      await expect(payment).toHaveText("Paiement en ligne");
      await expect(payment).toHaveAttribute("title", "Paiement en ligne");
      await expect(payment.locator("svg.lucide-credit-card")).toBeVisible();
      await expect(payment.locator("svg.lucide-credit-card")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      await expect(payment.locator("svg.lucide-shield-check")).toHaveCount(0);
      await expectNoHorizontalOverflow(page, `payment icon @ ${width}px`);
      const title = await card
        .locator('[data-listing-card-title="true"]')
        .innerText();
      const link = card.getByRole("link").first();
      const destination = new URL(
        (await link.getAttribute("href"))!,
        page.url(),
      );
      await link.click();
      await expect(page).toHaveURL(destination.href);
      await expect(
        page.getByRole("heading", { level: 1, name: title, exact: true }),
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

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
        has: page.locator(`a[href="${testListingPath("list-113")}"]`),
      })
      .first();
    await branded.scrollIntoViewIfNeeded();
    await expect(branded).toBeVisible();
    await expect(
      branded.locator('[data-listing-card-category-row="true"]'),
    ).toHaveText("Bébé & Famille·Cybex");
    await expect(branded.locator('[data-ui-pro-badge="true"]')).toHaveCount(0);
    const verificationBadge = branded.locator(
      '[data-listing-card-price-row="true"] [data-ui-verification-badge="true"]',
    );
    await expect(verificationBadge).toHaveText("Vérifié");
    await expect(verificationBadge).toHaveAttribute(
      "aria-label",
      "Vendeur vérifié",
    );
    await expect(verificationBadge).toContainClass("text-overline");
    await expect(
      branded.locator(
        '[data-listing-card-media="true"] [data-ui-verification-badge="true"]',
      ),
    ).toHaveCount(0);
    await expect(
      branded.locator('[data-listing-card-rating="true"]'),
    ).toContainText("5,0");
    await expect(branded.locator("svg.lucide-star")).toHaveCount(1);
    await expect(
      branded.locator('[data-listing-card-capabilities="true"]'),
    ).toBeVisible();
    await expect(
      branded.locator('[data-listing-capability="online_payment"]'),
    ).toHaveAttribute("aria-label", "Paiement en ligne");
    await expect(
      branded.locator(
        '[data-listing-capability="online_payment"] svg.lucide-credit-card',
      ),
    ).toBeVisible();
    await expect(
      branded.locator(
        '[data-listing-capability="online_payment"] svg.lucide-shield-check',
      ),
    ).toHaveCount(0);
    await expect(
      branded.locator('[data-listing-capability="delivery"]'),
    ).toHaveAttribute("aria-label", "Livraison");
    await expect(
      branded.locator('[data-listing-capability="negotiable"]'),
    ).toHaveAttribute("aria-label", "Négociable");

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
        has: page.locator(`a[href="${testListingPath("list-115")}"]`),
      })
      .first();
    await professional.scrollIntoViewIfNeeded();
    await expect(professional.locator('[data-ui-pro-badge="true"]')).toHaveText(
      "Pro",
    );
    await expect(
      professional.locator('[data-ui-verification-badge="true"]'),
    ).toHaveCount(0);
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
      '[data-listing-card-delivery-overlay="true"]',
      '[data-listing-card-seller-avatar="true"]',
      '[data-listing-card-original-price="true"]',
      '[data-listing-card-negotiable="true"]',
    ]) {
      await expect(page.locator(selector)).toHaveCount(0);
    }
  });

  test("expands capabilities in list mode and carries them into listing detail", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/recherche?view=list");

    const card = page
      .locator('[data-listing-card="true"]', {
        has: page.locator(`a[href="${testListingPath("list-113")}"]`),
      })
      .first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveAttribute("data-listing-card-variant", "list");
    const capabilities = card.locator(
      '[data-listing-card-capabilities="true"]',
    );
    await expect(capabilities).toContainText("Paiement en ligne");
    await expect(capabilities).toContainText("Livraison");
    await expect(capabilities).toContainText("Négociable");
    await expect(
      capabilities.locator('[data-ui-verification-badge="true"]'),
    ).toHaveCount(0);
    await expect(
      card.locator(
        '[data-listing-card-price-row="true"] [data-ui-verification-badge="true"]',
      ),
    ).toHaveText("Vérifié");
    await expectCardContentContained(card, "generic list capability card");

    await card.locator(`a[href="${testListingPath("list-113")}"]`).click();
    await expect(page).toHaveURL(new RegExp(`${testListingPath("list-113")}$`));
    const detailCapabilities = page.getByTestId("listing-detail-capabilities");
    await expect(detailCapabilities).toBeVisible();
    await expect(detailCapabilities).toContainText("Paiement en ligne");
    await expect(detailCapabilities).toContainText("Livraison");
    await expect(detailCapabilities).toContainText("Négociable");
    await expect(detailCapabilities).toContainText("Vendeur vérifié");
    await expect(
      detailCapabilities.locator('[data-ui-verification-badge="true"]'),
    ).toHaveCount(1);
    await expect(detailCapabilities).toContainText("Note 5,0 · 42 avis");
    await expect(detailCapabilities).toContainText("1 photo");
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
        has: page.locator(`a[href="${testListingPath("list-113")}"]`),
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
        has: page.locator(`a[href="${testListingPath("list-113")}"]`),
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

    await card.locator(`a[href="${testListingPath("list-113")}"]`).focus();
    await expect(
      card.locator(`a[href="${testListingPath("list-113")}"]`),
    ).toBeFocused();
    await card
      .locator(`a[href="${testListingPath("list-113")}"]`)
      .press("Enter");
    await expect(page).toHaveURL(new RegExp(`${testListingPath("list-113")}$`));
  });

  test("wraps the full compact title while safely truncating secondary fields", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/");
    const card = page
      .locator('[data-listing-card="true"]', {
        has: page.locator(".listing-card-title-vertical"),
      })
      .first();
    await card.scrollIntoViewIfNeeded();

    const title = card.locator('[data-listing-card-title="true"]');
    const titleStyle = await title.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        overflow: computed.overflow,
        lineClamp: computed.webkitLineClamp,
        fontSize: Number.parseFloat(computed.fontSize),
        lineHeight: Number.parseFloat(computed.lineHeight),
        renderedLines: Math.round(
          element.getBoundingClientRect().height /
            Number.parseFloat(computed.lineHeight),
        ),
      };
    });
    expect(titleStyle).toMatchObject({
      overflow: "visible",
      lineClamp: "none",
      fontSize: 13,
    });
    expect(titleStyle.renderedLines).toBeGreaterThanOrEqual(2);

    const price = card.locator('[data-listing-card-current-price="true"]');
    await expect(price).toHaveCSS("font-size", "16px");
    await expect(price).not.toHaveCSS("text-overflow", "ellipsis");

    const locationStyle = await card
      .locator('[data-listing-card-location="true"]')
      .evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          overflow: computed.overflow,
          textOverflow: computed.textOverflow,
          whiteSpace: computed.whiteSpace,
          fontSize: Number.parseFloat(computed.fontSize),
        };
      });
    expect(locationStyle).toMatchObject({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    expect(locationStyle.fontSize).toBeGreaterThanOrEqual(11);
    await expectCardContentContained(card, "full vertical title");
  });

  test("homepage discovery keeps available token-width cards aligned", async ({
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
    await waitForStableLayout(page);

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
        heights: cards.map((card) => card.height),
      };
    });
    expect(geometry.heights.length).toBeGreaterThan(0);
    expect(geometry.complete).toBeGreaterThanOrEqual(
      Math.min(5, geometry.heights.length),
    );
    expect(geometry.firstWidth).toBeCloseTo(208, 0);
    for (const height of geometry.heights) {
      expect(height).toBeGreaterThanOrEqual(368);
      expect(height).toBeCloseTo(geometry.heights[0], 0);
    }
  });

  test("structured searches reuse the primitive at phone, tablet and desktop widths", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const categories = [
      { path: "/immo", consumer: "real-estate", variant: "list" },
      { path: "/auto", consumer: "auto", variant: "grid" },
      { path: "/emploi", consumer: "employment", variant: "grid" },
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
            category.variant,
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
