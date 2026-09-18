import { expect as baseExpect, test } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import { expectNoHorizontalOverflow } from "./overflow";

const expect = baseExpect.configure({ timeout: 30_000 });
const protectedPath = "/compte/messages?tab=unread#latest";
test.setTimeout(90_000);

for (const width of [1408, 390, 320]) {
  test(`guest authentication actions have equal widths at ${width}px`, async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 795 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(protectedPath);
    await expect(page).toHaveURL(
      new RegExp("/compte/messages\\?tab=unread#latest$"),
    );
    await expect(page).toHaveTitle(/Shongre/i);
    const prompt = page
      .getByRole("heading", { name: "Authentification requise", exact: true })
      .locator("..")
      .locator("..");
    const login = prompt.getByRole("link", {
      name: "Se connecter",
      exact: true,
    });
    const register = prompt.getByRole("link", {
      name: "Créer un compte",
      exact: true,
    });
    await expect(login).toBeVisible();
    await expect(register).toBeVisible();
    const first = (await login.boundingBox())!;
    const second = (await register.boundingBox())!;
    const panel = (await prompt.boundingBox())!;
    const actions = (await page
      .locator("[data-auth-prompt-actions]")
      .boundingBox())!;
    // The prompt uses `AuthLayout`'s compact width (`max-w-md`, 448px).
    expect(panel.width).toBeCloseTo(Math.min(width - 32, 448), 0);
    expect(actions.width).toBeLessThan(panel.width - 64);
    expect(Math.abs(actions.x + actions.width / 2 - width / 2)).toBeLessThan(1);
    expect(Math.abs(first.width - second.width)).toBeLessThan(1);
    expect(first.height).toBe(second.height);
    if (width >= 640) expect(first.y).toBe(second.y);
    else expect(second.y).toBeGreaterThan(first.y + first.height);
    await expectNoHorizontalOverflow(page, `auth prompt ${width}`);
    await prompt.screenshot({
      path: testInfo.outputPath(`auth-prompt-${width}.png`),
      scale: "css",
    });
    await login.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/connexion\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(
      protectedPath,
    );
    await expect(
      page.getByRole("main").getByRole("heading").first(),
    ).toBeVisible();
    await page.goBack();
    await register.click();
    await expect(page).toHaveURL(/\/inscription\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe(
      protectedPath,
    );
    await expect(
      page.getByRole("main").getByRole("heading").first(),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

for (const width of [1408, 390]) {
  test(`guest publication skips the authentication interstitial at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        errors.push(message.text());
      }
    });
    await useEstablishedConsent(page);
    await page.setViewportSize({ width, height: 795 });
    await page.goto("/deposer");

    await expect(page).toHaveURL(/\/connexion\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/deposer");
    await expect(
      page.getByRole("heading", {
        name: "Authentification requise",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.locator("[data-auth-card]")).toBeVisible();
    await expectNoHorizontalOverflow(page, `publish login ${width}`);

    await page
      .getByRole("link", { name: "Créer un compte", exact: true })
      .click();
    await expect(page).toHaveURL(/\/inscription\?/);
    expect(new URL(page.url()).searchParams.get("redirect")).toBe("/deposer");
    expect(errors).toEqual([]);
  });
}
