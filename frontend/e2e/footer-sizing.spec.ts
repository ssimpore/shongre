import { expect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

for (const width of [320, 390, 768, 1024, 1408, 1776, 2048]) {
  test.describe(`footer sizing at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1024 });

    test("matches the full-width header and keeps type compact", async ({
      page,
    }) => {
      await useEstablishedConsent(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/education/professeur/ines-martin-mathematiques");
      await expect(page).toHaveTitle(/SHONGRE/);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);
      const footer = page.locator("footer");
      await footer.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      const header = page.locator("header").first();
      const headerContainer = header.locator(":scope > div").first();
      const footerContainer = footer.locator("[data-footer-container]");
      const geometry = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          paddingLeft: styles.paddingLeft,
          paddingRight: styles.paddingRight,
        };
      };
      expect(await footer.evaluate(geometry)).toEqual(
        await header.evaluate(geometry),
      );
      expect(await footerContainer.evaluate(geometry)).toEqual(
        await headerContainer.evaluate(geometry),
      );
      const headerImages = page.locator("header [data-brand-signature] img");
      const footerImages = footer.locator("[data-brand-signature] img");
      await expect(footerImages).toHaveCount(2);
      for (let index = 0; index < 2; index++) {
        await expect
          .poll(() =>
            footerImages.nth(index).evaluate((image) => image.naturalWidth),
          )
          .toBeGreaterThan(0);
        const dimensions = (element: HTMLElement) => {
          const { width, height } = element.getBoundingClientRect();
          return { width, height };
        };
        expect(await footerImages.nth(index).evaluate(dimensions)).toEqual(
          await headerImages.nth(index).evaluate(dimensions),
        );
      }
      const typography = await footer
        .locator("h2, p, li > a, li > button, #footer-market-button")
        .evaluateAll((elements) =>
          elements.map((element) => ({
            label: element.textContent?.trim(),
            size: Number.parseFloat(getComputedStyle(element).fontSize),
          })),
        );
      for (const { label, size } of typography) {
        expect(size, label).toBeGreaterThanOrEqual(13);
        expect(size, label).toBeLessThanOrEqual(14);
      }
      const mobileApps = footer.getByRole("region", {
        name: "Applications mobiles Shongre",
      });
      const storeBadges = mobileApps.locator("[data-store-badge]");
      await expect(storeBadges).toHaveCount(2);
      await expect(storeBadges).toContainText(["App Store", "Google Play"]);
      for (const storeBadge of await storeBadges.all()) {
        await expect(storeBadge).toHaveAttribute("aria-disabled", "true");
      }
      const storeBadgeGeometry = await storeBadges.evaluateAll((badges) =>
        badges.map((badge) => {
          const { width, height } = badge.getBoundingClientRect();
          return { width, height };
        }),
      );
      expect(new Set(storeBadgeGeometry.map(({ height }) => height)).size).toBe(
        1,
      );
      for (const { width, height } of storeBadgeGeometry) {
        expect(width).toBeGreaterThanOrEqual(128);
        expect(height).toBe(48);
      }
      const storeIconGeometry = await storeBadges
        .locator("svg")
        .evaluateAll((icons) =>
          icons.map((icon) => {
            const { width, height } = icon.getBoundingClientRect();
            return { width, height };
          }),
        );
      expect(storeIconGeometry).toEqual([
        { width: 24, height: 24 },
        { width: 24, height: 24 },
      ]);
      const oversizedIcons = await footer.locator("svg").evaluateAll(
        (icons) =>
          icons.filter((icon) => {
            if (icon.closest("[data-store-badge]")) return false;
            const rect = icon.getBoundingClientRect();
            return rect.width > 20 || rect.height > 20;
          }).length,
      );
      expect(oversizedIcons).toBe(0);
      await expectNoHorizontalOverflow(page, `footer ${width}px`);
      if ([390, 1408, 2048].includes(width)) {
        await footer.screenshot({
          path: `/tmp/shongre-footer-sizing-${width}.png`,
        });
      }

      // WebKit's scrollbar can keep a boundary viewport below the CSS breakpoint.
      const hasColumns = await page.evaluate(
        () => window.matchMedia("(min-width: 48rem)").matches,
      );
      if (!hasColumns) {
        const buy = footer.getByRole("button", {
          name: "Acheter",
          exact: true,
        });
        await expect(buy).toHaveAttribute("aria-expanded", "false");
        await buy.click();
        await expect(buy).toHaveAttribute("aria-expanded", "true");
      }
      await footer
        .getByRole("link", { name: "Toutes les annonces", exact: true })
        .click();
      await expect(page).toHaveURL(/\/recherche/);
      await expect(page.locator("main")).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}
