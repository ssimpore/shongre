import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const memory = vi.hoisted(() => new Map<string, string>());

vi.mock("@/services/secure-storage/secure-storage", () => ({
  secureStorage: {
    get: async (key: string) => memory.get(key) ?? null,
    set: async (key: string, value: string) => memory.set(key, value),
    remove: async (key: string) => {
      memory.delete(key);
    },
  },
}));
vi.mock("@/features/market/market.store", () => ({
  mobileMarketStore: { getActive: () => ({ code: "FR" }) },
}));

import { apiRequest, MobileApiError, sessionStorage } from "@/api/http-client";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("central mobile HTTP client", () => {
  beforeEach(() => memory.clear());
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sends native, market, JSON, and bearer headers to the configured API", async () => {
    await sessionStorage.write({ token: "access-token", user: {} });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiRequest("/favorites", { method: "GET" }, "BE"),
    ).resolves.toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.mobile-test.shongre.invalid/api/v1/favorites",
    );
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-token");
    expect(headers.get("X-Shongre-Market")).toBe("BE");
    expect(headers.get("X-Shongre-Client")).toBe("native");
  });

  it("rotates a refresh token and retries the original request once", async () => {
    await sessionStorage.write({
      token: "expired-token",
      refreshToken: "refresh-token",
      user: { id: "account-a" },
    });
    const refreshed = {
      token: "new-token",
      refreshToken: "new-refresh-token",
      user: { id: "account-a" },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "UNAUTHORIZED" } }, 401),
      )
      .mockResolvedValueOnce(jsonResponse(refreshed))
      .mockResolvedValueOnce(jsonResponse({ listingIds: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/favorites")).resolves.toEqual({
      listingIds: [],
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = new Headers(fetchMock.mock.calls[2]?.[1]?.headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer new-token");
    await expect(sessionStorage.read()).resolves.toEqual(refreshed);
  });

  it("clears the session when the API rejects refresh", async () => {
    await sessionStorage.write({
      token: "expired-token",
      refreshToken: "rejected-refresh-token",
      user: { id: "account-a" },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 401)),
    );

    await expect(apiRequest("/favorites")).rejects.toBeInstanceOf(
      MobileApiError,
    );
    await expect(sessionStorage.read()).resolves.toBeNull();
  });

  it("clears the session when refresh returns an invalid success payload", async () => {
    await sessionStorage.write({
      token: "expired-token",
      refreshToken: "refresh-token",
      user: { id: "account-a" },
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
        .mockResolvedValueOnce(jsonResponse({ token: "incomplete" })),
    );

    await expect(apiRequest("/favorites")).rejects.toMatchObject({
      code: "INVALID_API_RESPONSE",
    });
    await expect(sessionStorage.read()).resolves.toBeNull();
  });

  it("returns an explicit offline error without fallback data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(apiRequest("/listings")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  it("shares token rotation across simultaneous expired requests", async () => {
    await sessionStorage.write({
      token: "expired",
      refreshToken: "refresh",
      user: {},
    });
    let finish!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const transport = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/auth/refresh")) return refresh;
      return new Headers(init.headers).get("Authorization") === "Bearer expired"
        ? jsonResponse({ error: {} }, 401)
        : jsonResponse({ listingIds: [] });
    });
    vi.stubGlobal("fetch", transport);
    const requests = [apiRequest("/favorites"), apiRequest("/favorites")];
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(3));
    finish(jsonResponse({ token: "fresh", refreshToken: "rotated", user: {} }));
    await expect(Promise.all(requests)).resolves.toEqual([
      { listingIds: [] },
      { listingIds: [] },
    ]);
    expect(
      transport.mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
    ).toHaveLength(1);
  });

  it.each(["logout", "login"])(
    "does not restore or replay an old session after %s during refresh",
    async (change) => {
      await sessionStorage.write({
        token: "expired",
        refreshToken: "refresh",
        user: {},
      });
      let finish!: (response: Response) => void;
      const refresh = new Promise<Response>((resolve) => {
        finish = resolve;
      });
      const transport = vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
        .mockReturnValueOnce(refresh);
      vi.stubGlobal("fetch", transport);
      const request = apiRequest("/listing-drafts", {
        method: "POST",
        body: "{}",
      });
      const rejected = expect(request).rejects.toMatchObject({
        code: "SESSION_CHANGED",
      });
      await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2));
      if (change === "logout") await sessionStorage.clear();
      else await sessionStorage.write({ token: "other-account", user: {} });
      finish(jsonResponse({ token: "old-account-refreshed", user: {} }));
      await rejected;
      expect((await sessionStorage.read())?.token ?? null).toBe(
        change === "logout" ? null : "other-account",
      );
      expect(transport).toHaveBeenCalledTimes(2);
    },
  );

  it("retains the session during a temporary refresh provider failure", async () => {
    const session = { token: "expired", refreshToken: "refresh", user: {} };
    await sessionStorage.write(session);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: {} }, 401))
        .mockResolvedValueOnce(
          jsonResponse({ error: { code: "UNAVAILABLE" } }, 503),
        ),
    );
    await expect(apiRequest("/favorites")).rejects.toMatchObject({
      status: 503,
    });
    await expect(sessionStorage.read()).resolves.toEqual(session);
  });

  it("discards a successful account response after logout", async () => {
    await sessionStorage.write({ token: "old-account", user: {} });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await sessionStorage.clear();
        return jsonResponse({ listingIds: ["private-favorite"] });
      }),
    );
    await expect(apiRequest("/favorites")).rejects.toMatchObject({
      code: "SESSION_CHANGED",
    });
  });

  it("times out even when headers arrived but the response body stalled", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url, init: RequestInit) => ({
        status: 200,
        ok: true,
        text: () =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
          }),
      })),
    );
    const request = apiRequest("/favorites");
    const rejected = expect(request).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.runAllTimersAsync();
    await rejected;
  });

  it("preserves caller cancellation without turning it into a network error", async () => {
    const controller = new AbortController();
    const cancelled = new Error("navigation cancelled");
    controller.abort(cancelled);
    const transport = vi.fn();
    vi.stubGlobal("fetch", transport);
    await expect(
      apiRequest("/favorites", { signal: controller.signal }),
    ).rejects.toBe(cancelled);
    expect(transport).not.toHaveBeenCalled();
  });
});
