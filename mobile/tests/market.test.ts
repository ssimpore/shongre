import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ Platform: { OS: "web" } }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "WHEN_UNLOCKED_THIS_DEVICE_ONLY",
}));

import { apiRequest } from "@/api/http-client";
import {
  isSelectableMobileMarket,
  mobileMarketStore,
} from "@/features/market/market.store";
import { getCountryConfig } from "@shongre/contracts";
import { DemoListingsService } from "@/features/listings/listings.service";

afterEach(async () => {
  vi.unstubAllGlobals();
  await mobileMarketStore.resetForTests();
});

describe("mobile market context", () => {
  it.each(["FR", "BE", "CH", "LU"])(
    "accepts the operational %s market",
    async (marketCode) => {
      const market = await mobileMarketStore.select(marketCode);
      expect(market.code).toBe(marketCode);
      expect(isSelectableMobileMarket(market)).toBe(true);
    },
  );

  it.each(["SN", "BF"])(
    "keeps the coming-soon %s market unavailable",
    async (marketCode) => {
      expect(isSelectableMobileMarket(getCountryConfig(marketCode)!)).toBe(
        false,
      );
      await expect(mobileMarketStore.select(marketCode)).rejects.toThrow(
        "pas encore accessible",
      );
    },
  );

  it("sends the selected market on every native API request", async () => {
    await mobileMarketStore.select("CH");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/markets");

    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("X-Shongre-Market")).toBe("CH");
    expect(new Headers(request.headers).get("X-Shongre-Client")).toBe("native");
  });

  it("isolates deterministic demo listings and currency by market", async () => {
    const service = new DemoListingsService();
    const [france, belgium, switzerland] = await Promise.all([
      service.list("FR"),
      service.list("BE"),
      service.list("CH"),
    ]);

    expect(france.every((listing) => listing.marketCode === "FR")).toBe(true);
    expect(belgium.every((listing) => listing.marketCode === "BE")).toBe(true);
    expect(switzerland).toHaveLength(1);
    expect(switzerland[0]?.price.currency).toBe("CHF");
  });
});
