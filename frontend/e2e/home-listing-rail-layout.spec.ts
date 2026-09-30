import { expect as baseExpect, test, type Locator } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";
import { tmpdir } from "node:os";
import { join } from "node:path";

const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(120_000);

async function revealRail(rail: Locator) {
  await rail.evaluate((element) =>
    element
      .closest("section")!
      .scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const firstCard = rail.locator("[data-listing-card]").first();
  await expect(firstCard).toBeVisible();
  await firstCard.scrollIntoViewIfNeeded();
  await expect(firstCard).toBeInViewport();
}

for (const width of [1408, 390]) {
  test(`homepage keeps every configured listing section painted at ${width}px`, async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByTestId("home-universe-explorer")).toBeAttached();

    const sectionStates = await page
      .locator("[data-home-discovery-type], [data-home-universe-group]")
      .evaluateAll((sections) =>
        sections.map((section) => ({
          key:
            section.getAttribute("data-home-discovery-type") ??
            section.getAttribute("data-home-universe-group"),
          painted: section.checkVisibility({ contentVisibilityAuto: true }),
        })),
      );

    expect(sectionStates.length).toBeGreaterThan(3);
    expect(sectionStates).toEqual(
      sectionStates.map((section) => ({ ...section, painted: true })),
    );
  });
}

for (const width of [1408, 1352, 768, 390, 320]) {
  test(`homepage listing rails fit their own content without clipping at ${width}px`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle(/Shongre/i);
    await expect(page.getByTestId("home-universe-explorer")).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    const rails = page.locator(".listing-rail-track");
    expect(await rails.count()).toBeGreaterThan(2);
    const widths: number[] = [];
    for (const rail of await rails.all()) {
      await revealRail(rail);
      const geometry = await rail
        .locator("[data-listing-card]")
        .evaluateAll((cards) =>
          cards.map((card) => {
            const box = card.getBoundingClientRect();
            const title = card.querySelector<HTMLElement>(
              "[data-listing-card-title]",
            )!;
            const meta = card.querySelector<HTMLElement>(
              "[data-listing-card-meta]",
            )!;
            return {
              width: box.width,
              height: box.height,
              top: box.top,
              left: box.left,
              compact: card.classList.contains("listing-card-no-media"),
              variant: card.getAttribute("data-listing-card-variant"),
              clipped:
                card.scrollHeight > card.clientHeight + 1 ||
                card.scrollWidth > card.clientWidth + 1,
              titleOverflowIsClamped:
                title.scrollHeight <= title.clientHeight + 1 ||
                getComputedStyle(title).webkitLineClamp === "2",
              overlap:
                title.getBoundingClientRect().bottom >
                meta.getBoundingClientRect().top + 1,
            };
          }),
        );
      for (const card of geometry) {
        expect(card.variant).toBe("showcase");
        expect(card.clipped).toBe(false);
        expect(card.titleOverflowIsClamped).toBe(true);
        expect(card.overlap).toBe(false);
        widths.push(card.width);
      }
      const rows = new Map<number, typeof geometry>();
      for (const card of geometry) {
        const top = Math.round(card.top);
        rows.set(top, [...(rows.get(top) ?? []), card]);
      }
      for (const row of rows.values()) {
        expect(new Set(row.map((card) => card.compact)).size).toBe(1);
        for (let index = 1; index < row.length; index++) {
          expect(row[index].left - row[index - 1].left).toBeCloseTo(
            row[index - 1].width + (width < 640 ? 12 : 16),
            0,
          );
        }
        if (!row[0].compact) {
          const heights = row.map((card) => card.height);
          expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
        }
      }
      expect(rows.size).toBe(
        new Set(geometry.map((card) => card.compact)).size,
      );
    }
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    await expectNoHorizontalOverflow(page, `homepage shared rails ${width}`);

    if (width === 1352) {
      const recent = page.getByTestId("home-discovery-recent_listings");
      await recent.scrollIntoViewIfNeeded();
      await recent.screenshot({
        path: join(
          tmpdir(),
          `shongre-listing-rows-home-${testInfo.project.name}.png`,
        ),
      });
    }

    const deals = page.getByTestId("home-discovery-deals");
    await deals.scrollIntoViewIfNeeded();
    const firstDealCard = deals.locator("[data-listing-card]").first();
    const railHeight = () =>
      deals
        .locator(".listing-rail-track")
        .evaluate((element) => element.getBoundingClientRect().height);
    const independentRail = rails.first();
    await revealRail(independentRail);
    const independentHeight = await independentRail.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await deals.scrollIntoViewIfNeeded();
    const baseline = await railHeight();
    if (width === 1408) {
      // Browser-only stress: no listing or backend state is modified.
      const originalStyle = await firstDealCard.getAttribute("style");
      await firstDealCard.evaluate((element) => {
        const stressHeight = element.getBoundingClientRect().height + 40;
        element.style.height = `${stressHeight}px`;
        element.style.minHeight = `${stressHeight}px`;
        element.style.maxHeight = `${stressHeight}px`;
      });
      await expect.poll(railHeight).toBeGreaterThan(baseline);
      await revealRail(independentRail);
      expect(
        await independentRail.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBe(independentHeight);
      await deals.scrollIntoViewIfNeeded();
      await firstDealCard.evaluate((element, style) => {
        if (style === null) element.removeAttribute("style");
        else element.setAttribute("style", style);
      }, originalStyle);
      await expect.poll(railHeight).toBe(baseline);
    }
    const scroller = deals.locator(".overflow-x-auto");
    if (width >= 640) {
      await deals.getByRole("button", { name: /droite/i }).click();
      await expect
        .poll(() => scroller.evaluate((element) => element.scrollLeft))
        .toBeGreaterThan(0);
    }
    const link = deals
      .locator("[data-listing-card]")
      .first()
      .getByRole("link")
      .first();
    const href = await link.getAttribute("href");
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
