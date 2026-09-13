import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent } from "./personas";

for (const width of [390, 1024, 1408]) {
  test.describe(`newsletter signup at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1024 });

    test("gives the email field useful width without breaking the form", async ({
      page,
    }, testInfo) => {
      await useEstablishedConsent(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await page.goto("/newsletter");
      await waitForStableLayout(page);
      await expect(page).toHaveTitle(/Newsletter Shongre/);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);

      const form = page.locator(
        'form[data-marketplace-action="newsletter.subscribe"]',
      );
      const email = form.getByRole("textbox", {
        name: "Votre adresse email",
      });
      const submit = form.getByRole("button", { name: "S'inscrire" });
      await expect(form).toBeVisible();
      await expect(email).toBeVisible();
      await expect(submit).toBeVisible();

      const emailBox = await email.boundingBox();
      const formBox = await form.boundingBox();
      expect(emailBox).not.toBeNull();
      expect(formBox).not.toBeNull();
      if (width >= 1024) {
        expect(emailBox!.width).toBeGreaterThanOrEqual(320);
      } else {
        expect(Math.abs(emailBox!.width - formBox!.width)).toBeLessThanOrEqual(
          1,
        );
      }

      await email.fill("newsletter-layout@example.com");
      await expect(email).toHaveValue("newsletter-layout@example.com");
      await form.getByRole("checkbox").check();
      await expect(form.getByRole("checkbox")).toBeChecked();
      await expectNoHorizontalOverflow(page, `newsletter signup ${width}px`);

      if (testInfo.project.name === "chromium" && width !== 1024) {
        await page.screenshot({
          path: `/tmp/shongre-newsletter-signup-${width}.png`,
          animations: "disabled",
        });
      }
      expect(errors).toEqual([]);
    });
  });
}

for (const width of [390, 1408]) {
  test.describe(`homepage newsletter at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 }, hasTouch: width < 1024 });

    test("sits directly below the Pro callout and keeps the shared content width", async ({
      page,
    }, testInfo) => {
      await useEstablishedConsent(page);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      let subscriptionRequest: Record<string, unknown> | null = null;
      await page.route(
        "**/api/v1/marketing/public/subscriptions",
        async (route) => {
          subscriptionRequest = route.request().postDataJSON();
          await route.fulfill({
            status: 202,
            contentType: "application/json",
            body: JSON.stringify({
              accepted: true,
              status: "PENDING_CONFIRMATION",
              message: "Consultez votre messagerie pour confirmer.",
            }),
          });
        },
      );

      await page.goto("/");
      await waitForStableLayout(page);
      await expect(page).toHaveTitle(/SHONGRE/);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);

      const proCallout = page
        .getByRole("heading", {
          name: "Vous êtes commerçant, artisan ou professionnel ?",
        })
        .locator("xpath=ancestor::section");
      const newsletter = page.locator('[data-home-newsletter="true"]');
      const footer = page.locator("footer");
      await expect(proCallout).toBeVisible();
      await expect(newsletter).toBeVisible();
      await expect(footer).toBeVisible();

      const order = await page.evaluate(() => {
        const pro = document
          .querySelector("#home-pro-title")
          ?.closest("section");
        const signup = document.querySelector('[data-home-newsletter="true"]');
        const footerElement = document.querySelector("footer");
        if (!pro || !signup || !footerElement) return null;
        return {
          proBeforeSignup: Boolean(
            pro.compareDocumentPosition(signup) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
          signupBeforeFooter: Boolean(
            signup.compareDocumentPosition(footerElement) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        };
      });
      expect(order).toEqual({
        proBeforeSignup: true,
        signupBeforeFooter: true,
      });

      const [proBox, newsletterBox] = await Promise.all([
        proCallout.boundingBox(),
        newsletter.boundingBox(),
      ]);
      expect(proBox).not.toBeNull();
      expect(newsletterBox).not.toBeNull();
      expect(Math.abs(proBox!.x - newsletterBox!.x)).toBeLessThanOrEqual(1);
      expect(
        Math.abs(proBox!.width - newsletterBox!.width),
      ).toBeLessThanOrEqual(1);

      const form = newsletter.locator(
        'form[data-marketplace-action="newsletter.subscribe"]',
      );
      const email = form.getByRole("textbox", { name: "Votre adresse email" });
      await email.fill("home@example.com");
      await form.getByRole("checkbox").check();
      await expect(email).toHaveValue("home@example.com");
      await expect(form.getByRole("checkbox")).toBeChecked();
      await expectNoHorizontalOverflow(page, `homepage newsletter ${width}px`);

      await newsletter.scrollIntoViewIfNeeded();
      if (testInfo.project.name === "chromium") {
        await page.screenshot({
          path: `/tmp/shongre-homepage-newsletter-${width}.png`,
          animations: "disabled",
        });
      }
      await form.getByRole("button", { name: "S'inscrire" }).click();
      await expect(
        newsletter.getByRole("heading", { name: "Vérifiez votre messagerie" }),
      ).toBeVisible();
      expect(subscriptionRequest).toMatchObject({
        email: "home@example.com",
        source: "HOMEPAGE",
        consentGiven: true,
      });
      expect(errors).toEqual([]);
    });
  });
}
