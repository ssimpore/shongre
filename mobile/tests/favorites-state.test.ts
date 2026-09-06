import { describe, expect, it, vi } from "vitest";
import type { ListingCardView } from "@shongre/contracts";
import {
  FavoritesStateUnavailableError,
  beginFavoriteListingsLoad,
  beginFavoritesLoad,
  completeFavoriteListingsLoad,
  completeFavoritesLoad,
  failFavoritesLoad,
  favoriteScopeKey,
  readFavoriteMembership,
  reconcileFavoriteListingMutation,
  toggleFavoriteOptimistically,
  withFavoriteMembership,
  type FavoriteListingsSnapshotState,
} from "@/features/favorites/favorites.state";

const listing = (id: string, marketCode: string): ListingCardView =>
  ({ id, marketCode }) as ListingCardView;

describe("mobile favorite state", () => {
  it("partitions cached membership by account and normalized market", () => {
    expect(favoriteScopeKey("account-a", "fr")).toBe("account-a::FR");
    expect(favoriteScopeKey("account-b", "FR")).not.toBe(
      favoriteScopeKey("account-a", "FR"),
    );
    expect(favoriteScopeKey("account-a", "BE")).not.toBe(
      favoriteScopeKey("account-a", "FR"),
    );
  });

  it("updates membership without mutating the cached set", () => {
    const current = new Set(["listing-a"]);
    const added = withFavoriteMembership(current, "listing-b", true);
    const removed = withFavoriteMembership(added, "listing-a", false);

    expect([...current]).toEqual(["listing-a"]);
    expect([...added]).toEqual(["listing-a", "listing-b"]);
    expect([...removed]).toEqual(["listing-b"]);
  });

  it("keeps a failed first load unknown instead of treating it as empty", () => {
    const previous = completeFavoritesLoad("account-a::FR", ["listing-a"]);
    const failed = failFavoritesLoad(
      beginFavoritesLoad(previous, "account-a::BE"),
      "account-a::BE",
      "Favoris indisponibles.",
    );

    expect(failed.loadState).toBe("error");
    expect([...failed.ids]).toEqual([]);
    expect(() =>
      readFavoriteMembership(failed, "account-a::BE", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });

  it("preserves cached ids on refresh failure but refuses to toggle from them", () => {
    const previous = completeFavoritesLoad("account-a::FR", ["listing-a"]);
    const failed = failFavoritesLoad(
      beginFavoritesLoad(previous, "account-a::FR"),
      "account-a::FR",
      "Favoris indisponibles.",
    );

    expect([...failed.ids]).toEqual(["listing-a"]);
    expect(() =>
      readFavoriteMembership(failed, "account-a::FR", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });

  it("reads membership after a successful load for the exact scope only", () => {
    const ready = completeFavoritesLoad("account-a::FR", ["listing-a"]);

    expect(readFavoriteMembership(ready, "account-a::FR", "listing-a")).toBe(
      true,
    );
    expect(readFavoriteMembership(ready, "account-a::FR", "listing-b")).toBe(
      false,
    );
    expect(() =>
      readFavoriteMembership(ready, "account-a::CH", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });

  it("applies the optimistic state and accepts the server confirmation", async () => {
    const apply = vi.fn();
    const persist = vi.fn(async (desiredState: boolean) => desiredState);
    await expect(
      toggleFavoriteOptimistically({
        current: false,
        apply,
        persist,
      }),
    ).resolves.toBe(true);
    expect(persist).toHaveBeenCalledWith(true);
    expect(apply.mock.calls).toEqual([[true], [true]]);
  });

  it("rolls back the optimistic state when persistence fails", async () => {
    const apply = vi.fn();
    const persist = vi.fn(async (_desiredState: boolean) => {
      throw new Error("offline");
    });
    await expect(
      toggleFavoriteOptimistically({
        current: true,
        apply,
        persist,
      }),
    ).rejects.toThrow("offline");
    expect(persist).toHaveBeenCalledWith(false);
    expect(apply.mock.calls).toEqual([[false], [true]]);
  });
});

describe("mobile favorite listing projections", () => {
  const readyListings: FavoriteListingsSnapshotState = {
    scopeKey: "account-a::BE",
    listings: [listing("listing-a", "BE")],
    isComplete: true,
  };

  it("preserves same-scope cards during a reload but never crosses scope", () => {
    expect(beginFavoriteListingsLoad(readyListings, "account-a::BE")).toEqual({
      ...readyListings,
      isComplete: false,
    });
    expect(beginFavoriteListingsLoad(readyListings, "account-a::CH")).toEqual({
      scopeKey: "account-a::CH",
      listings: [],
      isComplete: false,
    });
  });

  it("keeps only requested projections in the exact market and id order", () => {
    const result = completeFavoriteListingsLoad(
      "account-a::BE",
      ["listing-b", "listing-a"],
      [
        listing("listing-a", "BE"),
        listing("listing-b", "FR"),
        listing("not-favorite", "BE"),
        listing("listing-b", "BE"),
      ],
      "BE",
    );

    expect(result.listings.map(({ id }) => id)).toEqual([
      "listing-b",
      "listing-a",
    ]);
    expect(result.isComplete).toBe(true);
  });

  it("removes a projected card and invalidates the batch after an add", () => {
    const removed = reconcileFavoriteListingMutation(
      readyListings,
      "account-a::BE",
      "listing-a",
      false,
    );
    expect(removed).toEqual({
      scopeKey: "account-a::BE",
      listings: [],
      isComplete: true,
    });

    const added = reconcileFavoriteListingMutation(
      readyListings,
      "account-a::BE",
      "listing-b",
      true,
    );
    expect(added.listings).toEqual(readyListings.listings);
    expect(added.isComplete).toBe(false);
  });
});
