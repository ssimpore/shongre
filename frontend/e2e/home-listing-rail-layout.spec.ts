import { expect as baseExpect, test, type Locator } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

const expect = baseExpect.configure({ timeout: 30_000 });
test.setTimeout(120_000);

async function revealRail(rail: Locator) {
  // Scroll the containment root: WebKit can report skipped descendants in
  // view before their content-visibility section has actually been rendered.
  await rail.evaluate((element) =>
    element
      .closest("section")!
      .scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const firstCard = rail.locator("[data-listing-card]").first();
  await expect
    .poll(() =>
      firstCard.evaluate((card) =>
        card.checkVisibility({ contentVisibilityAuto: true }),
      ),
    )
    .toBe(true);
  await firstCard.scrollIntoViewIfNeeded();
  await expect(firstCard).toBeInViewport();
}

for (const width of [1408, 768, 390, 320]) {
  test(`homepage listing rails fit their own content without clipping at ${width}px`, async ({
    page,
  }) => {
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
              variant: card.getAttribute("data-listing-card-variant"),
              clipped:
                card.scrollHeight > card.clientHeight + 1 ||
                card.scrollWidth > card.clientWidth + 1 ||
                title.scrollHeight > title.clientHeight + 1,
              overlap:
                title.getBoundingClientRect().bottom >
                meta.getBoundingClientRect().top + 1,
            };
          }),
        );
      const heights: number[] = [];
      for (const card of geometry) {
        expect(card.variant).toBe("showcase");
        expect(card.clipped).toBe(false);
        expect(card.overlap).toBe(false);
        heights.push(card.height);
        widths.push(card.width);
      }
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(1);
    }
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1);
    await expectNoHorizontalOverflow(page, `homepage shared rails ${width}`);

    const deals = page.getByTestId("home-discovery-deals");
    await deals.scrollIntoViewIfNeeded();
    const title = deals.locator("[data-listing-card-title]").first();
    const originalTitle = (await title.textContent())!;
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
      await title.evaluate((element, text) => {
        element.textContent = `${text} ${text} ${text}`;
      }, originalTitle);
      await expect.poll(railHeight).toBeGreaterThan(baseline);
      await revealRail(independentRail);
      expect(
        await independentRail.evaluate(
          (element) => element.getBoundingClientRect().height,
        ),
      ).toBe(independentHeight);
      await deals.scrollIntoViewIfNeeded();
      await title.evaluate((element, text) => {
        element.textContent = text;
      }, originalTitle);
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
