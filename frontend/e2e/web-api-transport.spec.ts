import { expect, test, type Page } from "@playwright/test";
import { useEstablishedConsent } from "./personas";
import {
  browserApi,
  loginWithForm,
  refreshSessionAndReload,
} from "./browser-api";

test.use({ trace: "off", screenshot: "off", video: "off" });

test.describe("first-party API browser regression", () => {
  test.setTimeout(120_000);
  test.skip(
    process.env.SHONGRE_E2E_API_TRANSPORT !== "1",
    "Run make test-web-api-transport for the isolated API fixture.",
  );

  async function call(
    page: Page,
    path: string,
    method = "GET",
    body?: unknown,
    csrf = true,
  ) {
    return browserApi(page, path, {
      method,
      body,
      csrf,
      market: new URL(page.url()).hostname.startsWith("intl.") ? "BE" : "FR",
    });
  }

  test("logs in through the rendered form, refreshes, writes and logs out on both sites", async ({
    page,
    context,
  }) => {
    await useEstablishedConsent(page);
    for (const [origin, prefix] of [
      [process.env.PUBLIC_FR_URL!, ""],
      [process.env.PUBLIC_INTL_URL!, "/be"],
      [process.env.SHONGRE_FACTURATION_ORIGIN!, ""],
    ]) {
      await page.goto(`${origin}${prefix}/connexion`, {
        waitUntil: "domcontentloaded",
      });
      expect((await call(page, "/auth/me")).body.id).toBeUndefined();
      await loginWithForm(
        page,
        origin,
        {
          email: "thomas.laurent@example.fr",
          password: process.env.DEMO_ACCOUNT_PASSWORD!,
          id: "user_thomas",
        },
        prefix,
      );
      const cookies = await context.cookies(origin);
      expect(
        cookies.find((cookie) => cookie.name === "shongre_access")?.httpOnly,
      ).toBe(true);
      expect(
        cookies.find((cookie) => cookie.name === "shongre_access")?.domain,
      ).toBe(new URL(origin).hostname);
      expect(
        await page.evaluate(() => document.cookie.includes("shongre_csrf=")),
      ).toBe(true);
      expect(
        (await call(page, "/listing-drafts", "POST", undefined, false)).status,
      ).toBe(403);
      expect((await call(page, "/listing-drafts", "POST")).status).toBe(200);
      await refreshSessionAndReload(page, prefix === "/be" ? "BE" : "FR");
      expect(new URL(page.url()).origin).toBe(origin);
      expect(
        (await context.cookies(origin)).some(
          (cookie) => cookie.name === "shongre_access",
        ),
        `Access cookie after reload on ${new URL(origin).hostname}`,
      ).toBe(true);
      const restored = await call(page, "/auth/me");
      expect(
        restored.status,
        `Identity status after reload on ${new URL(origin).hostname}, path ${new URL(page.url()).pathname}`,
      ).toBe(200);
      expect(
        restored.body.id,
        `Identity after reload on ${new URL(origin).hostname}`,
      ).toBe("user_thomas");
      expect((await call(page, "/auth/logout", "POST", {})).status).toBe(200);
      expect((await call(page, "/auth/me")).body.id).toBeUndefined();
      expect(
        (await context.cookies(origin)).some(
          (cookie) => cookie.name === "shongre_access",
        ),
      ).toBe(false);
    }
  });

  test("publishes a transaction review through the cookie-authenticated API and preserves CSRF", async ({
    page,
  }, testInfo) => {
    await useEstablishedConsent(page);
    const origin = process.env.PUBLIC_FR_URL!;
    await loginWithForm(page, origin, {
      email: "thomas.laurent@example.fr",
      password: process.env.DEMO_ACCOUNT_PASSWORD!,
      id: "user_thomas",
    });
    const orderId = `browser-review-${testInfo.project.name}`;
    await page.goto(`${origin}/compte/achats?transactionId=${orderId}`, {
      waitUntil: "domcontentloaded",
    });
    const form = page.getByRole("region", {
      name: "Votre avis sur cette transaction",
    });
    await expect(
      form.getByRole("combobox", { name: "Note", exact: true }),
    ).toBeVisible();
    expect(
      (
        await call(
          page,
          "/reviews/submit",
          "POST",
          {
            transactionId: orderId,
            rating: 4,
            comment: "Un avis sans jeton CSRF est refusé.",
          },
          false,
        )
      ).status,
    ).toBe(403);
    await form
      .getByRole("combobox", { name: "Note", exact: true })
      .selectOption("4");
    await form
      .getByRole("textbox", { name: "Votre expérience", exact: true })
      .fill("Article conforme, transaction bien organisée.");
    await form.getByRole("button", { name: "Publier mon avis" }).click();
    await expect(form).toContainText("Votre avis est enregistré.");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(form).toContainText("Votre avis est enregistré.");
    const eligibility = await call(page, `/orders/${orderId}/review`);
    expect(eligibility.body).toMatchObject({
      eligible: false,
      reason: "ALREADY_REVIEWED",
      review: {
        verifiedTransaction: true,
        authorId: "user_thomas",
        targetUserId: "user_camille",
      },
    });
    expect(eligibility.body.review).not.toHaveProperty("orderId");
  });

  test("contains malformed paths and allows idempotent request headers", async ({
    page,
  }) => {
    await page.goto(new URL("/healthz", process.env.PUBLIC_FR_URL!).href);
    const result = await page.evaluate(async () => {
      const malformed = await fetch("/api/v1/listings/%E0%A4%A");
      const write = await fetch("/api/v1/invoicing/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "browser-regression",
        },
        body: "{}",
      });
      return { malformed: malformed.status, write: write.status };
    });
    expect(result).toEqual({ malformed: 400, write: 401 });
  });
});
