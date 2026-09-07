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
  afterEach(() => vi.unstubAllGlobals());

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
});
