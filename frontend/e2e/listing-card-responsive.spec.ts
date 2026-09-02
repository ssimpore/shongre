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

  test("keeps the seller identity complete in the compact card footer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await usePersona(page, "individual_buyer");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const card = page
      .locator('[data-listing-card="true"]', { hasText: "Thomas Laurent" })
      .first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const geometry = await card.evaluate((element) => {
      const cardRect = element.getBoundingClientRect();
      const titleRect = element.querySelector("h3")?.getBoundingClientRect();
      const sellerRow = element.querySelector<HTMLElement>(
        '[data-listing-card-seller="true"]',
      );
      const sellerName = sellerRow?.querySelector<HTMLElement>(
        '[title="Thomas Laurent"]',
      );
      const sellerVerified = sellerRow?.querySelector<HTMLElement>(
        '[data-listing-card-seller-verified="true"]',
      );
      const sellerRect = sellerRow?.getBoundingClientRect();
      const sellerNameRect = sellerName?.getBoundingClientRect();
      const sellerVerifiedRect = sellerVerified?.getBoundingClientRect();
      const sellerAvatar = Array.from(
        element.querySelectorAll<HTMLElement>(
          '[data-listing-card-seller-avatar="true"]',
        ),
      ).find((avatar) => avatar.getClientRects().length > 0);
      const sellerAvatarRect = sellerAvatar?.getBoundingClientRect();
      const sellerAvatarImage = sellerAvatar?.querySelector("img");
      const footerRect = element
        .querySelector<HTMLElement>('[data-listing-card-footer="true"]')
        ?.getBoundingClientRect();

      return {
        card: { width: cardRect.width, height: cardRect.height },
        sellerBelowTitle: Boolean(
          sellerRect && titleRect && sellerRect.top > titleRect.bottom,
        ),
        sellerFullyVisible: Boolean(
          sellerName && sellerName.scrollWidth <= sellerName.clientWidth + 1,
        ),
        sellerAvatarVisible: Boolean(
          sellerAvatarRect?.width && sellerAvatarRect.height,
        ),
        sellerAvatarHasPhoto: Boolean(sellerAvatarImage?.getAttribute("src")),
        verifiedFollowsName: Boolean(
          sellerNameRect &&
          sellerVerifiedRect &&
          sellerVerifiedRect.left >= sellerNameRect.right &&
          sellerVerifiedRect.left - sellerNameRect.right <= 8,
        ),
        footerContained: Boolean(
          footerRect && footerRect.bottom <= cardRect.bottom + 1,
        ),
      };
    });

    expect(geometry.card.width).toBeCloseTo(208, 0);
    expect(geometry.card.height).toBeGreaterThanOrEqual(368);
    expect(geometry.card.height).toBeLessThanOrEqual(397);
    expect(geometry.sellerBelowTitle).toBe(true);
    expect(geometry.sellerFullyVisible).toBe(true);
    expect(geometry.sellerAvatarVisible).toBe(true);
    expect(geometry.sellerAvatarHasPhoto).toBe(true);
    expect(geometry.verifiedFollowsName).toBe(true);
    expect(geometry.footerContained).toBe(true);

    const verificationShield = card
      .locator('[data-listing-card-seller="true"]')
      .locator('[data-listing-card-seller-verified="true"]');
    await expect(verificationShield.locator("svg")).toHaveClass(
      /lucide-shield-check/,
    );

    const professionalCard = page
      .locator('[data-listing-card="true"]', { hasText: "Atelier Nordique" })
      .first();
    await professionalCard.scrollIntoViewIfNeeded();
    await expect(
      professionalCard
        .locator("span:visible")
        .filter({ hasText: /^Pro$/ })
        .first(),
    ).toBeVisible();
    await expect(
      professionalCard.locator('[data-listing-card-seller-verified="true"]'),
    ).toHaveCount(0);
  });

  test("keeps promoted-card overlays, rail controls and content zones visibly separated", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await usePersona(page, "individual_buyer");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const card = page
      .locator('[data-listing-card="true"]')
      .filter({
        has: page.locator('[data-listing-card-promotion="true"]'),
      })
      .first();
    await expect(card).toBeAttached();
    await card.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - (window.innerHeight - rect.height) / 2,
      });
    });
    await expect(card).toBeVisible();

    const geometry = await card.evaluate((element) => {
      const rectFor = (selector: string) => {
        const node = element.querySelector<HTMLElement>(selector);
        if (!node || node.getClientRects().length === 0) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          clientWidth: node.clientWidth,
          scrollWidth: node.scrollWidth,
        };
      };
      const media = rectFor('[data-listing-card-media="true"]');
      const promotion = rectFor('[data-listing-card-promotion="true"] > span');
      const promotionText = rectFor(
        '[data-listing-card-promotion="true"] > span > span',
      );
      const actions = rectFor('[data-listing-card-actions="true"]');
      const railShell = element.closest<HTMLElement>(".scroll-rail-shell");
      const visibleRailControl = railShell
        ? Array.from(
            railShell.querySelectorAll<HTMLElement>(".listing-rail-control"),
          ).find((control) => control.getClientRects().length > 0)
        : undefined;
      const railControlRect = visibleRailControl?.getBoundingClientRect();
      const cardRect = element.getBoundingClientRect();
      const orderedContent = [
        '[data-listing-card-category-row="true"]',
        "h3",
        '[data-listing-card-price="true"]',
        'ul[aria-label="Caractéristiques principales"]',
        '[data-listing-card-footer="true"]',
      ]
        .map(rectFor)
        .filter((rect): rect is NonNullable<typeof rect> => Boolean(rect));

      return {
        promotionFits: Boolean(
          promotionText &&
          promotionText.scrollWidth <= promotionText.clientWidth + 1,
        ),
        overlayColumnsSeparated: Boolean(
          promotion && actions && promotion.right + 7 <= actions.left,
        ),
        overlaysStayOnMedia: Boolean(
          media &&
          promotion &&
          actions &&
          promotion.left >= media.left &&
          actions.right <= media.right &&
          promotion.top >= media.top &&
          actions.bottom <= media.bottom,
        ),
        railControlCenteredOnCard: Boolean(
          railControlRect &&
          Math.abs(
            (railControlRect.top + railControlRect.bottom) / 2 -
              (cardRect.top + cardRect.bottom) / 2,
          ) <= 8,
        ),
        contentZonesSeparated: orderedContent.every(
          (rect, index) =>
            index === 0 ||
            rect.top >= (orderedContent[index - 1]?.bottom ?? rect.top) - 0.5,
        ),
      };
    });

    expect(geometry.promotionFits).toBe(true);
    expect(geometry.overlayColumnsSeparated).toBe(true);
    expect(geometry.overlaysStayOnMedia).toBe(true);
    expect(geometry.railControlCenteredOnCard).toBe(true);
    expect(geometry.contentZonesSeparated).toBe(true);

    const railShell = card.locator(
      "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' scroll-rail-shell ')]",
    );
    const track = railShell.locator(":scope > div").first();
    const rightControl = railShell.getByRole("button", {
      name: /vers la droite$/,
    });
    const initialScrollLeft = await track.evaluate((element) =>
      Math.round(element.scrollLeft),
    );
    await rightControl.click();
    await expect
      .poll(() =>
        track.evaluate((element) => Math.round(element.scrollLeft)),
      )
      .toBeGreaterThan(initialScrollLeft);
    await expect(
      railShell.getByRole("button", { name: /vers la gauche$/ }),
    ).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".listing-rail-control:visible")).toHaveCount(0);
  });

  test("places delivery at the image bottom-right and keeps it out of the footer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await openAsGuest(page, "/");

    const card = page
      .locator('[data-listing-card="true"]', {
        hasText: "Machine à Café Espresso avec Broyeur",
      })
      .first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const delivery = card.locator(
      '[data-listing-card-delivery-overlay="true"]',
    );
    await expect(delivery).toBeVisible();
    await expect(delivery).toHaveText(/Livraison/);
    await expect(
      card.locator(
        '[data-listing-card-footer="true"] [data-listing-card-delivery-overlay="true"]',
      ),
    ).toHaveCount(0);

    const geometry = await card.evaluate((element) => {
      const media = element
        .querySelector<HTMLElement>('[data-listing-card-media="true"]')
        ?.getBoundingClientRect();
      const deliveryOverlay = element
        .querySelector<HTMLElement>(
          '[data-listing-card-delivery-overlay="true"]',
        )
        ?.getBoundingClientRect();
      const favorite = element
        .querySelector<HTMLElement>(
          '[data-marketplace-action="favorite.manage"]',
        )
        ?.getBoundingClientRect();

      return {
        insideMedia: Boolean(
          media &&
          deliveryOverlay &&
          deliveryOverlay.left >= media.left &&
          deliveryOverlay.right <= media.right &&
          deliveryOverlay.top >= media.top &&
          deliveryOverlay.bottom <= media.bottom,
        ),
        alignedBottomRight: Boolean(
          media &&
          deliveryOverlay &&
          media.right - deliveryOverlay.right <= 13 &&
          media.bottom - deliveryOverlay.bottom <= 13,
        ),
        clearOfFavorite: Boolean(
          deliveryOverlay && favorite && deliveryOverlay.top > favorite.bottom,
        ),
      };
    });

    expect(geometry.insideMedia).toBe(true);
    expect(geometry.alignedBottomRight).toBe(true);
    expect(geometry.clearOfFavorite).toBe(true);
  });

  test("keeps condition on the listing detail instead of the compact card", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await openAsGuest(page, "/");

    const card = page
      .locator('[data-listing-card="true"]', {
        hasText: "Machine à Café Espresso avec Broyeur",
      })
      .first();
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card.getByText("Très bon état", { exact: true })).toHaveCount(
      0,
    );

    await card.locator('a[href="/annonce/list-109"]').click();
    await expect(page).toHaveURL(/\/annonce\/list-109$/);
    const conditionDetail = page
      .getByText("État général", { exact: true })
      .locator("..");
    await expect(conditionDetail).toBeVisible();
    await expect(
      conditionDetail.getByText("Très bon état", { exact: true }),
    ).toBeVisible();
  });

  test("shows two category-prioritized characteristics and preserves full details", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 701 });
    await openAsGuest(page, "/");

    const recentTab = page.getByRole("tab", { name: "Annonces récentes" });
    await recentTab.click();
    await expect(recentTab).toHaveAttribute("aria-selected", "true");

    const visibleCards = page.locator(
      '#home-discovery-panel [data-listing-card="true"]',
    );
    await expect(visibleCards.first()).toBeVisible();
    const characteristicCounts = await visibleCards.evaluateAll((cards) =>
      cards.map(
        (card) =>
          card.querySelectorAll(
            'ul[aria-label="Caractéristiques principales"] > li',
          ).length,
      ),
    );
    expect(characteristicCounts.length).toBeGreaterThan(3);
    expect(characteristicCounts.every((count) => count <= 2)).toBe(true);

    const employmentCard = visibleCards
      .filter({ hasText: "Équipier·ère polyvalent·e saisonnier" })
      .first();
    await expect(
      employmentCard.locator(
        'ul[aria-label="Caractéristiques principales"] > li',
      ),
    ).toHaveText(["Seasonal", "Onsite"]);

    const propertyCard = visibleCards
      .filter({ hasText: "Appartement lumineux avec balcon" })
      .first();
    await expect(
      propertyCard.locator(
        'ul[aria-label="Caractéristiques principales"] > li',
      ),
    ).toHaveText(["Appartement", "92 m²"]);

    await propertyCard
      .locator('a[href="/immo/bien/appartement-lumineux-lyon-montchat"]')
      .click();
    await expect(page).toHaveURL(
      /\/immo\/bien\/appartement-lumineux-lyon-montchat$/,
    );
    await expect(
      page.getByText("Surface", { exact: true }).locator(".."),
    ).toContainText("92 m²");
    await expect(
      page.getByText("Pièces", { exact: true }).locator(".."),
    ).toContainText("4");
    await expect(
      page.getByText("Chambres", { exact: true }).locator(".."),
    ).toContainText("3");
  });

  test("homepage discovery fits five complete compact cards in a desktop row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1408, height: 900 });
    await openAsGuest(page, "/");

    const discoveryRails = page.locator(".listing-rail-track").filter({
      has: page.locator('[data-listing-card-variant="grid"]'),
    });
    let denseRailIndex = -1;
    await expect
      .poll(
        async () => {
          denseRailIndex = await discoveryRails.evaluateAll((rails) =>
            rails.findIndex(
              (rail) =>
                rail.querySelectorAll(":scope > .listing-rail-cell").length >=
                5,
            ),
          );
          return denseRailIndex;
        },
        {
          message:
            "homepage should expose a discovery rail with at least five listings",
        },
      )
      .toBeGreaterThanOrEqual(0);
    const denseRail = discoveryRails.nth(denseRailIndex);
    await expect(denseRail).toBeVisible();
    const geometry = await denseRail.evaluate((rail) => {
      const viewport = rail.parentElement;
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

    expect(
      geometry.completeCards,
      `homepage rail geometry: ${JSON.stringify(geometry)}`,
    ).toBeGreaterThanOrEqual(5);
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
