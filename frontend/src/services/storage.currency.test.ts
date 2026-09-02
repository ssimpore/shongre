import { beforeEach, describe, expect, it } from "vitest";
import { storageService } from "./storage.service";

beforeEach(() => {
  storageService.remove("shongre_user_currency_preferences_v2");
  storageService.remove("shongre_user_currency_v1");
});

describe("currency preferences", () => {
  it("partitions a preference by account and market", () => {
    storageService.saveUserCurrency("CHF", "account:buyer", "FR");
    storageService.saveUserCurrency("EUR", "account:buyer", "CH");
    storageService.saveUserCurrency("EUR", "account:seller", "FR");

    expect(storageService.getUserCurrency("account:buyer", "FR")).toBe("CHF");
    expect(storageService.getUserCurrency("account:buyer", "CH")).toBe("EUR");
    expect(storageService.getUserCurrency("account:seller", "FR")).toBe("EUR");
    expect(storageService.getUserCurrency("guest", "FR")).toBeNull();
  });

  it("normalizes ISO codes before persistence", () => {
    storageService.saveUserCurrency("chf", "guest", "fr");
    expect(storageService.getUserCurrency("guest", "FR")).toBe("CHF");
  });
});
