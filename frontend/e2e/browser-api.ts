import { expect, type Page } from "@playwright/test";

/** Exercise browser cookies, CSRF and the first-party transport, not APIRequestContext. */
export async function browserApi(
  page: Page,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    market?: string;
    csrf?: boolean;
    idempotencyKey?: string;
  } = {},
) {
  return page.evaluate(
    async ({ path, options }) => {
      const token = document.cookie
        .split(";")
        .map((value) => value.trim())
        .find((value) => value.startsWith("shongre_csrf="))
        ?.split("=")
        .slice(1)
        .join("=");
      const response = await fetch(`/api/v1${path}`, {
        method: options.method || "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Shongre-Market":
            options.market ||
            /^\/([a-z]{2})(?:\/|$)/
              .exec(location.pathname)?.[1]
              .toUpperCase() ||
            "FR",
          ...(options.csrf !== false && token
            ? { "X-CSRF-Token": decodeURIComponent(token) }
            : {}),
          ...(options.idempotencyKey
            ? { "Idempotency-Key": options.idempotencyKey }
            : {}),
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      return {
        status: response.status,
        body: ((await response.json()) || {}) as Record<string, unknown>,
      };
    },
    { path, options },
  );
}

export async function loginWithForm(
  page: Page,
  origin: string,
  account: { email: string; password: string; id: string },
  prefix = "",
) {
  const documentResponse = await page.goto(`${origin}${prefix}/connexion`, {
    waitUntil: "domcontentloaded",
  });
  expect(documentResponse?.status()).toBe(200);
  await expect(
    page.locator("#login-email"),
    `Sign-in form on ${new URL(origin).hostname}`,
  ).toBeVisible();
  await page.locator("#login-email").fill(account.email);
  await page.locator("#login-password").fill(account.password);
  const response = page.waitForResponse(
    (value) =>
      new URL(value.url()).pathname === "/api/v1/auth/login" &&
      value.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect
    .poll(async () => (await browserApi(page, "/auth/me")).body.id)
    .toBe(account.id);
  await expect(page.locator("#login-email")).toBeHidden();
}

/** Exercise real cookie rotation without competing with the app's own refresh lock. */
export async function refreshSessionAndReload(page: Page, market: string) {
  const applicationUrl = page.url();
  // A raw test fetch is not part of HttpClient's single-flight refresh. Unload
  // the app before issuing it, then restore the real rendered application.
  const probe = await page.goto(new URL("/healthz", applicationUrl).href, {
    waitUntil: "load",
  });
  expect(probe?.status()).toBe(200);
  expect(
    (
      await browserApi(page, "/auth/refresh", {
        method: "POST",
        body: {},
        market,
      })
    ).status,
  ).toBe(200);
  const restored = await page.goto(applicationUrl, {
    waitUntil: "domcontentloaded",
  });
  expect(restored?.status()).toBe(200);
}
