import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { httpClient } from "./http-client";

vi.mock("../../client/api-client.config", () => ({
  apiClientConfig: { apiBaseUrl: "/api/v1" },
  resolveApiRequestBaseUrl: (value: string) => value,
}));
vi.mock("../../../domains/market/market-routing", () => ({
  currentBrowserMarketCode: () => "FR",
}));
vi.mock("../../../services/telemetry.service", () => ({
  telemetryService: { captureException: vi.fn() },
}));

const transport = vi.fn();
const cookieDocument = { cookie: "" };
const denied = () =>
  Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });
beforeEach(() => {
  cookieDocument.cookie = "";
  transport.mockReset();
  vi.stubGlobal("document", cookieDocument);
  vi.stubGlobal("fetch", transport);
});
afterEach(() => vi.unstubAllGlobals());

describe("session-aware HTTP retries", () => {
  it("does not refresh a guest request", async () => {
    transport.mockResolvedValueOnce(denied());
    await expect(httpClient.get("/favorites")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("retries a late guest response with the new login without rotating it", async () => {
    transport
      .mockImplementationOnce(async () => {
        cookieDocument.cookie = "shongre_csrf=new-login";
        return denied();
      })
      .mockResolvedValueOnce(Response.json({ listingIds: [] }));
    await expect(httpClient.get("/favorites")).resolves.toEqual({
      listingIds: [],
    });
    expect(transport.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/favorites",
      "/api/v1/favorites",
    ]);
  });

  it("does not refresh or retry after logout during an in-flight request", async () => {
    cookieDocument.cookie = "shongre_csrf=old-session";
    transport.mockImplementationOnce(async () => {
      cookieDocument.cookie = "";
      return denied();
    });
    await expect(httpClient.get("/favorites")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("never replays a pending write into a newly changed session", async () => {
    cookieDocument.cookie = "shongre_csrf=old-session";
    transport.mockImplementationOnce(async () => {
      cookieDocument.cookie = "shongre_csrf=different-session";
      return denied();
    });
    await expect(httpClient.post("/listing-drafts")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("shares one refresh between concurrent expired-session requests", async () => {
    cookieDocument.cookie = "shongre_csrf=old-session";
    let resolveRefresh!: (response: Response) => void;
    const refresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    let favoriteCalls = 0;
    transport.mockImplementation(async (url: string) => {
      if (url.endsWith("/auth/refresh")) return refresh;
      favoriteCalls += 1;
      return favoriteCalls <= 2 ? denied() : Response.json({ listingIds: [] });
    });
    const requests = [
      httpClient.get("/favorites"),
      httpClient.get("/favorites"),
    ];
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(3));
    cookieDocument.cookie = "shongre_csrf=rotated-session";
    resolveRefresh(Response.json({ success: true }));
    await expect(Promise.all(requests)).resolves.toEqual([
      { listingIds: [] },
      { listingIds: [] },
    ]);
    expect(
      transport.mock.calls.filter(([url]) => url.endsWith("/auth/refresh")),
    ).toHaveLength(1);
  });
});
