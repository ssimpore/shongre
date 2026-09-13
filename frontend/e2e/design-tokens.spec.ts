import { testListingPath } from "./fixtures";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { colors as semanticColors } from "@shongre/design-tokens";
import { usePersona } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { ALL_ROUTES } from "./routes";
import { VIEWPORTS } from "./viewports";

const seedConsentDecision = async (page: Page) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "shongre_cookie_consent_v1",
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { necessary: true, analytics: false, marketing: false },
      }),
    );
  });
};

const ROUTE_TYPOGRAPHY_AUDIT_CHUNKS = Array.from(
  { length: Math.ceil(ALL_ROUTES.length / 24) },
  (_, index) => ALL_ROUTES.slice(index * 24, (index + 1) * 24),
);

test.describe("design-token runtime contracts @serial", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1408, height: 749 });
    await usePersona(page, "guest");
    await seedConsentDecision(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
  });

  test("loads the current token sheet and keeps listing rails consistently sized", async ({
    page,
  }) => {
    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const cells = [
        ...document.querySelectorAll<HTMLElement>(".w-listing-card"),
      ];
      const widths = cells
        .slice(0, 6)
        .map((cell) => cell.getBoundingClientRect().width);
      const firstTrack = document.querySelector<HTMLElement>(
        ".listing-rail-track",
      );
      const firstScroller = firstTrack?.parentElement;
      const scrollerRect = firstScroller?.getBoundingClientRect();
      const firstTrackCells = firstTrack
        ? [...firstTrack.querySelectorAll<HTMLElement>(".listing-rail-cell")]
        : [];
      const fullyVisibleCards =
        firstTrack && scrollerRect
          ? firstTrackCells.filter((cell) => {
              const rect = cell.getBoundingClientRect();
              return (
                rect.left >= scrollerRect.left - 1 &&
                rect.right <= scrollerRect.right + 1
              );
            }).length
          : 0;

      return {
        version: root
          .getPropertyValue("--design-system-contract-version")
          .trim(),
        tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
        widths,
        firstTrackCardCount: firstTrackCells.length,
        fullyVisibleCards,
      };
    });

    expect(contract.version).toBe("5");
    expect(contract.tokenWidth).toBe("13.75rem");
    expect(contract.firstTrackCardCount).toBeGreaterThan(0);
    expect(contract.fullyVisibleCards).toBe(
      Math.min(5, contract.firstTrackCardCount),
    );
    expect(
      contract.widths.length,
      "the recent-listings rail did not render",
    ).toBeGreaterThanOrEqual(6);
    for (const width of contract.widths) {
      expect(width).toBeCloseTo(220, 0);
    }
  });

  test("keeps every standard listing rail cell and card on the shared width token", async ({
    page,
  }) => {
    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const cells = [
        ...document.querySelectorAll<HTMLElement>(".listing-rail-cell"),
      ];
      return {
        tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
        cells: cells.map((cell) => ({
          cell: cell.getBoundingClientRect().width,
          card:
            cell.querySelector<HTMLElement>("article")?.getBoundingClientRect()
              .width ?? null,
        })),
      };
    });

    expect(
      contract.cells.length,
      "no standard listing rails rendered",
    ).toBeGreaterThanOrEqual(6);
    expect(contract.tokenWidth).toBe("13.75rem");
    for (const item of contract.cells) {
      expect(item.cell).toBeCloseTo(220, 0);
      expect(item.card).toBeCloseTo(220, 0);
    }
  });

  test("packs available desktop search cards into shared dense columns", async ({
    page,
  }) => {
    await page.goto("/recherche", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    await expect(
      page.locator(".listing-grid article.listing-card-standard").nth(5),
    ).toBeAttached();

    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const grid = document.querySelector<HTMLElement>(".listing-grid");
      const card = grid?.querySelector<HTMLElement>("article");
      const gridStyle = grid ? getComputedStyle(grid) : null;
      const cardStyle = card ? getComputedStyle(card) : null;
      const cards = grid
        ? [
            ...grid.querySelectorAll<HTMLElement>(
              "article.listing-card-standard",
            ),
          ]
        : [];
      const firstTop = cards[0]?.getBoundingClientRect().top;
      const firstRow = cards.filter(
        (candidate) =>
          Math.abs(candidate.getBoundingClientRect().top - (firstTop ?? 0)) < 1,
      );
      const gridBounds = grid?.getBoundingClientRect();
      const firstBounds = firstRow[0]?.getBoundingClientRect();
      const lastBounds = firstRow.at(-1)?.getBoundingClientRect();
      return {
        tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
        gridMinWidth: root
          .getPropertyValue("--spacing-listing-card-grid-min")
          .trim(),
        tokenHeight: root
          .getPropertyValue("--spacing-listing-card-height")
          .trim(),
        gridColumns: gridStyle?.gridTemplateColumns ?? "",
        cardCount: cards.length,
        firstRowCount: firstRow.length,
        cardWidth: card?.getBoundingClientRect().width ?? null,
        cardHeight: card?.getBoundingClientRect().height ?? null,
        cardMinHeight: cardStyle?.minHeight ?? "",
        rowLeftInset:
          gridBounds && firstBounds ? firstBounds.left - gridBounds.left : null,
        rowRightInset:
          gridBounds && lastBounds ? gridBounds.right - lastBounds.right : null,
      };
    });

    expect(contract.tokenWidth).toBe("13.75rem");
    expect(contract.gridMinWidth).toBe("13.75rem");
    expect(contract.tokenHeight).toBe("26.25rem");
    const columns = contract.gridColumns
      .split(" ")
      .map((column) => Number.parseFloat(column))
      .filter((column) => column > 0);
    expect(contract.cardCount).toBeGreaterThanOrEqual(6);
    expect(columns.length).toBeGreaterThanOrEqual(4);
    expect(contract.firstRowCount).toBe(columns.length);
    expect(columns.every((column) => column >= 200)).toBe(true);
    expect(
      columns.every((column) => Math.abs(column - (columns[0] ?? 0)) < 1),
    ).toBe(true);
    expect(contract.cardWidth).toBeCloseTo(220, 0);
    expect(contract.cardHeight).toBeCloseTo(420, 0);
    expect(contract.cardMinHeight).toBe("420px");
    expect(contract.rowLeftInset).not.toBeNull();
    expect(contract.rowRightInset).not.toBeNull();
    expect(contract.rowLeftInset ?? Number.POSITIVE_INFINITY).toBeLessThan(16);
    expect(contract.rowRightInset ?? Number.POSITIVE_INFINITY).toBeLessThan(16);
    expect(contract.rowLeftInset).toBeCloseTo(contract.rowRightInset ?? 0, 0);
  });

  test("centres a sparse result card within the complete results row", async ({
    page,
  }) => {
    await page.goto("/recherche?category=mode-accessoires", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    await expect(
      page.locator(".listing-grid article.listing-card-standard"),
    ).toHaveCount(1);

    const contract = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const grid = document.querySelector<HTMLElement>(".listing-grid");
      const cards = grid
        ? [
            ...grid.querySelectorAll<HTMLElement>(
              "article.listing-card-standard",
            ),
          ]
        : [];
      const card = cards[0];
      const image = card?.querySelector<HTMLElement>("img");
      const gridBounds = grid?.getBoundingClientRect();
      const cardBounds = card?.getBoundingClientRect();
      const columns = grid
        ? getComputedStyle(grid)
            .gridTemplateColumns.split(" ")
            .map((column) => Number.parseFloat(column))
            .filter((column) => column > 0)
        : [];

      return {
        tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
        gridMinWidth: root
          .getPropertyValue("--spacing-listing-card-grid-min")
          .trim(),
        tokenHeight: root
          .getPropertyValue("--spacing-listing-card-height")
          .trim(),
        cardCount: cards.length,
        columns,
        cardWidth: card?.getBoundingClientRect().width ?? null,
        cardHeight: card?.getBoundingClientRect().height ?? null,
        imageHeight: image?.getBoundingClientRect().height ?? null,
        rowLeftInset:
          gridBounds && cardBounds ? cardBounds.left - gridBounds.left : null,
        rowRightInset:
          gridBounds && cardBounds ? gridBounds.right - cardBounds.right : null,
      };
    });

    expect(contract.tokenWidth).toBe("13.75rem");
    expect(contract.gridMinWidth).toBe("13.75rem");
    expect(contract.tokenHeight).toBe("26.25rem");
    expect(contract.cardCount).toBe(1);
    expect(contract.columns).toHaveLength(1);
    expect(contract.columns.every((column) => column >= 200)).toBe(true);
    expect(
      contract.columns.every(
        (column) => Math.abs(column - (contract.columns[0] ?? 0)) < 1,
      ),
    ).toBe(true);
    expect(contract.cardWidth).toBeCloseTo(220, 0);
    expect(contract.cardHeight).toBeCloseTo(420, 0);
    expect(contract.imageHeight).toBeLessThan(contract.cardHeight ?? 0);
    expect(contract.rowLeftInset).toBeCloseTo(contract.rowRightInset ?? 0, 0);
  });

  test("keeps listing rails and grids responsive across the supported viewport matrix", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await waitForStableLayout(page);

      const rail = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        const track = document.querySelector<HTMLElement>(
          ".listing-rail-track",
        );
        const scroller = track?.parentElement;
        const scrollerRect = scroller?.getBoundingClientRect();
        const cells = track
          ? [...track.querySelectorAll<HTMLElement>(".listing-rail-cell")]
          : [];

        return {
          tokenWidth: root.getPropertyValue("--spacing-listing-card").trim(),
          cardCount: cells.length,
          cardWidths: cells
            .slice(0, 6)
            .map((cell) => cell.getBoundingClientRect().width),
          scrollerWidth: scroller?.clientWidth ?? 0,
          scrollWidth: scroller?.scrollWidth ?? 0,
          fullyVisibleCards: scrollerRect
            ? cells.filter((cell) => {
                const rect = cell.getBoundingClientRect();
                return (
                  rect.left >= scrollerRect.left - 1 &&
                  rect.right <= scrollerRect.right + 1
                );
              }).length
            : 0,
        };
      });

      expect(rail.tokenWidth, `${viewport.name}: listing-card token`).toBe(
        "13.75rem",
      );
      expect(
        rail.cardWidths.length,
        `${viewport.name}: listing rail rendered`,
      ).toBeGreaterThan(0);
      for (const width of rail.cardWidths) {
        expect(width, `${viewport.name}: rail card width`).toBeCloseTo(220, 0);
      }
      expect(
        rail.scrollerWidth,
        `${viewport.name}: one complete rail card fits`,
      ).toBeGreaterThanOrEqual(220);
      expect(
        rail.scrollWidth > rail.scrollerWidth ||
          rail.fullyVisibleCards === rail.cardCount,
        `${viewport.name}: rail scrolls or exposes every card`,
      ).toBe(true);
      expect(
        rail.fullyVisibleCards,
        `${viewport.name}: complete rail cards visible`,
      ).toBeGreaterThanOrEqual(1);
      await expectNoHorizontalOverflow(
        page,
        `listing rail at ${viewport.name}`,
      );
    }

    await page.goto("/recherche?category=bebe-puericulture-enfants", {
      waitUntil: "domcontentloaded",
    });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await waitForStableLayout(page);

      const grid = await page.evaluate(() => {
        const element = document.querySelector<HTMLElement>(".listing-grid");
        const cards = element
          ? [
              ...element.querySelectorAll<HTMLElement>(
                "article.listing-card-standard",
              ),
            ]
          : [];
        const columns = element
          ? getComputedStyle(element)
              .gridTemplateColumns.split(" ")
              .map((column) => Number.parseFloat(column))
              .filter((column) => column > 0)
          : [];

        return {
          columns,
          cardWidths: cards
            .slice(0, 6)
            .map((card) => card.getBoundingClientRect().width),
        };
      });

      expect(
        grid.cardWidths.length,
        `${viewport.name}: listing grid rendered`,
      ).toBeGreaterThan(0);
      if (viewport.width < 640) {
        expect(
          grid.columns,
          `${viewport.name}: mobile grid column count`,
        ).toHaveLength(1);
        expect(
          grid.columns[0],
          `${viewport.name}: mobile card keeps a readable width`,
        ).toBeGreaterThanOrEqual(200);
      } else {
        expect(
          grid.columns.length,
          `${viewport.name}: desktop grid columns rendered`,
        ).toBeGreaterThan(0);
        for (const width of grid.columns) {
          expect(
            width,
            `${viewport.name}: desktop grid respects the dense minimum`,
          ).toBeGreaterThanOrEqual(200);
          expect(
            width,
            `${viewport.name}: desktop columns stay balanced`,
          ).toBeCloseTo(grid.columns[0] ?? 0, 0);
        }
      }
      for (const width of grid.cardWidths) {
        expect(
          width,
          `${viewport.name}: card keeps the shared fixed width`,
        ).toBeCloseTo(220, 0);
      }
      await expectNoHorizontalOverflow(
        page,
        `listing grid at ${viewport.name}`,
      );
    }
  });

  test("keeps desktop list cards uniform and stacks their media on phones", async ({
    page,
  }) => {
    const route = "/recherche?view=list";
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const desktop = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const cards = [
        ...document.querySelectorAll<HTMLElement>("article.listing-card-list"),
      ];
      return {
        tokenHeight: root
          .getPropertyValue("--spacing-listing-card-list-height")
          .trim(),
        tokenImage: root
          .getPropertyValue("--spacing-listing-card-list-image-lg")
          .trim(),
        cards: cards.map((card) => ({
          height: card.getBoundingClientRect().height,
          ...(() => {
            const image = card
              .querySelector<HTMLElement>(".listing-card-list-image")
              ?.getBoundingClientRect();
            const overlay = card
              .querySelector<HTMLElement>(".listing-card-list-overlay")
              ?.getBoundingClientRect();
            const actions = card
              .querySelector<HTMLElement>('[data-listing-card-actions="true"]')
              ?.getBoundingClientRect();
            return {
              imageWidth: image?.width ?? null,
              imageRight: image?.right ?? null,
              overlayRight: overlay?.right ?? null,
              actionsRight: actions?.right ?? null,
            };
          })(),
        })),
      };
    });

    expect(
      desktop.cards.length,
      "no list cards rendered",
    ).toBeGreaterThanOrEqual(3);
    expect(desktop.tokenHeight).toBe("12.5rem");
    expect(desktop.tokenImage).toBe("13rem");
    expect(new Set(desktop.cards.map((card) => card.height)).size).toBe(1);
    expect(new Set(desktop.cards.map((card) => card.imageWidth)).size).toBe(1);
    expect(desktop.cards[0]?.height).toBeCloseTo(200, 0);
    expect(desktop.cards[0]?.imageWidth).toBeCloseTo(208, 0);
    for (const card of desktop.cards) {
      expect(card.overlayRight).not.toBeNull();
      expect(card.imageRight).not.toBeNull();
      expect(card.actionsRight).not.toBeNull();
      expect(card.overlayRight!).toBeCloseTo(card.imageRight!, 0);
      expect(card.actionsRight!).toBeLessThan(card.imageRight!);
      expect(card.imageRight! - card.actionsRight!).toBeLessThan(16);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const mobile = await page.evaluate(() => {
      const cards = [
        ...document.querySelectorAll<HTMLElement>("article.listing-card-list"),
      ];
      return {
        cardWidths: cards.map((card) => card.getBoundingClientRect().width),
        imageWidths: cards.map(
          (card) =>
            card
              .querySelector<HTMLElement>(".listing-card-list-image")
              ?.getBoundingClientRect().width ?? null,
        ),
        heights: cards.map((card) => card.getBoundingClientRect().height),
      };
    });

    expect(new Set(mobile.imageWidths).size).toBe(1);
    expect(mobile.heights.every((height) => height >= 200)).toBe(true);
    for (const [index, imageWidth] of mobile.imageWidths.entries()) {
      expect(imageWidth).toBeGreaterThanOrEqual(
        (mobile.cardWidths[index] ?? 0) - 4,
      );
      expect(imageWidth).toBeLessThanOrEqual(mobile.cardWidths[index] ?? 0);
    }
    await expectNoHorizontalOverflow(page, "listing list cards");
  });

  test("keeps compact listing metadata contained", async ({ page }) => {
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    const metadataRows = page.locator('[data-listing-card-meta="true"]');
    await expect(metadataRows.first()).toBeVisible();

    const metadata = await metadataRows.evaluateAll((rows) =>
      rows.map((row) => ({
        text: row.textContent?.trim() ?? "",
        overflow: row.scrollWidth > row.clientWidth,
        overflowingDescendants: [...row.querySelectorAll("span")]
          .filter((span) => span.scrollWidth > span.clientWidth)
          .map((span) => ({
            text: span.textContent?.trim() ?? "",
            isNamedTruncationField: span.matches(
              '[data-listing-card-location="true"]',
            ),
            overflow: getComputedStyle(span).overflow,
            textOverflow: getComputedStyle(span).textOverflow,
            whiteSpace: getComputedStyle(span).whiteSpace,
          })),
      })),
    );

    expect(
      metadata.length,
      "no listing metadata rows rendered",
    ).toBeGreaterThan(0);
    expect(
      metadata.every(
        (row) =>
          !row.overflow &&
          row.overflowingDescendants.every(
            (field) =>
              field.isNamedTruncationField &&
              field.overflow === "hidden" &&
              field.textOverflow === "ellipsis" &&
              field.whiteSpace === "nowrap",
          ),
      ),
    ).toBe(true);
    await expect(
      page.locator('[data-listing-card-location="true"]').first(),
    ).toBeVisible();
    await expect(page.locator(".lucide-calendar")).toHaveCount(0);
  });

  test("fits the active view toggle corner to its segmented container", async ({
    page,
  }) => {
    await page.goto("/recherche?category=bebe-puericulture-enfants", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const geometry = await page.evaluate(() => {
      const group = document.querySelector<HTMLElement>(
        '[role="group"][aria-label="Mode d\'affichage des annonces"]',
      );
      const active = group?.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (!group || !active) return null;

      const groupStyle = getComputedStyle(group);
      const activeStyle = getComputedStyle(active);
      const groupRect = group.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();

      return {
        groupRadius: groupStyle.borderRadius,
        activeRadius: activeStyle.borderRadius,
        groupPadding: groupStyle.padding,
        insetLeft: activeRect.left - groupRect.left,
        insetTop: activeRect.top - groupRect.top,
        insetRight: groupRect.right - activeRect.right,
        insetBottom: groupRect.bottom - activeRect.bottom,
      };
    });

    expect(geometry).not.toBeNull();
    expect(geometry?.groupRadius).toBe("10px");
    expect(geometry?.activeRadius).toBe("8px");
    expect(geometry?.groupPadding).toBe("2px");
    expect(geometry?.insetLeft).toBeGreaterThanOrEqual(2);
    expect(geometry?.insetTop).toBeGreaterThanOrEqual(2);
    expect(geometry?.insetRight).toBeGreaterThanOrEqual(2);
    expect(geometry?.insetBottom).toBeGreaterThanOrEqual(2);
  });

  test("resolves the representative color, type, size, radius, elevation and motion tokens", async ({
    page,
  }) => {
    const styles = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.className =
        "fixed bg-primary text-text-inverse text-3xl h-control-md max-w-page rounded-control shadow-dropdown transition-all duration-normal";
      probe.textContent = "Design token probe";
      document.body.appendChild(probe);

      const colorTokenProbe = document.createElement("div");
      colorTokenProbe.style.backgroundColor = "var(--color-primary)";
      colorTokenProbe.style.color = "var(--color-text-inverse)";
      document.body.appendChild(colorTokenProbe);

      const computed = getComputedStyle(probe);
      const colorTokens = getComputedStyle(colorTokenProbe);
      const result = {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        tokenBackgroundColor: colorTokens.backgroundColor,
        tokenColor: colorTokens.color,
        fontSize: computed.fontSize,
        height: computed.height,
        maxWidth: computed.maxWidth,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        transitionDuration: computed.transitionDuration,
      };
      probe.remove();
      colorTokenProbe.remove();
      return result;
    });

    expect(styles.backgroundColor).toBe(styles.tokenBackgroundColor);
    expect(styles.color).toBe(styles.tokenColor);
    expect(styles).toMatchObject({
      fontSize: "30px",
      height: "40px",
      maxWidth: "1280px",
      borderRadius: "10px",
      transitionDuration: "0.25s",
    });
    expect(styles.boxShadow).not.toBe("none");
  });

  test("keeps solid orange controls identical to the logo through interaction states", async ({
    page,
  }) => {
    const readColors = async () =>
      page.evaluate(() => {
        const button = document.querySelector<HTMLButtonElement>(
          "main button.bg-primary",
        );
        if (!button) return null;
        const resolveToken = (name: string) => {
          const probe = document.createElement("span");
          probe.style.color = `var(--color-${name})`;
          document.body.appendChild(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        };
        const computed = getComputedStyle(button);
        return {
          background: computed.backgroundColor,
          border: computed.borderColor,
          text: computed.color,
          primary: resolveToken("primary"),
          brand: resolveToken("brand-primary"),
          foreground: resolveToken("on-primary"),
          logoForeground: resolveToken("brand-background"),
          icons: Array.from(button.querySelectorAll("svg")).map(
            (icon) => getComputedStyle(icon).color,
          ),
          hover: resolveToken("primary-hover"),
          active: resolveToken("primary-active"),
          disabled: resolveToken("primary-disabled"),
          disabledBorder: resolveToken("primary-disabled-border"),
          textMain: resolveToken("text-main"),
          canonical: getComputedStyle(document.documentElement)
            .getPropertyValue("--color-brand-primary")
            .trim()
            .toUpperCase(),
        };
      });

    for (const viewport of [
      { width: 1408, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto("/connexion", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      const button = page.locator("main button.bg-primary").first();
      await expect(button).toBeVisible();

      let state = await readColors();
      expect(state?.canonical).toBe(semanticColors.brand.primary);
      expect(state?.background).toBe(state?.primary);
      expect(state?.primary).toBe(state?.brand);
      expect(state?.hover).toBe(state?.brand);
      expect(state?.active).toBe(state?.brand);
      expect(state?.text).toBe(state?.foreground);
      expect(state?.foreground).toBe(state?.logoForeground);
      expect(state?.icons.length).toBeGreaterThan(0);
      for (const color of state?.icons ?? [])
        expect(color).toBe(state?.foreground);

      await button.hover();
      await expect
        .poll(async () => (await readColors())?.background)
        .toBe(state?.hover);

      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await expect
        .poll(async () => (await readColors())?.background)
        .toBe(state?.active);
      await page.mouse.up();

      await button.evaluate((element) => {
        element.disabled = true;
      });
      await expect
        .poll(async () => (await readColors())?.background)
        .toBe(state?.disabled);
      state = await readColors();
      expect(state?.border).toBe(state?.disabledBorder);
      expect(state?.text).toBe(state?.textMain);
      await expectNoHorizontalOverflow(
        page,
        `primary state audit at ${viewport.width}px`,
      );
    }
  });

  test("resolves the complete control scale with one shared radius", async ({
    page,
  }) => {
    const controls = await page.evaluate(() => {
      const sizes = ["sm", "md", "touch", "lg"] as const;
      const probes = sizes.map((size) => {
        const probe = document.createElement("button");
        probe.className = `h-control-${size} rounded-control`;
        document.body.appendChild(probe);
        const computed = getComputedStyle(probe);
        const result = {
          size,
          height: computed.height,
          radius: computed.borderRadius,
        };
        probe.remove();
        return result;
      });
      return probes;
    });

    expect(controls).toEqual([
      { size: "sm", height: "32px", radius: "10px" },
      { size: "md", height: "40px", radius: "10px" },
      { size: "touch", height: "44px", radius: "10px" },
      { size: "lg", height: "48px", radius: "10px" },
    ]);
  });

  test("loads the single optimized Nunito Sans UI font with a stable fallback contract", async ({
    page,
  }) => {
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        family: body.fontFamily,
        familyToken: root.getPropertyValue("--font-family-sans").trim(),
        tailwindToken: root.getPropertyValue("--font-sans").trim(),
        synthesis: body.fontSynthesis,
        loadedFaces: [...document.fonts]
          .filter((face) => face.status === "loaded")
          .map((face) => face.family),
      };
    });

    expect(font.family).toContain("Nunito Sans");
    expect(font.familyToken).toContain("Nunito Sans");
    expect(font.familyToken).toContain("Helvetica");
    expect(font.familyToken).toContain("Arial");
    expect(font.tailwindToken).toBe(font.familyToken);
    expect(font.synthesis).toBe("none");
    expect(
      font.loadedFaces.some((family) => family.includes("Nunito Sans")),
    ).toBe(true);
  });

  test("keeps the canonical marketplace weight hierarchy", async ({ page }) => {
    const hierarchy = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(
        "article.listing-card-standard",
      );
      const title = card?.querySelector<HTMLElement>("h3");
      const price = card?.querySelector<HTMLElement>(
        '[data-listing-card-current-price="true"]',
      );
      const category = card?.querySelector<HTMLElement>(
        '[data-listing-card-category-row="true"]',
      );
      return {
        title: title ? getComputedStyle(title).fontWeight : null,
        price: price ? getComputedStyle(price).fontWeight : null,
        category: category ? getComputedStyle(category).fontWeight : null,
      };
    });

    expect(hierarchy).toEqual({ title: "500", price: "700", category: "500" });
  });

  for (const [chunkIndex, routes] of ROUTE_TYPOGRAPHY_AUDIT_CHUNKS.entries()) {
    test(`keeps routed surfaces on token-backed typography (${chunkIndex + 1}/${ROUTE_TYPOGRAPHY_AUDIT_CHUNKS.length})`, async ({
      page,
    }) => {
      // Bounded route groups keep WebKit diagnostics attributable and avoid a
      // single long-lived page consuming the timeout for every remaining
      // public, account, Pro, admin and CRM surface.
      test.setTimeout(120_000);
      for (const route of routes) {
        await test.step(`${route.name} (${route.path})`, async () => {
          await usePersona(page, route.persona);
          await page.goto(route.path, { waitUntil: "domcontentloaded" });
          await waitForStableLayout(page, 20_000);

          const audit = await page.evaluate(() => {
            const arbitraryTypography = [
              ...document.querySelectorAll<HTMLElement>("[class]"),
            ]
              .flatMap((element) => String(element.className).split(/\s+/))
              .filter((className) =>
                /^(?:[a-z-]+:)*(?:text|leading|tracking|font)-\[[^\]]+\]$/.test(
                  className,
                ),
              );
            const inlineTypography = [
              ...document.querySelectorAll<HTMLElement>("[style]"),
            ]
              // Recharts creates one off-screen, aria-hidden measurement node so
              // it can size axis labels. It never paints product typography and
              // merely mirrors the chart's token-backed computed font values.
              .filter(
                (element) =>
                  !element.matches(
                    '#recharts_measurement_span[aria-hidden="true"]',
                  ),
              )
              .filter((element) =>
                /(?:font-family|font-size|font-weight|line-height|letter-spacing)/i.test(
                  element.getAttribute("style") || "",
                ),
              )
              .map((element) => element.outerHTML.slice(0, 180));
            const body = getComputedStyle(document.body);
            const unexpectedFontFamilies = [
              ...document.querySelectorAll<HTMLElement>(
                "main, header, nav, footer, button, input, textarea, select, h1, h2, h3, h4, h5, h6, p, span, a, label, li, td, th",
              ),
            ]
              .map((element) => ({
                element: element.outerHTML.slice(0, 140),
                family: getComputedStyle(element).fontFamily,
              }))
              .filter(
                ({ family }) =>
                  family !== body.fontFamily &&
                  !/(?:ui-monospace|SFMono-Regular|Menlo|Monaco|Consolas|monospace)/i.test(
                    family,
                  ),
              )
              .slice(0, 10);
            const weightNineHundred = [
              ...document.querySelectorAll<HTMLElement>("body *"),
            ]
              .filter(
                (element) => getComputedStyle(element).fontWeight === "900",
              )
              .map((element) => element.outerHTML.slice(0, 140))
              .slice(0, 10);
            return {
              arbitraryTypography,
              inlineTypography,
              bodyFontFamily: body.fontFamily,
              unexpectedFontFamilies,
              weightNineHundred,
              overflow:
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
            };
          });

          expect(
            audit.arbitraryTypography,
            `${route.name} contains arbitrary typography`,
          ).toEqual([]);
          expect(
            audit.inlineTypography,
            `${route.name} contains inline typography`,
          ).toEqual([]);
          expect(
            audit.bodyFontFamily,
            `${route.name} lost the bundled UI font`,
          ).toContain("Nunito Sans");
          expect(
            audit.unexpectedFontFamilies,
            `${route.name} contains a competing application font family`,
          ).toEqual([]);
          expect(
            audit.weightNineHundred,
            `${route.name} renders unsupported weight 900`,
          ).toEqual([]);
          expect(audit.overflow, `${route.name} overflows horizontally`).toBe(
            false,
          );
        });
      }
    });
  }

  test("keeps native registration fields on the touch size and control radius", async ({
    page,
  }) => {
    await page.goto("/inscription/particulier", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const fields = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          'main input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="hidden"]), main select',
        ),
      ]
        .filter((field) => field.getBoundingClientRect().height > 0)
        .map((field) => {
          const rect = field.getBoundingClientRect();
          const computed = getComputedStyle(field);
          return {
            height: Math.round(rect.height),
            radius: computed.borderRadius,
          };
        }),
    );

    expect(fields.length).toBeGreaterThanOrEqual(6);
    expect(new Set(fields.map((field) => field.height))).toEqual(new Set([44]));
    expect(new Set(fields.map((field) => field.radius))).toEqual(
      new Set(["10px"]),
    );
  });

  test("harmonizes primary authentication actions on the header control metric", async ({
    page,
  }) => {
    const paths = [
      "/connexion",
      "/inscription",
      "/inscription/particulier",
      "/inscription/professionnel",
      "/mot-de-passe-oublie",
      "/reinitialisation-mot-de-passe?token=demo-reset-token",
      "/verification-email",
    ];

    for (const path of paths) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const action = page
        .locator('main button[data-ui="button"][data-size="md"]')
        .first();
      await expect(action, `missing auth action on ${path}`).toBeVisible();

      const metric = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });

      expect(metric, path).toEqual({ height: 40, radius: "10px" });
    }
  });

  test("keeps authentication actions compact and contained on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of [
      "/connexion",
      "/inscription",
      "/inscription/professionnel",
    ]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);

      const action = page
        .locator('main button[data-ui="button"][data-size="md"]')
        .first();
      await expect(
        action,
        `missing mobile auth action on ${path}`,
      ).toBeVisible();
      await expectNoHorizontalOverflow(page, `mobile auth route ${path}`);

      const metric = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });
      expect(metric, path).toEqual({ height: 40, radius: "10px" });
    }
  });

  test("aligns the desktop header action row on the compact control metric", async ({
    page,
  }) => {
    await usePersona(page, "individual_buyer");
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const actions = await page.evaluate(() => {
      const candidates = [
        document.querySelector("#header-desktop-lang-button"),
        document.querySelector('header a[aria-label="Favoris"]'),
        document.querySelector('header a[aria-label="Messagerie"]'),
        document.querySelector('header button[aria-label^="Notifications"]'),
        document.querySelector('header button[aria-label^="Menu du compte"]'),
      ].filter((node): node is HTMLElement => node instanceof HTMLElement);

      return candidates.map((action) => {
        const rect = action.getBoundingClientRect();
        const computed = getComputedStyle(action);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });
    });

    expect(actions).toHaveLength(5);
    expect(new Set(actions.map((action) => action.height))).toEqual(
      new Set([40]),
    );
    expect(new Set(actions.map((action) => action.radius))).toEqual(
      new Set(["10px"]),
    );
  });

  test("keeps the category navigation compact at every viewport", async ({
    page,
  }) => {
    const categoryNav = page.locator(
      'header nav[aria-label="Filtres par catégorie"]',
    );
    const categoryLink = categoryNav.getByRole("link", {
      name: "Immobilier",
      exact: true,
    });

    await expect(categoryLink).toBeVisible();

    const readMetric = () =>
      categoryLink.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });

    expect(await readMetric()).toEqual({ height: 40, radius: "10px" });

    await page.setViewportSize({ width: 390, height: 844 });
    await waitForStableLayout(page);
    await expect(categoryLink).toBeVisible();
    expect(await readMetric()).toEqual({ height: 40, radius: "10px" });
    await expectNoHorizontalOverflow(page, "mobile category navigation");
  });

  test("aligns homepage hero actions with the Pro discovery control", async ({
    page,
  }) => {
    const readMetric = async (locator: Locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });

    const main = page.getByRole("main");
    const heroPublish = main.getByRole("link", {
      name: "Déposer une annonce",
      exact: true,
    });
    const heroExplore = main.getByRole("link", {
      name: "Explorer le catalogue",
      exact: true,
    });
    const proDiscovery = main.getByRole("link", {
      name: "Découvrir les forfaits Pro",
      exact: true,
    });

    await expect(heroPublish).toBeVisible();
    await expect(heroExplore).toBeVisible();
    await expect(proDiscovery).toBeVisible();

    expect(await readMetric(proDiscovery)).toEqual({
      height: 44,
      radius: "10px",
    });
    expect(await readMetric(heroPublish)).toEqual({
      height: 44,
      radius: "10px",
    });
    expect(await readMetric(heroExplore)).toEqual({
      height: 44,
      radius: "10px",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(heroPublish).toBeVisible();
    await expect(heroExplore).toBeVisible();
    await expectNoHorizontalOverflow(page, "mobile homepage hero actions");
    expect(await readMetric(heroPublish)).toEqual({
      height: 44,
      radius: "10px",
    });
    expect(await readMetric(heroExplore)).toEqual({
      height: 44,
      radius: "10px",
    });
  });

  test("keeps pointer hover separate from keyboard focus on the header publish action", async ({
    page,
  }) => {
    const publish = page.locator("[data-header-publish-cta] a");
    await expect(publish).toBeVisible();

    await publish.hover();
    await expect
      .poll(() =>
        publish.evaluate((element) => ({
          focused: element.matches(":focus"),
          focusVisible: element.matches(":focus-visible"),
          outlineStyle: getComputedStyle(element).outlineStyle,
        })),
      )
      .toEqual({
        focused: false,
        focusVisible: false,
        outlineStyle: "none",
      });

    await page.mouse.move(20, 300);
    await page.keyboard.press("Tab");
    await publish.focus();
    await expect
      .poll(() =>
        publish.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            focused: element.matches(":focus"),
            focusVisible: element.matches(":focus-visible"),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
          };
        }),
      )
      .toMatchObject({
        focused: true,
        focusVisible: true,
        outlineStyle: "solid",
        outlineWidth: "2px",
      });
    const colors = await publish.evaluate((element) => {
      const tokenProbe = document.createElement("span");
      tokenProbe.style.color = "var(--color-focus)";
      document.body.append(tokenProbe);
      const token = getComputedStyle(tokenProbe).color;
      tokenProbe.remove();
      return {
        outline: getComputedStyle(element).outlineColor,
        token,
      };
    });
    expect(colors.outline).toBe(colors.token);
  });

  test("keeps footers on the same ink as the header publish action", async ({
    page,
  }) => {
    const publish = page.locator(
      'header [data-marketplace-action="listing.publish"]',
    );
    await expect(publish).toBeVisible();
    const ink = await publish.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    for (const path of ["/", "/prospects", "/facturation"]) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      const footer = page.locator("footer");
      await footer.scrollIntoViewIfNeeded();
      await expect(footer).toHaveCSS("background-color", ink);
    }
  });

  test("keeps footer controls on the shared touch scale", async ({ page }) => {
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    const market = footer.getByRole("button", {
      name: "Préférences régionales : France",
    });
    const cookiePreferences = footer.getByRole("button", {
      name: "Gestion des cookies",
    });
    for (const control of [market, cookiePreferences]) {
      await expect(control).toBeVisible();
      expect(
        await control.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBeGreaterThanOrEqual(44);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    const buy = footer.getByRole("button", { name: "Acheter", exact: true });
    const listings = footer.getByRole("link", { name: "Toutes les annonces" });
    await expect(buy).toHaveAttribute("aria-expanded", "false");
    await expect(listings).toBeHidden();
    expect(
      await buy.evaluate((element) => element.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(48);
    await buy.click();
    await expect(buy).toHaveAttribute("aria-expanded", "true");
    await expect(listings).toBeVisible();
    await expectNoHorizontalOverflow(page, "expanded mobile footer");
    await buy.click();
    await expect(listings).toBeHidden();
  });

  test("aligns listing transaction actions with the shared header control metric", async ({
    page,
  }) => {
    const readMetric = async (locator: Locator) =>
      locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });

    await page.goto(testListingPath("list-112"), {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);

    const desktopActions = page
      .getByTestId("listing-desktop-actions")
      .getByRole("button");
    await expect(desktopActions.first()).toBeVisible();
    expect(await desktopActions.count()).toBeGreaterThanOrEqual(2);
    for (const action of await desktopActions.all()) {
      expect(await readMetric(action)).toEqual({ height: 40, radius: "10px" });
    }

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await waitForStableLayout(page);

      const inlineAction = page.getByTestId("listing-inline-mobile-action");
      await inlineAction.scrollIntoViewIfNeeded();
      await expect(inlineAction).toBeVisible();
      await page.waitForTimeout(100);
      await inlineAction.evaluate((element) => {
        const box = element.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + box.bottom + 48);
      });

      const mobileActions = page
        .getByTestId("listing-mobile-actions")
        .getByRole("button");
      await expect(
        mobileActions.first(),
        `missing listing actions at ${width}px`,
      ).toBeVisible();
      expect(await mobileActions.count()).toBeGreaterThanOrEqual(2);
      for (const action of await mobileActions.all()) {
        expect(await readMetric(action), `${width}px`).toEqual({
          height: 40,
          radius: "10px",
        });
      }
      await expectNoHorizontalOverflow(
        page,
        `listing transaction actions at ${width}px`,
      );
    }
  });

  test("keeps scrolled content underneath the sticky environment header stack", async ({
    page,
  }) => {
    const recentCard = page.locator("main article a[href]").first();
    await expect(recentCard).toBeVisible();

    const result = await page.evaluate(() => {
      const stack = document.querySelector<HTMLElement>(
        '[data-environment-header-stack="true"]',
      );
      const toolbar = stack?.querySelector<HTMLElement>(
        '[data-environment-toolbar="api"]',
      );
      const toolbarContent = toolbar?.firstElementChild as HTMLElement | null;
      const header = stack?.querySelector<HTMLElement>("header");
      const cardLink = document.querySelector<HTMLAnchorElement>(
        "main article a[href]",
      );
      if (!stack || !toolbar || !toolbarContent || !header || !cardLink) {
        return null;
      }

      const initial = cardLink.getBoundingClientRect();
      const stackHeight = stack.getBoundingClientRect().height;
      window.scrollTo(0, window.scrollY + initial.top - stackHeight / 2);

      const root = getComputedStyle(document.documentElement);
      const stackRect = stack.getBoundingClientRect();
      const toolbarRect = toolbar.getBoundingClientRect();
      const toolbarContentRect = toolbarContent.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(1, initial.left + 12));
      const y = Math.max(1, stackRect.bottom - 12);
      const topmost = document.elementFromPoint(x, y);

      return {
        toolbarHeightToken: root
          .getPropertyValue("--spacing-environment-toolbar-height")
          .trim(),
        toolbarHeight: toolbarRect.height,
        toolbarContentHorizontalCenterDelta: Math.abs(
          toolbarContentRect.left +
            toolbarContentRect.width / 2 -
            (toolbarRect.left + toolbarRect.width / 2),
        ),
        toolbarContentVerticalCenterDelta: Math.abs(
          toolbarContentRect.top +
            toolbarContentRect.height / 2 -
            (toolbarRect.top + toolbarRect.height / 2),
        ),
        stackPosition: getComputedStyle(stack).position,
        stackTop: stackRect.top,
        stackZIndex: getComputedStyle(stack).zIndex,
        headerStartsBelowToolbar: headerRect.top === toolbarRect.bottom,
        topmostIsStack: Boolean(topmost && stack.contains(topmost)),
      };
    });

    expect(result).not.toBeNull();
    expect(result!.toolbarHeightToken).toBe("3.5rem");
    expect(result!.toolbarHeight).toBe(56);
    expect(result!.toolbarContentHorizontalCenterDelta).toBeLessThanOrEqual(
      0.5,
    );
    expect(result!.toolbarContentVerticalCenterDelta).toBeLessThanOrEqual(0.5);
    expect(result!.stackPosition).toBe("sticky");
    expect(result!.stackTop).toBe(0);
    expect(Number(result!.stackZIndex)).toBe(40);
    expect(result!.headerStartsBelowToolbar).toBe(true);
    expect(result!.topmostIsStack).toBe(true);
  });

  test("keeps every environment toolbar control on one horizontal axis", async ({
    page,
  }) => {
    await usePersona(page, "support");

    for (const width of [1408, 1024, 888, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/recherche", { waitUntil: "domcontentloaded" });
      await waitForStableLayout(page);
      await expect(page.getByTestId("staff-marketplace-mode")).toBeVisible();

      const alignment = await page.evaluate(() => {
        const toolbar = document.querySelector<HTMLElement>(
          '[data-environment-toolbar="api"]',
        );
        const content = toolbar?.firstElementChild as HTMLElement | null;
        if (!toolbar || !content) return null;

        const toolbarRect = toolbar.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const toolbarStyle = getComputedStyle(toolbar);
        const bottomBorder = Number.parseFloat(toolbarStyle.borderBottomWidth);
        const centerY = contentRect.top + contentRect.height / 2;
        const visibleRect = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 ? rect : null;
        };
        const groupRects = [...content.children]
          .map(visibleRect)
          .filter((rect): rect is DOMRect => Boolean(rect));
        const controlRects = [...toolbar.querySelectorAll("button, summary, a")]
          .map(visibleRect)
          .filter((rect): rect is DOMRect => Boolean(rect));
        return {
          toolbarHeight: toolbarRect.height,
          verticalPaddingDelta: Math.abs(
            contentRect.top -
              toolbarRect.top -
              (toolbarRect.bottom - bottomBorder - contentRect.bottom),
          ),
          groupCenterDeltas: groupRects.map((rect) =>
            Math.abs(rect.top + rect.height / 2 - centerY),
          ),
          controlCenterDeltas: controlRects.map((rect) =>
            Math.abs(rect.top + rect.height / 2 - centerY),
          ),
          controlHeights: controlRects.map((rect) => rect.height),
          controlWidths: controlRects.map((rect) => rect.width),
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });

      expect(alignment).not.toBeNull();
      expect(alignment!.toolbarHeight).toBe(56);
      expect(alignment!.verticalPaddingDelta).toBeLessThanOrEqual(0.5);
      expect(alignment!.groupCenterDeltas.every((delta) => delta <= 0.5)).toBe(
        true,
      );
      expect(
        alignment!.controlCenterDeltas.every((delta) => delta <= 0.5),
      ).toBe(true);
      expect(alignment!.controlHeights.every((height) => height === 28)).toBe(
        true,
      );
      expect(
        alignment!.controlWidths.every((width) => width >= 24),
        `environment-toolbar target narrower than the 24px WCAG 2.5.8 floor at ${width}px`,
      ).toBe(true);
      expect(alignment!.horizontalOverflow).toBe(0);
    }
  });

  test("fully hides and restores the environment toolbar across reloads and navigation", async ({
    page,
  }) => {
    for (const width of [1408, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/recherche", { waitUntil: "domcontentloaded" });
      const toolbar = page.locator('[data-environment-toolbar="api"]');
      const hide = page.getByRole("button", {
        name: "Masquer la barre d’environnement",
        exact: true,
      });
      const restore = page.getByRole("button", {
        name: "Afficher la barre d’environnement",
        exact: true,
      });

      await expect(toolbar).toBeVisible();
      await expect(hide).toHaveAttribute("aria-expanded", "true");
      await expect
        .poll(() =>
          toolbar.evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBe(56);
      await hide.focus();
      await hide.press("Enter");

      await expect(toolbar).toBeHidden();
      await expect(restore).toBeVisible();
      await expect(restore).toBeFocused();
      await expect(restore).toHaveAttribute("aria-expanded", "false");
      await expect
        .poll(() =>
          toolbar.evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBe(0);
      await expect
        .poll(() =>
          page
            .locator("header")
            .first()
            .evaluate((element) => element.getBoundingClientRect().top),
        )
        .toBe(0);
      await expectNoHorizontalOverflow(
        page,
        `hidden environment toolbar at ${width}px`,
      );

      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(restore).toBeVisible();
      await expect(toolbar).toBeHidden();
      await page.goto("/connexion", { waitUntil: "domcontentloaded" });
      await expect(restore).toBeVisible();
      await expect(toolbar).toBeHidden();
      await expect
        .poll(() =>
          page
            .locator("header")
            .first()
            .evaluate((element) => element.getBoundingClientRect().top),
        )
        .toBe(0);

      await restore.focus();
      await restore.press("Enter");
      await expect(toolbar).toBeVisible();
      await expect(hide).toBeFocused();
      await expect(restore).toHaveCount(0);
      await expect
        .poll(() =>
          toolbar.evaluate((element) => element.getBoundingClientRect().height),
        )
        .toBe(56);
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(hide).toBeVisible();
      await expect(toolbar).toBeVisible();
    }
  });
});
