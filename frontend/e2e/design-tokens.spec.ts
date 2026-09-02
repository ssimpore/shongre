import { expect, test, type Locator, type Page } from "@playwright/test";
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

    expect(contract.version).toBe("4");
    expect(contract.tokenWidth).toBe("13rem");
    expect(contract.firstTrackCardCount).toBeGreaterThan(0);
    expect(contract.fullyVisibleCards).toBe(
      Math.min(5, contract.firstTrackCardCount),
    );
    expect(
      contract.widths.length,
      "the recent-listings rail did not render",
    ).toBeGreaterThanOrEqual(6);
    for (const width of contract.widths) {
      expect(width).toBeCloseTo(208, 0);
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
    expect(contract.tokenWidth).toBe("13rem");
    for (const item of contract.cells) {
      expect(item.cell).toBeCloseTo(208, 0);
      expect(item.card).toBeCloseTo(208, 0);
    }
  });

  test("packs available desktop search cards into shared dense columns", async ({
    page,
  }) => {
    await page.goto("/recherche?category=vehicules&maxPrice=100000", {
      waitUntil: "domcontentloaded",
    });
    await waitForStableLayout(page);
    await expect(
      page.locator(".listing-grid article.listing-card-standard"),
    ).toHaveCount(6);

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
      };
    });

    expect(contract.tokenWidth).toBe("13rem");
    expect(contract.gridMinWidth).toBe("12.5rem");
    expect(contract.tokenHeight).toBe("23rem");
    const columns = contract.gridColumns
      .split(" ")
      .map((column) => Number.parseFloat(column))
      .filter((column) => column > 0);
    expect(contract.cardCount).toBe(6);
    expect(columns.length).toBeGreaterThanOrEqual(5);
    expect(contract.firstRowCount).toBe(columns.length);
    expect(columns.every((column) => column >= 200)).toBe(true);
    expect(
      columns.every((column) => Math.abs(column - (columns[0] ?? 0)) < 1),
    ).toBe(true);
    expect(contract.cardWidth).toBeCloseTo(columns[0] ?? 0, 0);
    expect(contract.cardHeight).toBeGreaterThanOrEqual(368);
    expect(contract.cardMinHeight).toBe("368px");
  });

  test("keeps a sparse result card on one shared dense grid track", async ({
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
      };
    });

    expect(contract.tokenWidth).toBe("13rem");
    expect(contract.gridMinWidth).toBe("12.5rem");
    expect(contract.tokenHeight).toBe("23rem");
    expect(contract.cardCount).toBe(1);
    expect(contract.columns.length).toBeGreaterThan(1);
    expect(contract.columns.every((column) => column >= 200)).toBe(true);
    expect(
      contract.columns.every(
        (column) => Math.abs(column - (contract.columns[0] ?? 0)) < 1,
      ),
    ).toBe(true);
    expect(contract.cardWidth).toBeCloseTo(contract.columns[0] ?? 0, 0);
    expect(contract.cardHeight).toBeGreaterThanOrEqual(368);
    expect(contract.imageHeight).toBeLessThan(contract.cardHeight ?? 0);
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
        "13rem",
      );
      expect(
        rail.cardWidths.length,
        `${viewport.name}: listing rail rendered`,
      ).toBeGreaterThan(0);
      for (const width of rail.cardWidths) {
        expect(width, `${viewport.name}: rail card width`).toBeCloseTo(208, 0);
      }
      expect(
        rail.scrollerWidth,
        `${viewport.name}: one complete rail card fits`,
      ).toBeGreaterThanOrEqual(208);
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
          `${viewport.name}: card follows its grid column`,
        ).toBeCloseTo(grid.columns[0] ?? 0, 0);
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
          imageWidth:
            card
              .querySelector<HTMLElement>(".listing-card-list-image")
              ?.getBoundingClientRect().width ?? null,
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

  test("keeps listing metadata readable without horizontal truncation", async ({
    page,
  }) => {
    await page.goto("/recherche", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);
    await expect(
      page.locator("article.min-w-0 .border-t").first(),
    ).toBeVisible();

    const metadata = await page
      .locator("article.min-w-0 .border-t")
      .evaluateAll((rows) =>
        rows.map((row) => ({
          text: row.textContent?.trim() ?? "",
          overflow: row.scrollWidth > row.clientWidth,
          overflowingDescendants: [...row.querySelectorAll("span")]
            .filter((span) => span.scrollWidth > span.clientWidth)
            .map((span) => span.textContent?.trim() ?? ""),
        })),
      );

    expect(
      metadata.length,
      "no listing metadata rows rendered",
    ).toBeGreaterThan(0);
    expect(
      metadata.every(
        (row) => !row.overflow && row.overflowingDescendants.length === 0,
      ),
    ).toBe(true);
    expect(
      await page.locator("article.min-w-0 .border-t .lucide-calendar").count(),
    ).toBeGreaterThan(0);
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
        "fixed bg-primary text-white text-3xl h-control-md max-w-page rounded-control shadow-dropdown transition-all duration-normal";
      probe.textContent = "Design token probe";
      document.body.appendChild(probe);

      const computed = getComputedStyle(probe);
      const result = {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        height: computed.height,
        maxWidth: computed.maxWidth,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        transitionDuration: computed.transitionDuration,
      };
      probe.remove();
      return result;
    });

    expect(styles).toMatchObject({
      backgroundColor: "rgb(196, 67, 31)",
      color: "rgb(255, 255, 255)",
      fontSize: "30px",
      height: "40px",
      maxWidth: "1280px",
      borderRadius: "10px",
      transitionDuration: "0.25s",
    });
    expect(styles.boxShadow).not.toBe("none");
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

  test("loads the bundled UI font with a stable fallback contract", async ({
    page,
  }) => {
    const font = await page.evaluate(async () => {
      await document.fonts.ready;
      const body = getComputedStyle(document.body);
      return {
        family: body.fontFamily,
        synthesis: body.fontSynthesis,
        loaded: document.fonts.check('16px "Inter Variable"'),
      };
    });

    expect(font.family).toContain("Inter Variable");
    expect(font.synthesis).toBe("none");
    expect(font.loaded).toBe(true);
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
            return {
              arbitraryTypography,
              inlineTypography,
              bodyFontFamily: body.fontFamily,
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
          ).toContain("Inter Variable");
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

  test("harmonizes primary authentication actions on the touch control metric", async ({
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

      const action = page.locator("main button.h-control-touch").first();
      await expect(action, `missing auth action on ${path}`).toBeVisible();

      const metric = await action.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          height: Math.round(rect.height),
          radius: computed.borderRadius,
        };
      });

      expect(metric, path).toEqual({ height: 44, radius: "10px" });
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

      const action = page.locator("main button.h-control-touch").first();
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
      expect(metric, path).toEqual({ height: 44, radius: "10px" });
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

  test("aligns footer newsletter controls with the Pro discovery control", async ({
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
    const proDiscovery = main.getByRole("link", {
      name: "Découvrir les forfaits Pro",
      exact: true,
    });
    const newsletter = page.getByRole("complementary", {
      name: "Newsletter Shongre",
    });
    const email = newsletter.getByRole("textbox", { name: /adresse email/i });
    const submit = newsletter.getByRole("button", {
      name: "S'inscrire",
      exact: true,
    });

    await expect(email).toBeVisible();
    await expect(submit).toBeVisible();
    expect(await readMetric(proDiscovery)).toEqual({
      height: 44,
      radius: "10px",
    });
    expect(await readMetric(email)).toEqual({ height: 44, radius: "10px" });
    expect(await readMetric(submit)).toEqual({ height: 44, radius: "10px" });

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(email).toBeVisible();
    await expect(submit).toBeVisible();
    await expectNoHorizontalOverflow(page, "mobile footer newsletter controls");
    expect(await readMetric(email)).toEqual({ height: 44, radius: "10px" });
    expect(await readMetric(submit)).toEqual({ height: 44, radius: "10px" });
  });

  test("aligns listing transaction actions with the shared touch control metric", async ({
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

    await page.goto("/annonce/list-112", { waitUntil: "domcontentloaded" });
    await waitForStableLayout(page);

    const desktopActions = page
      .getByTestId("listing-desktop-actions")
      .getByRole("button");
    await expect(desktopActions.first()).toBeVisible();
    expect(await desktopActions.count()).toBeGreaterThanOrEqual(2);
    for (const action of await desktopActions.all()) {
      expect(await readMetric(action)).toEqual({ height: 44, radius: "10px" });
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
          height: 44,
          radius: "10px",
        });
      }
      await expectNoHorizontalOverflow(
        page,
        `listing transaction actions at ${width}px`,
      );
    }
  });

  test("keeps scrolled content underneath the sticky header", async ({
    page,
  }) => {
    const recentCard = page.getByRole("link", { name: /Antiquités/i });
    await expect(recentCard).toBeVisible();

    const result = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>("body > div header");
      const cardLink = [
        ...document.querySelectorAll<HTMLAnchorElement>("a"),
      ].find((link) => /Antiquités/i.test(link.textContent || ""));
      if (!header || !cardLink) return null;

      const initial = cardLink.getBoundingClientRect();
      const headerHeight = header.getBoundingClientRect().height;
      window.scrollTo(0, window.scrollY + initial.top - headerHeight / 2);

      const headerRect = header.getBoundingClientRect();
      const x = Math.min(window.innerWidth - 1, Math.max(1, initial.left + 12));
      const y = Math.max(1, headerRect.bottom - 12);
      const topmost = document.elementFromPoint(x, y);

      return {
        headerPosition: getComputedStyle(header).position,
        headerZIndex: getComputedStyle(header).zIndex,
        topmostIsHeader: Boolean(topmost && header.contains(topmost)),
      };
    });

    expect(result).not.toBeNull();
    expect(result!.headerPosition).toBe("sticky");
    expect(Number(result!.headerZIndex)).toBe(40);
    expect(result!.topmostIsHeader).toBe(true);
  });
});
