import { expect, test, type Page } from "@playwright/test";
import { useEstablishedConsent, usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

async function selectFeaturedHeroListing(page: Page) {
  const activeSlide = page.locator(
    '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
  );
  const total = Number(
    (await activeSlide.getAttribute("aria-label"))?.split("/")[1],
  );
  expect(total).toBeGreaterThan(0);
  for (let index = 0; index < total; index += 1) {
    if (await activeSlide.locator('[data-listing-badge="featured"]').count())
      break;
    const previous = await activeSlide.getAttribute("aria-label");
    await page.locator("#hero-boosted-track").press("ArrowRight");
    await expect(activeSlide).not.toHaveAttribute("aria-label", previous!);
  }
  return activeSlide;
}

test.describe("boosted listings hero rail", () => {
  test.beforeEach(async ({ page }) => {
    await useEstablishedConsent(page);
  });

  test("uses the listing-card radius token for every hero card surface", async ({
    page,
  }) => {
    await usePersona(page, "guest");

    for (const viewport of [
      { width: 2048, height: 1200 },
      { width: 1408, height: 701 },
      { width: 768, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const heroSurface = page.locator('[data-home-hero-surface="true"]');
      const boostedSurface = page.locator('[data-home-boosted-surface="true"]');
      const listingCard = page
        .locator(
          '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
        )
        .locator('[data-listing-card="true"]');
      await expect(heroSurface).toHaveClass(/rounded-listing-card/);
      await expect(boostedSurface).toHaveClass(/rounded-listing-card/);
      await expect(listingCard).toBeVisible();

      const radii = await page.evaluate(() => {
        const hero = document.querySelector<HTMLElement>(
          '[data-home-hero-surface="true"]',
        );
        const boosted = document.querySelector<HTMLElement>(
          '[data-home-boosted-surface="true"]',
        );
        const listing = document.querySelector<HTMLElement>(
          '#hero-boosted-track [data-listing-card="true"]',
        );
        const tokenProbe = document.createElement("div");
        tokenProbe.style.borderRadius = "var(--radius-listing-card)";
        document.body.appendChild(tokenProbe);
        const listingCardToken = getComputedStyle(tokenProbe).borderRadius;
        tokenProbe.remove();

        return {
          listingCardToken,
          hero: hero ? getComputedStyle(hero).borderRadius : null,
          boosted: boosted ? getComputedStyle(boosted).borderRadius : null,
          listing: listing ? getComputedStyle(listing).borderRadius : null,
        };
      });

      expect(radii.listingCardToken).not.toBe("");
      expect(radii.hero).toBe(radii.listingCardToken);
      expect(radii.boosted).toBe(radii.listingCardToken);
      expect(radii.listing).toBe(radii.listingCardToken);
      await expectNoHorizontalOverflow(
        page,
        `tokenized hero surfaces at ${viewport.width}px`,
      );
    }
  });

  test("renders the shared hero listing horizontally and fills its desktop column", async ({
    page,
  }) => {
    await usePersona(page, "guest");

    for (const viewport of [
      { width: 2048, height: 1200 },
      { width: 1408, height: 701 },
      { width: 768, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const card = page
        .locator(
          '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
        )
        .locator('[data-listing-card="true"]');
      const carousel = page.locator('[data-home-boosted-carousel="true"]');
      const media = card.locator('[data-listing-card-media="true"]');
      const content = card.locator('[data-listing-card-content="true"]');

      await expect(card).toHaveAttribute("data-listing-card-variant", "hero");
      await expect(card).toBeVisible();
      await expect(media).toBeVisible();
      await expect(content).toBeVisible();

      const geometry = await Promise.all([
        card.boundingBox(),
        carousel.boundingBox(),
        media.boundingBox(),
        content.boundingBox(),
      ]);
      const [cardBox, carouselBox, mediaBox, contentBox] = geometry;
      expect(cardBox).not.toBeNull();
      expect(carouselBox).not.toBeNull();
      expect(mediaBox).not.toBeNull();
      expect(contentBox).not.toBeNull();
      expect(cardBox!.width).toBeGreaterThan(cardBox!.height);
      expect(mediaBox!.x + mediaBox!.width).toBeLessThanOrEqual(
        contentBox!.x + 1,
      );
      expect(Math.abs(mediaBox!.height - contentBox!.height)).toBeLessThan(2);
      if (viewport.width >= 1024) {
        expect(cardBox!.height).toBeGreaterThan(250);
        expect(Math.abs(cardBox!.height - carouselBox!.height)).toBeLessThan(2);
      }
      if (viewport.width >= 1536) {
        expect(cardBox!.width).toBeGreaterThan(600);
        expect(cardBox!.height).toBeLessThan(320);
        const surface = await page
          .locator('[data-home-hero-surface="true"]')
          .boundingBox();
        expect(surface!.width).toBeLessThanOrEqual(1536);
        expect(surface!.height).toBeLessThan(440);
      }
      if (viewport.width >= 768) {
        expect(contentBox!.width).toBeGreaterThan(240);
      }
      await expectNoHorizontalOverflow(
        page,
        `horizontal hero listing at ${viewport.width}px`,
      );
    }
  });

  test("shows available decision attributes and seller identity in the desktop hero", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 701 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();

    const activeSlide = page.locator(
      '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
    );
    const nextButton = page.getByRole("button", { name: "Annonce suivante" });
    const total = await page
      .locator('[data-hero-carousel-indicators="true"] > span')
      .count();
    let foundCharacteristics = false;

    for (let index = 0; index < total; index += 1) {
      const card = activeSlide.locator('[data-listing-card="true"]');
      const characteristics = card.locator(
        '[data-listing-card-characteristics="true"]',
      );
      if ((await characteristics.count()) > 0) {
        foundCharacteristics = true;
        await expect(characteristics).toBeVisible();
        expect(
          await characteristics.locator("span[title]").allTextContents(),
        ).not.toEqual([]);
        break;
      }

      const currentLabel = await activeSlide.getAttribute("aria-label");
      await nextButton.click();
      await expect
        .poll(() => activeSlide.getAttribute("aria-label"))
        .not.toBe(currentLabel);
    }

    expect(foundCharacteristics).toBe(true);
    const cardWithCharacteristics = activeSlide.locator(
      '[data-listing-card="true"]',
    );
    const seller = cardWithCharacteristics.locator(
      '[data-listing-card-seller-identity="true"]',
    );
    await expect(seller).toBeVisible();
    await expect(seller).not.toBeEmpty();
    await expect(
      cardWithCharacteristics.locator(
        '[data-listing-card-seller-avatar="true"]',
      ),
    ).toBeVisible();
  });

  test("keeps every category on one fixed, evenly distributed hero footprint", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 701 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();

    const rail = page.locator("#hero-boosted-track");
    const total = await page
      .locator('[data-hero-carousel-indicators="true"] > span')
      .count();
    const measurements: Array<{
      height: number;
      contentScrollHeight: number;
      contentClientHeight: number;
      categoryTop: number;
      sellerBottom: number;
    }> = [];

    for (let index = 0; index < total; index += 1) {
      await rail.evaluate((element, targetIndex) => {
        element.scrollLeft = element.clientWidth * targetIndex;
      }, index);
      const card = rail
        .locator(
          `[data-hero-listing-slide="true"][aria-label="${index + 1} / ${total}"]`,
        )
        .locator('[data-listing-card="true"]');
      await expect(card).toBeVisible();
      measurements.push(
        await card.evaluate((element) => {
          const cardBox = element.getBoundingClientRect();
          const content = element.querySelector<HTMLElement>(
            '[data-listing-card-content="true"]',
          )!;
          const category = element.querySelector<HTMLElement>(
            '[data-listing-card-category-row="true"]',
          )!;
          const seller = element.querySelector<HTMLElement>(
            '[data-listing-card-seller-identity="true"]',
          )!;
          return {
            height: cardBox.height,
            contentScrollHeight: content.scrollHeight,
            contentClientHeight: content.clientHeight,
            categoryTop: category.getBoundingClientRect().top - cardBox.top,
            sellerBottom: seller.getBoundingClientRect().bottom - cardBox.top,
          };
        }),
      );
    }

    const tokenHeight = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.height = "var(--spacing-listing-card-hero-height)";
      document.body.appendChild(probe);
      const height = probe.getBoundingClientRect().height;
      probe.remove();
      return height;
    });
    const heights = measurements.map(({ height }) => height);
    const nextButton = page.getByRole("button", { name: "Annonce suivante" });
    const activeCharacteristics = rail
      .locator(
        '[data-hero-listing-slide="true"][aria-hidden="false"] [data-listing-card-characteristics="true"]',
      )
      .first();

    expect(tokenHeight).toBeGreaterThan(0);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
    for (const measurement of measurements) {
      expect(measurement.height).toBeCloseTo(tokenHeight, 0);
      expect(measurement.contentScrollHeight).toBeLessThanOrEqual(
        measurement.contentClientHeight,
      );
      expect(measurement.categoryTop).toBeCloseTo(
        measurements[0]!.categoryTop,
        0,
      );
      expect(measurement.sellerBottom).toBeCloseTo(
        measurements[0]!.sellerBottom,
        0,
      );
    }

    if ((await activeCharacteristics.count()) > 0) {
      const [nextBox, characteristicsBox] = await Promise.all([
        nextButton.boundingBox(),
        activeCharacteristics.boundingBox(),
      ]);
      expect(nextBox).not.toBeNull();
      expect(characteristicsBox).not.toBeNull();
      expect(
        characteristicsBox!.x + characteristicsBox!.width,
      ).toBeLessThanOrEqual(nextBox!.x);
    }
  });

  test("fills the hero rail with real listing media when image-rich inventory is available", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 701 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const rail = page.locator("#hero-boosted-track");
    const indicators = page.locator(
      '[data-hero-carousel-indicators="true"] > span',
    );
    const total = await indicators.count();
    expect(total).toBeGreaterThan(0);

    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();

    for (let index = 0; index < total; index += 1) {
      await rail.evaluate((element, targetIndex) => {
        element.scrollLeft = element.clientWidth * targetIndex;
      }, index);

      const activeSlide = rail.locator(
        `[data-hero-listing-slide="true"][aria-label="${index + 1} / ${total}"]`,
      );
      await expect(activeSlide).toHaveAttribute("aria-hidden", "false");
      const image = activeSlide.locator('[data-listing-card-media="true"] img');
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) =>
              element instanceof HTMLImageElement &&
              element.complete &&
              element.naturalWidth > 0,
          ),
        )
        .toBe(true);
    }

    await expectNoHorizontalOverflow(page, "media-rich hero rail");
  });

  test("keeps pause and favorite controls visible, separate, and independently clickable", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");

    for (const viewport of [
      { width: 1408, height: 701 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const pause = page.getByRole("button", {
        name: "Mettre le carrousel en pause",
      });
      await expect(pause).toBeVisible();
      const pauseBox = await pause.boundingBox();
      expect(pauseBox).not.toBeNull();
      await pause.click();
      await expect(
        page.getByRole("button", { name: "Relancer le carrousel" }),
      ).toBeVisible();

      const favorite = page
        .locator(
          '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
        )
        .locator('button[data-marketplace-action="favorite.manage"]');
      const activeCard = page
        .locator(
          '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
        )
        .locator('[data-listing-card="true"]');
      const media = activeCard.locator('[data-listing-card-media="true"]');
      const metadata = activeCard.locator('[data-listing-card-meta="true"]');
      const indicators = page.locator('[data-hero-carousel-indicators="true"]');
      await expect(favorite).toBeVisible();

      const favoriteBox = await favorite.boundingBox();
      const mediaBox = await media.boundingBox();
      const metadataBox = await metadata.boundingBox();
      expect(favoriteBox).not.toBeNull();
      expect(mediaBox).not.toBeNull();
      expect(metadataBox).not.toBeNull();
      expect(pauseBox!.x).toBeGreaterThanOrEqual(
        mediaBox!.x + mediaBox!.width - 1,
      );
      const overlaps =
        pauseBox!.x < favoriteBox!.x + favoriteBox!.width &&
        pauseBox!.x + pauseBox!.width > favoriteBox!.x &&
        pauseBox!.y < favoriteBox!.y + favoriteBox!.height &&
        pauseBox!.y + pauseBox!.height > favoriteBox!.y;
      expect(overlaps).toBe(false);

      const overlapsMetadata =
        pauseBox!.x < metadataBox!.x + metadataBox!.width &&
        pauseBox!.x + pauseBox!.width > metadataBox!.x &&
        pauseBox!.y < metadataBox!.y + metadataBox!.height &&
        pauseBox!.y + pauseBox!.height > metadataBox!.y;
      expect(overlapsMetadata).toBe(false);

      if (viewport.width >= 640) {
        const indicatorsBox = await indicators.boundingBox();
        expect(indicatorsBox).not.toBeNull();
        expect(indicatorsBox!.x).toBeGreaterThanOrEqual(
          mediaBox!.x + mediaBox!.width - 1,
        );
        const indicatorsOverlapMetadata =
          indicatorsBox!.x < metadataBox!.x + metadataBox!.width &&
          indicatorsBox!.x + indicatorsBox!.width > metadataBox!.x &&
          indicatorsBox!.y < metadataBox!.y + metadataBox!.height &&
          indicatorsBox!.y + indicatorsBox!.height > metadataBox!.y;
        expect(indicatorsOverlapMetadata).toBe(false);
      }

      const favoriteIsTopTarget = await favorite.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const target = document.elementFromPoint(
          box.left + box.width / 2,
          box.top + box.height / 2,
        );
        return (
          target?.closest('[data-marketplace-action="favorite.manage"]') ===
          button
        );
      });
      expect(favoriteIsTopTarget).toBe(true);

      const wasFavorite = await favorite.getAttribute("aria-pressed");
      await favorite.click();
      await expect(favorite).not.toHaveAttribute("aria-pressed", wasFavorite!);
      await expect(page).toHaveURL(/\/$/);

      const listingLink = page
        .locator(
          '#hero-boosted-track [data-hero-listing-slide="true"][aria-hidden="false"]',
        )
        .locator('[data-listing-card="true"] > a');
      await expect(listingLink).toHaveCount(1);
      const href = await listingLink.getAttribute("href");
      expect(href).toMatch(/^\/(?!\/).+/);
      await listingLink.click();
      await expect(page).toHaveURL(
        new RegExp(`${href!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
      );
    }
  });

  test("marks a market-resolved featured placement with its own badge", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const rail = page.locator("#hero-boosted-track");
    await expect(rail).toBeVisible();
    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();
    const targetListing = await selectFeaturedHeroListing(page);
    await expect(
      targetListing.locator('[data-listing-card="true"]'),
    ).toHaveCount(1);
    await expect(
      targetListing.locator('[data-listing-badge="featured"]'),
    ).toContainText("À la une");
    // The featured placement carries the shared badge icon (`flame`), not a
    // star; the icon travels with the badge recipe in `@shongre/features`.
    await expect(
      targetListing.locator('[data-listing-badge="featured"] .lucide-flame'),
    ).toBeAttached();
    await expectNoHorizontalOverflow(page, "boosted hero rail");
  });

  test("discloses sponsored inventory before the organic hero sequence", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const slides = page.locator(
      '#hero-boosted-track [data-hero-listing-slide="true"]',
    );
    const ordering = await slides.evaluateAll((items) => {
      const sponsoredIndex = items.findIndex((item) =>
        item.querySelector('[data-listing-badge="sponsored"]'),
      );
      const firstOrganicIndex = items.findIndex(
        (item) => !item.querySelector("[data-listing-badge]"),
      );
      return { sponsoredIndex, firstOrganicIndex };
    });

    expect(ordering.sponsoredIndex).toBeGreaterThanOrEqual(0);
    if (ordering.firstOrganicIndex >= 0) {
      expect(ordering.sponsoredIndex).toBeLessThan(ordering.firstOrganicIndex);
    }
    await expect(
      slides
        .nth(ordering.sponsoredIndex)
        .locator('[data-listing-badge="sponsored"]'),
    ).toHaveText("Sponsorisé");
    await expectNoHorizontalOverflow(page, "sponsored boosted hero rail");
  });

  test("keeps the featured indicator available on a mobile hero viewport", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    await page
      .getByRole("button", { name: "Mettre le carrousel en pause" })
      .click();
    const targetListing = await selectFeaturedHeroListing(page);
    await expect(
      targetListing.locator('[data-listing-badge="featured"]'),
    ).toContainText("À la une");
    await expectNoHorizontalOverflow(page, "mobile boosted hero rail");
  });

  test("pairs the compact hero with clear trust navigation", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 795 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const main = page.getByRole("main");
    const hero = main.locator('[data-home-hero="true"]');
    await expect(hero.locator('[data-home-hero-eyebrow="true"]')).toHaveCount(
      0,
    );
    const footer = page.getByRole("contentinfo");
    const trustLink = footer.getByRole("link", {
      name: /Sécurité et bonnes pratiques/,
    });
    await expect(
      main.getByRole("list", { name: "Garanties Shongre", exact: true }),
    ).toHaveCount(1);
    await expect(trustLink).toBeVisible();
    await expect(trustLink).toHaveAttribute("href", "/securite");
    await expect(footer.locator('a[href="/securite"]:visible')).toHaveCount(1);

    const trustBox = await trustLink.boundingBox();
    const heroSurfaceBox = await hero
      .locator('[data-home-hero-surface="true"]')
      .boundingBox();
    expect(trustBox).not.toBeNull();
    expect(heroSurfaceBox).not.toBeNull();
    // The link sits on the standard `md` control metric: 40px for a fine
    // pointer, 44px on touch — never the page-level 48px step.
    expect(trustBox!.height).toBeGreaterThanOrEqual(40);
    expect(trustBox!.height).toBeLessThanOrEqual(80);
    expect(heroSurfaceBox!.height).toBeGreaterThanOrEqual(320);
    expect(heroSurfaceBox!.height).toBeLessThan(440);

    await trustLink.click();
    await expect(page).toHaveURL(/\/securite$/);
    await expect(
      page.getByRole("heading", { name: /sécurité/i }),
    ).toBeVisible();
  });

  test("balances hero copy and featured listing after removing the eyebrow", async ({
    page,
  }) => {
    await usePersona(page, "guest");
    await page.setViewportSize({ width: 1408, height: 701 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const hero = page.locator('[data-home-hero="true"]');
    await expect(hero.locator('[data-home-hero-eyebrow="true"]')).toHaveCount(
      0,
    );
    const headlineBox = await hero
      .getByRole("heading", { level: 1 })
      .boundingBox();
    const publishBox = await hero
      .getByRole("link", { name: "Déposer une annonce" })
      .boundingBox();
    const featuredBox = await hero
      .locator('[data-home-boosted-surface="true"]')
      .boundingBox();
    expect(headlineBox).not.toBeNull();
    expect(publishBox).not.toBeNull();
    expect(featuredBox).not.toBeNull();

    const copyCenter =
      headlineBox!.y +
      (publishBox!.y + publishBox!.height - headlineBox!.y) / 2;
    const featuredCenter = featuredBox!.y + featuredBox!.height / 2;
    expect(Math.abs(copyCenter - featuredCenter)).toBeLessThanOrEqual(12);
    await expectNoHorizontalOverflow(page, "balanced hero");
  });
});
