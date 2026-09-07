import { describe, expect, it, vi } from "vitest";
import {
  getFavorites,
  putListingsByIdFavorite,
  getListingsSearch,
} from "../generated/api-client";

describe("OpenAPI generated operations", () => {
  it("encodes resource IDs and serializes the documented favorite mutation", async () => {
    const transport = vi.fn().mockResolvedValue({ isFavorite: true });
    const controller = new AbortController();
    await expect(
      putListingsByIdFavorite(transport, {
        path: { id: "listing/with?reserved#characters" },
        body: { isFavorite: true },
        headers: { "X-Shongre-Market": "BE" },
        signal: controller.signal,
      }),
    ).resolves.toEqual({ isFavorite: true });
    const [path, init] = transport.mock.calls[0]!;
    expect(path).toBe(
      "/listings/listing%2Fwith%3Freserved%23characters/favorite",
    );
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({ isFavorite: true });
    expect(init.headers.get("X-Shongre-Market")).toBe("BE");
    expect(init.signal).toBe(controller.signal);
  });

  it("serializes false and zero query values without adding undefined filters", async () => {
    const transport = vi.fn().mockResolvedValue({ items: [] });
    await getListingsSearch(transport, {
      query: {
        marketCode: "FR",
        minPrice: 0,
        onlyDeals: false,
        query: "a & b",
        cursor: undefined,
      },
    });
    const query = new URL(transport.mock.calls[0]![0], "https://api.invalid")
      .searchParams;
    expect(query.get("query")).toBe("a & b");
    expect(query.get("minPrice")).toBe("0");
    expect(query.get("onlyDeals")).toBe("false");
    expect(query.has("cursor")).toBe(false);
  });

  it.each(["", ".", ".."])(
    "rejects a path traversal or empty identifier %s before networking",
    (id) => {
      const transport = vi.fn();
      expect(() =>
        putListingsByIdFavorite(transport, {
          path: { id },
          body: { isFavorite: true },
        }),
      ).toThrow();
      expect(transport).not.toHaveBeenCalled();
    },
  );

  it("leaves credential and error handling with the platform transport", async () => {
    const error = new Error("platform transport failure");
    await expect(
      getFavorites(vi.fn().mockRejectedValue(error), {}),
    ).rejects.toBe(error);
  });
});
