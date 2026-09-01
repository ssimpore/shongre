import { describe, expect, it } from "vitest";
import { COUNTRY_REGISTRY, getDefaultCountryConfig } from "@shongre/contracts";
import {
  LEGACY_MANUAL_MARKET_SELECTION_KEY,
  MARKET_SELECTION_PREFERENCES_KEY,
  MarketSelectionPreferenceRepository,
  resolveInitialMarketSelection,
} from "./market-selection.preference";

class TestStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class BlockedStorage extends TestStorage {
  override getItem(): string | null {
    throw new Error("storage blocked");
  }

  override setItem(): void {
    throw new Error("storage blocked");
  }

  override removeItem(): void {
    throw new Error("storage blocked");
  }
}

describe("manual market selection precedence", () => {
  const defaultCode = getDefaultCountryConfig().code;
  const alternative = COUNTRY_REGISTRY.find(
    (country) => country.code !== defaultCode,
  )!;

  it("keeps the canonical request ahead of a stored preference", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: alternative.code,
        requestCountryCode: defaultCode,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(defaultCode);
  });

  it("returns to request context after the manual override is reset", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: null,
        requestCountryCode: alternative.code,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(alternative.code);
  });

  it("ignores invalid persisted configuration", () => {
    expect(
      resolveInitialMarketSelection({
        manualCountryCode: "ZZ",
        requestCountryCode: alternative.code,
        defaultCountryCode: defaultCode,
      }),
    ).toBe(alternative.code);
  });

  it("isolates manual choices between guests and authenticated accounts", () => {
    const storage = new TestStorage();
    const repository = new MarketSelectionPreferenceRepository(storage);
    repository.saveManualCountry("BE");
    repository.saveManualCountry("CH", "account-one");
    repository.saveManualCountry("FR", "account-two");

    expect(repository.getManualCountry()).toBe("BE");
    expect(repository.getManualCountry("account-one")).toBe("CH");
    expect(repository.getManualCountry("account-two")).toBe("FR");

    repository.clearManualCountry("account-one");
    expect(repository.getManualCountry("account-one")).toBeNull();
    expect(repository.getManualCountry()).toBe("BE");
  });

  it("partitions declined recommendations by account and current market", () => {
    const repository = new MarketSelectionPreferenceRepository(
      new TestStorage(),
    );
    repository.declineRecommendation("BE", null, "FR");
    repository.declineRecommendation("FR", "account-one", "CH");

    expect(repository.getDeclinedRecommendation(null, "FR")).toBe("BE");
    expect(repository.getDeclinedRecommendation(null, "CH")).toBeNull();
    expect(repository.getDeclinedRecommendation("account-one", "CH")).toBe(
      "FR",
    );
    expect(
      repository.getDeclinedRecommendation("account-two", "CH"),
    ).toBeNull();
  });

  it("stores only minimal ISO decisions and no precise location or network data", () => {
    const storage = new TestStorage();
    const repository = new MarketSelectionPreferenceRepository(storage);
    repository.saveManualCountry("BE", "account-one");
    repository.declineRecommendation("CH", "account-one", "FR");

    const serialized = storage.getItem(MARKET_SELECTION_PREFERENCES_KEY) || "";
    expect(serialized).toContain('"BE"');
    expect(serialized).toContain('"CH"');
    expect(serialized).not.toMatch(
      /latitude|longitude|coordinates|ipAddress|203\.0\.113/i,
    );
  });

  it("keeps decisions usable in memory when browser persistence is blocked", () => {
    const repository = new MarketSelectionPreferenceRepository(
      new BlockedStorage(),
    );

    expect(() => repository.saveManualCountry("BE")).not.toThrow();
    repository.declineRecommendation("CH", null, "FR");

    expect(repository.getManualCountry()).toBe("BE");
    expect(repository.getDeclinedRecommendation(null, "FR")).toBe("CH");
  });

  it("migrates the former global value only into the guest bucket", () => {
    const storage = new TestStorage();
    storage.setItem(LEGACY_MANUAL_MARKET_SELECTION_KEY, JSON.stringify("BE"));
    const repository = new MarketSelectionPreferenceRepository(storage);

    expect(repository.getManualCountry()).toBe("BE");
    expect(repository.getManualCountry("account-one")).toBeNull();
    expect(storage.getItem(LEGACY_MANUAL_MARKET_SELECTION_KEY)).toBeNull();
  });
});
