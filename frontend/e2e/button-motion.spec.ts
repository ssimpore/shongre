import { expect, test, type Locator, type Page } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

async function readState(control: Locator) {
  return control.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      shadow: style.boxShadow,
      scale: style.scale === "none" ? 1 : Number(style.scale),
      translate: style.translate,
      outline: style.outlineStyle,
      focusVisible: element.matches(":focus-visible"),
      pressScale: Number(
        style.getPropertyValue("--motion-press-control-scale"),
      ),
    };
  });
}

async function expectStationaryHover(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const before = await readState(control);
  await control.hover();
  await expect
    .poll(async () => {
      const hover = await readState(control);
      return {
        positionStable:
          Math.abs(hover.x - before.x) < 0.5 &&
          Math.abs(hover.y - before.y) < 0.5,
        width: hover.width,
        height: hover.height,
        scale: hover.scale,
        translate: hover.translate,
        shadow: hover.shadow,
        outline: hover.outline,
      };
    })
    .toEqual({
      positionStable: true,
      width: before.width,
      height: before.height,
      scale: before.scale,
      translate: before.translate,
      shadow: before.shadow,
      outline: "none",
    });
}

async function expectPress(page: Page, control: Locator, reduced: boolean) {
  await control.hover();
  const expected = reduced ? 1 : (await readState(control)).pressScale;
  await page.mouse.down();
  try {
    await expect
      .poll(async () => (await readState(control)).scale)
      .toBe(expected);
    await expect
      .poll(async () => (await readState(control)).outline)
      .toBe("none");
  } finally {
    // Release outside the target so measuring feedback cannot trigger a write
    // or navigate away from the page under test.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await expect.poll(async () => (await readState(control)).scale).toBe(1);
}

for (const width of [390, 768, 1352, 1440]) {
  test(`shared homepage button motion at ${width}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 690 });
    await page.goto("/");
    await waitForStableLayout(page);
    await expect(page).toHaveTitle(/SHONGRE/);
    await expect(page.locator("[data-home-hero] h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const controls = page.locator(
      '[data-header-publish-cta] [data-ui="button"]:visible, #header-desktop-lang-button:visible, header button[id$="-submit-button"]:visible, [data-home-hero] [data-ui="button"]:visible, [data-home-hero] button[aria-controls="hero-boosted-track"]:visible',
    );
    expect(await controls.count()).toBeGreaterThanOrEqual(2);
    for (const control of await controls.all()) {
      await expectStationaryHover(page, control);
      await expectPress(page, control, false);
    }
    await expectNoHorizontalOverflow(page, `button motion ${width}`);
    await page.screenshot({
      path: testInfo.outputPath(`buttons-${width}.png`),
    });
    await page.getByRole("link", { name: "Explorer le catalogue" }).click();
    await expect(page).toHaveURL(/\/recherche/);
    expect(errors).toEqual([]);
  });
}

test("pointer focus stays quiet while keyboard focus stays visible", async ({
  page,
}, testInfo) => {
  await useEstablishedConsent(page);
  await page.setViewportSize({ width: 1352, height: 690 });
  await page.goto("/");
  await waitForStableLayout(page);
  const searchForm = page.getByRole("search", { name: "Recherche globale" });
  const initialSearchBorder = await searchForm.evaluate(
    (element) => getComputedStyle(element).borderColor,
  );
  await expectPress(
    page,
    searchForm.getByRole("button", { name: "Lancer la recherche" }),
    false,
  );
  await expect(searchForm).toHaveCSS("border-color", initialSearchBorder);
  const publish = page.locator('[data-header-publish-cta] [data-ui="button"]');
  await expect(publish).toBeVisible();
  await expectPress(page, publish, false);
  await expect(publish).toBeFocused();
  expect((await readState(publish)).focusVisible).toBe(false);
  await page.keyboard.press("Tab");
  await publish.focus();
  await expect
    .poll(async () => (await readState(publish)).outline)
    .toBe("solid");
  expect((await readState(publish)).focusVisible).toBe(true);
  await expect(page.locator("[data-header-publish-cta]")).toHaveCSS(
    "overflow",
    "visible",
  );
  await page.screenshot({
    path: testInfo.outputPath("buttons-keyboard-focus.png"),
  });
  await page.locator("#header-desktop-lang-button").click();
  const preferences = page.getByRole("dialog", {
    name: "Préférences régionales",
  });
  await expect(preferences).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preferences).not.toBeVisible();
});

for (const width of [390, 1352]) {
  test(`reduced motion keeps homepage controls still at ${width}px`, async ({
    page,
  }) => {
    await useEstablishedConsent(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width, height: 690 });
    await page.goto("/");
    await waitForStableLayout(page);
    const controls = page.locator(
      '[data-header-publish-cta] [data-ui="button"]:visible, #header-desktop-lang-button:visible, header button[id$="-submit-button"]:visible, [data-home-hero] [data-ui="button"]:visible, [data-home-hero] button[aria-controls="hero-boosted-track"]:visible',
    );
    await expect(page.locator("[data-home-hero] h1")).toBeVisible();
    for (const control of await controls.all())
      await expectPress(page, control, true);
  });
}

for (const width of [390, 1352]) {
  test(`listing CTAs share stationary hover at ${width}px`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 690 });
    await page.goto("/");
    await waitForStableLayout(page);
    const link = page.locator('a[href^="/annonce/"]').first();
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!);
    await waitForStableLayout(page);
    await expect(page.locator("main h1")).toBeVisible();
    const controls = page.locator('main [data-ui="button"]:visible');
    expect(await controls.count()).toBeGreaterThan(0);
    for (const control of (await controls.all()).slice(0, 4)) {
      await expectStationaryHover(page, control);
      await expectPress(page, control, false);
    }
    await page.screenshot({
      path: testInfo.outputPath(`listing-buttons-${width}.png`),
    });
    await expectNoHorizontalOverflow(page, `listing buttons ${width}`);
  });
}

test("search sorting preserves feedback and keyboard selection", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await useEstablishedConsent(page);
  await page.setViewportSize({ width: 1352, height: 690 });
  await page.goto("/recherche");
  await waitForStableLayout(page);
  const sort = page.getByRole("button", {
    name: "Trier les résultats",
    exact: true,
  });
  await expectStationaryHover(page, sort);
  await expectPress(page, sort, false);
  await sort.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/sortBy=price_asc/);
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await expect(sort).toBeFocused();
  await expect(sort).toHaveCSS("outline-style", "solid");
  expect(errors).toEqual([]);
});
