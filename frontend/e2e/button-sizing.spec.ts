import { expect, test, type Page } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";

async function expectContainedButtons(page: Page, minimum: number) {
  await expect(async () => {
    const buttons = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-ui="button"]')].flatMap(
        (element) => {
          const rect = element.getBoundingClientRect();
          if (
            !rect.width ||
            !rect.height ||
            getComputedStyle(element).visibility === "hidden"
          )
            return [];
          const label = element.querySelector("span");
          const labelRect = label?.getBoundingClientRect();
          return [
            {
              label: element.textContent?.trim(),
              size: element.getAttribute("data-size"),
              height: rect.height,
              overflow: element.scrollWidth > element.clientWidth + 1,
              clipped: labelRect ? labelRect.bottom > rect.bottom + 1 : false,
            },
          ];
        },
      ),
    );
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.overflow, button.label).toBe(false);
      expect(button.clipped, button.label).toBe(false);
      expect(button.height, button.label).toBeGreaterThanOrEqual(
        minimum === 44 || button.size !== "sm" ? minimum : 32,
      );
    }
  }).toPass({ timeout: 10_000 });
}

for (const width of [320, 375, 390, 430, 768, 1024, 1104, 1280, 1440, 2048]) {
  test.describe(`button sizing at ${width}px`, () => {
    const touch = width < 1024;
    test.use({ viewport: { width, height: 900 }, hasTouch: touch });

    test("matches header, hero, and newsletter actions without clipping", async ({
      page,
    }, testInfo) => {
      await useEstablishedConsent(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await expect(page).toHaveTitle(/SHONGRE/i);
      const hero = page.locator("[data-home-hero]");
      await expect(hero.locator("h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const height = touch ? 44 : 40;
      const actions = hero.locator('[data-ui="button"]');
      await expect(actions).toHaveCount(2);
      for (const action of await actions.all()) {
        await expect(action).toHaveCSS("height", `${height}px`);
      }
      const headerAction = page.locator(
        '[data-header-publish-cta] [data-ui="button"]',
      );
      if (width >= 1024) await expect(headerAction).toBeVisible();
      // A WebKit scrollbar can put a 768px window below the tablet breakpoint.
      if (await headerAction.isVisible()) {
        await expect(headerAction).toHaveCSS("height", `${height}px`);
      }
      await expectContainedButtons(page, height);
      await expectNoHorizontalOverflow(page, `homepage buttons ${width}`);
      if (testInfo.project.name === "chromium" && [390, 1104].includes(width)) {
        await page.screenshot({
          path: `/tmp/shongre-buttons-after-${width}.png`,
        });
      }

      await hero.getByRole("link", { name: "Explorer le catalogue" }).click();
      await expect(page).toHaveURL(/\/recherche/);
      await expect(page.locator("main")).toBeVisible();
      await waitForStableLayout(page);
      await expectContainedButtons(page, height);
      await expectNoHorizontalOverflow(page, `search buttons ${width}`);

      await page.goto("/newsletter");
      const newsletter = page.locator(
        'form[data-marketplace-action="newsletter.subscribe"]',
      );
      await expect(newsletter).toBeVisible();
      await expect(newsletter.locator('input[type="email"]')).toHaveCSS(
        "height",
        `${height}px`,
      );
      await expect(newsletter.locator('button[type="submit"]')).toHaveCSS(
        "height",
        `${height}px`,
      );
      await expectNoHorizontalOverflow(page, `newsletter buttons ${width}`);
      expect(errors).toEqual([]);
    });
  });
}

for (const touch of [false, true]) {
  test.describe(`form actions with ${touch ? "touch" : "pointer"} input`, () => {
    test.use({
      viewport: { width: touch ? 390 : 1280, height: 900 },
      hasTouch: touch,
    });
    test("keeps primary form actions consistent across routes", async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await useEstablishedConsent(page);
      const height = touch ? 44 : 40;
      for (const path of [
        "/connexion",
        "/inscription",
        "/mot-de-passe-oublie",
        "/contact",
      ]) {
        await page.goto(path);
        await waitForStableLayout(page);
        if (path === "/contact") {
          await page
            .getByRole("button", { name: /Autre demande ou suggestion/ })
            .click();
          await page
            .getByRole("button", {
              name: "Question générale sur le fonctionnement de Shongre",
              exact: true,
            })
            .click();
        }
        const action = page
          .locator('main button[data-ui="button"][data-size="md"]')
          .first();
        await expect(action).toBeVisible();
        await expect(action).toHaveCSS("height", `${height}px`);
        if (path === "/connexion") {
          for (const provider of ["Google", "Apple", "Facebook"]) {
            await expect(
              page.getByRole("button", { name: `Continuer avec ${provider}` }),
            ).toHaveCSS("height", `${height}px`);
          }
        }
        await expectContainedButtons(page, height);
        await expectNoHorizontalOverflow(page, `form buttons ${path}`);
      }
    });

    test("allows enlarged labels to grow without clipping or losing their name", async ({
      page,
    }) => {
      await useEstablishedConsent(page);
      await page.goto("/connexion");
      const submit = page.locator('button[type="submit"][data-ui="button"]');
      await expect(submit).toBeVisible();
      const label = await submit.innerText();
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
      await expect(submit).toHaveAccessibleName(label);
      await expectContainedButtons(page, touch ? 44 : 40);
      await expect(submit).toBeEnabled();
      await submit.focus();
      await expect(submit).toBeFocused();
    });
  });
}
