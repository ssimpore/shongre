import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forwardWebApiRequest } from "./web-api-proxy";

const api = "https://api.shongre.invalid";
const origins = [
  "https://fr.shongre.invalid",
  "https://intl.shongre.invalid",
  "https://invoices.shongre.invalid",
];
const upstream = vi.fn();

beforeEach(() => {
  for (const [key, value] of Object.entries({
    APP_ENV: "test",
    ENVIRONMENT_ID: "shongre-test",
    PUBLIC_FR_URL: origins[0],
    PUBLIC_INTL_URL: origins[1],
    API_URL: api,
    SHONGRE_MARKETPLACE_ORIGIN: origins[0],
    SHONGRE_FACTURATION_ORIGIN: origins[2],
    SHONGRE_SOLUTIONS_ORIGIN: "",
    SHONGRE_PROSPECTS_ORIGIN: "",
    SHONGRE_TRUST_PROXY_HOST: "false",
    SHONGRE_TRUST_PROXY_IP: "false",
  }))
    vi.stubEnv(key, value);
  upstream
    .mockReset()
    .mockImplementation(async () => Response.json({ ok: true }));
  vi.stubGlobal("fetch", upstream);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("first-party Web API transport", () => {
  it("forwards dependency readiness without session credentials", async () => {
    upstream.mockResolvedValueOnce(
      Response.json({ status: "not_ready" }, { status: 503 }),
    );
    const response = await forwardWebApiRequest(
      new Request(`${origins[2]}/readyz`, {
        headers: { cookie: "shongre_access=private" },
      }),
    );
    expect(response.status).toBe(503);
    expect(upstream.mock.calls[0][0].href).toBe(`${api}/readyz`);
    expect(upstream.mock.calls[0][1].headers.has("cookie")).toBe(false);
    expect(
      (
        await forwardWebApiRequest(
          new Request(`${origins[2]}/readyz`, { method: "POST" }),
        )
      ).status,
    ).toBe(400);
  });
  it("trusts edge host/IP only when explicitly enabled", async () => {
    vi.stubEnv("SHONGRE_TRUST_PROXY_HOST", "true");
    vi.stubEnv("SHONGRE_TRUST_PROXY_IP", "true");
    const response = await forwardWebApiRequest(
      new Request("http://private-listener.invalid/api/v1/auth/me", {
        headers: {
          "x-forwarded-host": new URL(origins[1]).host,
          "cf-connecting-ip": "203.0.113.1",
          "cf-ipcountry": "BE",
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(upstream.mock.calls[0][1].headers.get("cf-connecting-ip")).toBe(
      "203.0.113.1",
    );
    expect(upstream.mock.calls[0][1].headers.get("cf-ipcountry")).toBe("BE");
    expect(upstream.mock.calls[0][1].headers.has("x-forwarded-host")).toBe(
      false,
    );
  });

  it("rejects cross-site reads and refuses an upstream loop", async () => {
    expect(
      (
        await forwardWebApiRequest(
          new Request(`${origins[0]}/api/v1/auth/me`, {
            headers: { "sec-fetch-site": "cross-site" },
          }),
        )
      ).status,
    ).toBe(403);
    vi.stubEnv("API_URL", origins[0]);
    expect(
      (await forwardWebApiRequest(new Request(`${origins[0]}/api/v1/auth/me`)))
        .status,
    ).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(origins)(
    "forwards authenticated writes and host-only cookies for %s",
    async (origin) => {
      upstream.mockResolvedValueOnce(
        new Response("{}", {
          headers: [
            [
              "Set-Cookie",
              "shongre_access=rotated; Path=/; Domain=shongre.invalid; HttpOnly; Secure; SameSite=Lax",
            ],
            ["Set-Cookie", "shongre_csrf=csrf; Path=/; Secure; SameSite=Lax"],
            ["Set-Cookie", "unrelated=private; Path=/"],
          ],
        }),
      );
      const response = await forwardWebApiRequest(
        new Request(`${origin}/api/v1/invoicing/invoices?limit=2`, {
          method: "POST",
          headers: {
            origin,
            referer: `${origin}/compte?private=query`,
            cookie:
              "shongre_access=session; shongre_csrf=csrf; tracking=private",
            "x-csrf-token": "csrf",
            "x-shongre-market": "BE",
            "idempotency-key": "invoice-retry",
            authorization: "Bearer must-not-forward",
            "x-shongre-client": "native",
            "cf-connecting-ip": "203.0.113.1",
          },
          body: "{}",
        }),
      );
      expect(response.status).toBe(200);
      const [target, options] = upstream.mock.calls[0];
      expect(target.href).toBe(`${api}/api/v1/invoicing/invoices?limit=2`);
      expect(options.redirect).toBe("manual");
      expect(options.cache).toBe("no-store");
      expect(Object.fromEntries(options.headers)).toMatchObject({
        cookie: "shongre_access=session; shongre_csrf=csrf",
        "x-csrf-token": "csrf",
        "x-shongre-market": "BE",
        "idempotency-key": "invoice-retry",
        "x-shongre-client": "web",
        origin,
        referer: `${origin}/compte`,
      });
      expect(options.headers.has("authorization")).toBe(false);
      expect(options.headers.has("cf-connecting-ip")).toBe(false);
      expect(response.headers.getSetCookie()).toEqual([
        "shongre_access=rotated; Path=/; HttpOnly; Secure; SameSite=Lax",
        "shongre_csrf=csrf; Path=/; Secure; SameSite=Lax",
      ]);
      expect(response.headers.get("cache-control")).toBe("private, no-store");
      expect(response.headers.get("x-robots-tag")).toBe(
        "noindex, nofollow, noarchive",
      );
    },
  );

  it.each([undefined, "https://attacker.invalid", "null", origins[1]])(
    "rejects an unsafe mutation Origin %s",
    async (origin) => {
      const response = await forwardWebApiRequest(
        new Request(`${origins[0]}/api/v1/auth/login`, {
          method: "POST",
          headers: origin ? { origin } : {},
          body: "{}",
        }),
      );
      expect(response.status).toBe(403);
      expect(upstream).not.toHaveBeenCalled();
    },
  );

  it("rejects unconfigured hosts and path traversal without calling upstream", async () => {
    for (const url of [
      "https://attacker.invalid/api/v1/auth/me",
      `${origins[0]}/api/v1/../../private`,
    ]) {
      expect((await forwardWebApiRequest(new Request(url))).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
  });

  it("preserves permission errors, conditional responses, and logout cookie expiry", async () => {
    for (const status of [401, 403, 404, 409, 429, 304]) {
      upstream.mockResolvedValueOnce(
        new Response(null, {
          status,
          headers: {
            "Retry-After": "12",
            "Set-Cookie":
              "shongre_access=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
          },
        }),
      );
      const response = await forwardWebApiRequest(
        new Request(`${origins[0]}/api/v1/auth/me`),
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("retry-after")).toBe("12");
      expect(response.headers.getSetCookie()[0]).toContain("Max-Age=0");
    }
  });

  it("never follows upstream redirects or exposes upstream errors", async () => {
    upstream.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: "https://attacker.invalid" },
      }),
    );
    expect(
      (await forwardWebApiRequest(new Request(`${origins[0]}/api/v1/auth/me`)))
        .status,
    ).toBe(502);
    upstream.mockRejectedValueOnce(new Error("sensitive-provider-details"));
    const response = await forwardWebApiRequest(
      new Request(`${origins[0]}/api/v1/auth/me`),
    );
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sensitive-provider-details");
  });
});
