import { expect, test } from "@playwright/test";
import { testListingPath } from "./fixtures";
import { expectNoHorizontalOverflow, waitForStableLayout } from "./overflow";
import { useEstablishedConsent, usePersona } from "./personas";

test.describe("shared seller identity layout", () => {
  for (const width of [390, 1408]) {
    test(`places presence on the avatar and verification after the name at ${width}px`, async ({
      page,
    }) => {
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });
      await useEstablishedConsent(page);
      await usePersona(page, "guest");
      await page.setViewportSize({ width, height: 900 });
      await page.goto(testListingPath("list-109"), {
        waitUntil: "domcontentloaded",
      });
      await waitForStableLayout(page);

      expect(page.url()).toContain(testListingPath("list-109"));
      expect(await page.title()).not.toBe("");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("nextjs-portal")).toHaveCount(0);

      const identity = page.locator('[data-seller-identity="true"]');
      await identity.scrollIntoViewIfNeeded();
      await expect(identity).toBeVisible();
      await expect(identity).toContainText("Camille Martin");

      const avatar = identity.locator('[data-seller-avatar="true"]');
      const presence = avatar.locator('[data-ui-presence-indicator="true"]');
      const name = identity.locator('[data-seller-name="true"]');
      const verification = identity.locator(
        '[data-ui-verification-badge="true"]',
      );

      await expect(presence).toHaveCount(1);
      await expect(presence).toHaveAttribute(
        "aria-label",
        "Statut indisponible",
      );
      await expect(presence).toHaveAttribute("data-presence-status", "unknown");
      await expect(verification).toHaveCount(1);
      await expect(verification).toHaveText("Vérifié");
      await expect(verification).toHaveAttribute(
        "aria-label",
        "Profil vérifié",
      );
      await expect(
        avatar.locator('[data-ui-verified-icon="true"]'),
      ).toHaveCount(0);

      const [avatarBox, presenceBox, nameBox, verificationBox] =
        await Promise.all([
          avatar.boundingBox(),
          presence.boundingBox(),
          name.boundingBox(),
          verification.boundingBox(),
        ]);
      expect(avatarBox).not.toBeNull();
      expect(presenceBox).not.toBeNull();
      expect(nameBox).not.toBeNull();
      expect(verificationBox).not.toBeNull();
      expect(presenceBox!.x).toBeGreaterThan(
        avatarBox!.x + avatarBox!.width / 2,
      );
      expect(presenceBox!.y).toBeGreaterThan(
        avatarBox!.y + avatarBox!.height / 2,
      );
      expect(verificationBox!.x).toBeGreaterThanOrEqual(
        nameBox!.x + nameBox!.width,
      );
      expect(
        Math.abs(
          nameBox!.y +
            nameBox!.height / 2 -
            (verificationBox!.y + verificationBox!.height / 2),
        ),
      ).toBeLessThanOrEqual(2);

      await expectNoHorizontalOverflow(page, `seller identity at ${width}px`);
      await page.screenshot({
        path: `/tmp/shongre-seller-identity-${width}.png`,
        fullPage: false,
      });
      expect(runtimeErrors).toEqual([]);

      await identity.click();
      await expect(page).toHaveURL(/\/profil\/camille-martin$/);
      await expect(
        page.getByRole("heading", { name: "Camille Martin" }),
      ).toBeVisible();
    });
  }

  for (const width of [390, 1408]) {
    test(`keeps the same identity anatomy on the public profile at ${width}px`, async ({
      page,
    }) => {
      const runtimeErrors: string[] = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") runtimeErrors.push(message.text());
      });
      await useEstablishedConsent(page);
      await usePersona(page, "guest");
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/profil/camille-martin", {
        waitUntil: "domcontentloaded",
      });
      await waitForStableLayout(page);

      expect(page.url()).toContain("/profil/camille-martin");
      expect(await page.title()).not.toBe("");
      await expect(page.locator("nextjs-portal")).toHaveCount(0);

      const identity = page.locator('[data-seller-profile-identity="true"]');
      await identity.scrollIntoViewIfNeeded();
      await expect(identity).toBeVisible();
      await expect(identity).toContainText("Camille Martin");

      const avatar = identity.locator('[data-seller-avatar="true"]');
      const presence = avatar.locator('[data-ui-presence-indicator="true"]');
      const name = identity.locator('[data-seller-name="true"]');
      const verification = identity.locator(
        '[data-ui-verification-badge="true"]',
      );

      await expect(presence).toHaveCount(1);
      await expect(presence).toHaveAttribute(
        "aria-label",
        "Statut indisponible",
      );
      await expect(presence).toHaveAttribute("data-presence-status", "unknown");
      await expect(verification).toHaveCount(1);
      await expect(verification).toHaveText("Vérifié");
      await expect(verification).toHaveAttribute(
        "aria-label",
        "Profil vérifié",
      );
      await expect(
        avatar.locator('[data-ui-verified-icon="true"]'),
      ).toHaveCount(0);
      await expect(
        identity.getByText("Particulier", { exact: true }),
      ).toHaveCount(0);

      const [avatarBox, presenceBox, nameBox, verificationBox] =
        await Promise.all([
          avatar.boundingBox(),
          presence.boundingBox(),
          name.boundingBox(),
          verification.boundingBox(),
        ]);
      expect(avatarBox).not.toBeNull();
      expect(presenceBox).not.toBeNull();
      expect(nameBox).not.toBeNull();
      expect(verificationBox).not.toBeNull();
      expect(presenceBox!.x).toBeGreaterThan(
        avatarBox!.x + avatarBox!.width / 2,
      );
      expect(presenceBox!.y).toBeGreaterThan(
        avatarBox!.y + avatarBox!.height / 2,
      );
      expect(verificationBox!.x).toBeGreaterThanOrEqual(
        nameBox!.x + nameBox!.width,
      );
      expect(
        Math.abs(
          nameBox!.y +
            nameBox!.height / 2 -
            (verificationBox!.y + verificationBox!.height / 2),
        ),
      ).toBeLessThanOrEqual(2);

      await expectNoHorizontalOverflow(page, `seller profile at ${width}px`);
      await page.screenshot({
        path: `/tmp/shongre-profile-identity-${width}.png`,
        fullPage: false,
      });
      expect(runtimeErrors).toEqual([]);

      await page.getByRole("button", { name: /^Note moyenne/ }).click();
      await expect(page).toHaveURL(/\/profil\/camille-martin\?tab=reviews$/);
      await expect(
        page.getByRole("tab", { name: /Avis vérifiés/ }),
      ).toHaveAttribute("aria-selected", "true");
    });
  }
});
