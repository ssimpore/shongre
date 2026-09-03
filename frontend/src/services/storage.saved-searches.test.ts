import { beforeEach, describe, expect, it } from "vitest";
import { storageService } from "./storage.service";
import type { SavedSearch } from "../types";

const LEGACY_KEY = "shongre_saved_searches_v1";
const PARTITIONED_KEY = "shongre_saved_searches_v2";

const legacySearch = (id: string, marketCode?: string): SavedSearch => ({
  id,
  title: `Recherche ${id}`,
  filters: { query: id, marketCode },
  createdAt: "2026-09-01T12:00:00.000Z",
  hasNotifications: true,
  matchCount: 0,
});

beforeEach(() => {
  storageService.remove(LEGACY_KEY);
  storageService.remove(PARTITIONED_KEY);
  storageService.setCurrentUserKey("buyer_thomas");
});

describe("saved-search storage migration", () => {
  it("moves legacy searches into the active account and their own markets", () => {
    storageService.setByKey(LEGACY_KEY, [
      legacySearch("fr-search"),
      legacySearch("be-search", "be"),
    ]);

    expect(storageService.getSavedSearches("user_thomas", "FR")).toEqual([
      expect.objectContaining({ id: "fr-search" }),
    ]);
    expect(storageService.getSavedSearches("user_thomas", "BE")).toEqual([
      expect.objectContaining({ id: "be-search" }),
    ]);
    expect(storageService.getSavedSearches("user_camille", "FR")).toEqual([]);
    expect(storageService.getByKey(LEGACY_KEY, null)).toBeNull();
  });

  it("never lets a stale legacy value overwrite partitioned data", () => {
    storageService.setByKey(PARTITIONED_KEY, {
      "user_thomas::FR": [legacySearch("current")],
    });
    storageService.setByKey(LEGACY_KEY, [legacySearch("stale")]);

    expect(storageService.getSavedSearches("user_thomas", "FR")).toEqual([
      expect.objectContaining({ id: "current" }),
    ]);
  });
});
