import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  browserPreferencesService as preferences,
  RECENT_SEARCHES_CHANGED_EVENT,
} from "./browser-preferences.service";

describe("browser-local recent searches", () => {
  let storage: Map<string, string>;
  let events: EventTarget;
  beforeEach(() => {
    storage = new Map();
    events = new EventTarget();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      dispatchEvent: (event: Event) => events.dispatchEvent(event),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("only records real, nonempty queries and keeps a bounded, case-insensitive history", () => {
    preferences.addRecentSearch("  ", undefined, "FR");
    expect(preferences.getRecentSearches(undefined, "FR")).toEqual([]);
    for (let index = 0; index < 12; index++)
      preferences.addRecentSearch(`Search ${index}`, undefined, "FR");
    preferences.addRecentSearch(" SEARCH 5 ", undefined, "FR");
    const searches = preferences.getRecentSearches(undefined, "FR");
    expect(searches).toHaveLength(8);
    expect(searches[0]).toBe("SEARCH 5");
    expect(searches).not.toContain("Search 5");
  });

  it("isolates accounts, guests and markets without adopting unowned legacy history", () => {
    storage.set(
      "shongre_recent_searches_v1",
      JSON.stringify(["Unowned history"]),
    );
    preferences.addRecentSearch("Guest query", undefined, "fr");
    preferences.addRecentSearch("My query", "buyer", "FR");
    expect(preferences.getRecentSearches(undefined, "FR")).toEqual([
      "Guest query",
    ]);
    expect(preferences.getRecentSearches("buyer", "FR")).toEqual(["My query"]);
    expect(preferences.getRecentSearches("buyer", "BE")).toEqual([]);
    expect(preferences.getRecentSearches("seller", "FR")).toEqual([]);
  });

  it("validates malformed and tampered storage without leaking raw values to the UI", () => {
    const key = preferences.recentSearchesKey(undefined, "FR");
    for (const invalid of ["{", "null", "{}", '"not an array"']) {
      storage.set(key, invalid);
      expect(preferences.getRecentSearches(undefined, "FR")).toEqual([]);
    }
    storage.set(
      key,
      JSON.stringify([{}, 123, null, "", " a ", "A", "x".repeat(201)]),
    );
    expect(preferences.getRecentSearches(undefined, "FR")).toEqual(["a"]);
  });

  it("notifies mounted consumers and scopes deletion and clearing", () => {
    const listener = vi.fn();
    events.addEventListener(RECENT_SEARCHES_CHANGED_EVENT, listener);
    preferences.addRecentSearch("Table", "buyer", "FR");
    preferences.addRecentSearch("Chair", "buyer", "FR");
    preferences.addRecentSearch("Bike", "buyer", "BE");
    preferences.removeRecentSearch("Table", "buyer", "FR");
    expect(preferences.getRecentSearches("buyer", "FR")).toEqual(["Chair"]);
    preferences.clearRecentSearches("buyer", "FR");
    expect(preferences.getRecentSearches("buyer", "FR")).toEqual([]);
    expect(preferences.getRecentSearches("buyer", "BE")).toEqual(["Bike"]);
    expect(listener).toHaveBeenCalledTimes(5);
    expect(listener.mock.calls[0]?.[0].detail).toBe(
      preferences.recentSearchesKey("buyer", "FR"),
    );
  });

  it("fails safely when browser storage is blocked", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("Blocked");
        },
        setItem: () => {
          throw new Error("Blocked");
        },
      },
      dispatchEvent: (event: Event) => events.dispatchEvent(event),
    });
    expect(() =>
      preferences.addRecentSearch("Table", undefined, "FR"),
    ).not.toThrow();
    expect(preferences.getRecentSearches(undefined, "FR")).toEqual([]);
  });
});
