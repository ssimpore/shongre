import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/shared/errors/app-error.js";
import {
  requireOpenMarketplace,
  resolveApiRequestMarket,
} from "../../src/modules/markets/request-market-context.js";

function request(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe("API market-context consistency", () => {
  it("accepts one consistent market across header, referrer and body", () => {
    expect(
      resolveApiRequestMarket({
        req: request({
          host: "api.shongre.com",
          referer: "https://shongre.com/be/recherche?q=velo",
          "x-shongre-market": "BE",
        }),
        query: new URLSearchParams(),
        body: { marketCode: "BE" },
      }),
    ).toBe("BE");
  });

  it("rejects a Belgian URL paired with a French API market", () => {
    expect(() =>
      resolveApiRequestMarket({
        req: request({
          referer: "https://shongre.com/be/immobilier",
          "x-shongre-market": "BE",
        }),
        query: new URLSearchParams("country=FR"),
        body: null,
      }),
    ).toThrow(AppError);
  });

  it("rejects a spoofed market header against the France referrer", () => {
    expect(() =>
      resolveApiRequestMarket({
        req: request({
          referer: "https://shongre.fr/vehicules",
          "x-shongre-market": "CH",
        }),
        query: new URLSearchParams(),
        body: null,
      }),
    ).toThrow("ne correspond pas");
  });

  it("rejects malformed and unregistered market values", () => {
    expect(() =>
      resolveApiRequestMarket({
        req: request({ "x-shongre-market": "France" }),
        query: new URLSearchParams(),
        body: null,
      }),
    ).toThrow("invalide");
    expect(() =>
      resolveApiRequestMarket({
        req: request({ "x-shongre-market": "ZZ" }),
        query: new URLSearchParams(),
        body: null,
      }),
    ).toThrow("inconnu");
  });

  it("fails closed for markets that are not launched", () => {
    expect(() => requireOpenMarketplace("SN")).toThrow("pas encore ouvert");
    expect(() => requireOpenMarketplace("BF")).toThrow("pas encore ouvert");
    expect(() => requireOpenMarketplace("CH")).not.toThrow();
  });
});
