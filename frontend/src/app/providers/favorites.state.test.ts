import { describe, expect, it } from "vitest";
import type { Listing } from "../../types";
import {
  FavoritesStateUnavailableError,
  FavoriteRemovalNotConfirmedError,
  beginFavoritesLoad,
  beginFavoriteListingsLoad,
  clearFavoritesWithReconciliation,
  completeFavoriteListingsLoad,
  completeFavoritesLoad,
  failFavoritesLoad,
  readFavoriteMembership,
  reconcileLocalFavoriteCollection,
  reconcileFavoriteListingMutation,
  removeFavoritesSequentially,
  type FavoriteListingsSnapshot,
  type FavoritesSnapshot,
} from "./favorites.state";

const READY: FavoritesSnapshot = {
  scopeKey: "buyer::FR",
  ids: ["listing-a"],
  loadState: "ready",
};

const listing = (id: string, marketCode: string): Listing =>
  ({ id, marketCode, marketCodes: [marketCode] }) as Listing;

describe("favorite membership authority", () => {
  it("keeps a failed first load unknown instead of treating it as empty", () => {
    const loading = beginFavoritesLoad(READY, "buyer::BE");
    const failed = failFavoritesLoad(loading, "buyer::BE");

    expect(failed).toEqual({
      scopeKey: "buyer::BE",
      ids: [],
      loadState: "error",
    });
    expect(() =>
      readFavoriteMembership(failed, "buyer::BE", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });

  it("preserves cached ids after a refresh failure but refuses to mutate from them", () => {
    const failed = failFavoritesLoad(
      beginFavoritesLoad(READY, "buyer::FR"),
      "buyer::FR",
    );

    expect(failed.ids).toEqual(["listing-a"]);
    expect(() =>
      readFavoriteMembership(failed, "buyer::FR", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });

  it("reads membership only after the current scope completes successfully", () => {
    const ready = completeFavoritesLoad("buyer::FR", [
      "listing-a",
      "listing-a",
    ]);

    expect(readFavoriteMembership(ready, "buyer::FR", "listing-a")).toBe(true);
    expect(readFavoriteMembership(ready, "buyer::FR", "listing-b")).toBe(false);
    expect(() =>
      readFavoriteMembership(ready, "buyer::CH", "listing-a"),
    ).toThrow(FavoritesStateUnavailableError);
  });
});

describe("favorite listing projections", () => {
  const READY_LISTINGS: FavoriteListingsSnapshot = {
    scopeKey: "buyer::BE",
    listings: [listing("listing-a", "BE")],
    isComplete: true,
  };

  it("preserves cached cards while loading but marks them incomplete", () => {
    expect(beginFavoriteListingsLoad(READY_LISTINGS, "buyer::BE")).toEqual({
      ...READY_LISTINGS,
      isComplete: false,
    });
    expect(beginFavoriteListingsLoad(READY_LISTINGS, "buyer::CH")).toEqual({
      scopeKey: "buyer::CH",
      listings: [],
      isComplete: false,
    });
  });

  it("allowlists ids and the exact market in server card projections", () => {
    const result = completeFavoriteListingsLoad(
      "buyer::BE",
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

  it("filters a confirmed removal and invalidates projections after an add", () => {
    const removed = reconcileFavoriteListingMutation(
      READY_LISTINGS,
      "buyer::BE",
      "listing-a",
      false,
    );
    expect(removed).toEqual({
      scopeKey: "buyer::BE",
      listings: [],
      isComplete: true,
    });

    const added = reconcileFavoriteListingMutation(
      READY_LISTINGS,
      "buyer::BE",
      "listing-b",
      true,
    );
    expect(added.listings).toEqual(READY_LISTINGS.listings);
    expect(added.isComplete).toBe(false);
  });

  it("prunes a guest favorite that is no longer public without hiding valid cards", () => {
    const result = reconcileLocalFavoriteCollection(
      "guest::FR",
      ["listing-visible", "listing-archived"],
      [listing("listing-visible", "FR")],
      "FR",
    );

    expect(result.favorites).toEqual({
      scopeKey: "guest::FR",
      ids: ["listing-visible"],
      loadState: "ready",
    });
    expect(result.listings).toMatchObject({
      scopeKey: "guest::FR",
      isComplete: true,
      listings: [{ id: "listing-visible" }],
    });
    expect(result.unavailableIds).toEqual(["listing-archived"]);
  });
});

describe("favorite clearing", () => {
  it("removes favorites sequentially instead of issuing parallel toggles", async () => {
    let active = 0;
    let maximumActive = 0;
    const removed: string[] = [];

    await removeFavoritesSequentially(
      ["listing-a", "listing-b"],
      async (id) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await Promise.resolve();
        removed.push(id);
        active -= 1;
        return false;
      },
    );

    expect(removed).toEqual(["listing-a", "listing-b"]);
    expect(maximumActive).toBe(1);
  });

  it("stops when a removal is not confirmed so the caller can reconcile", async () => {
    const attempted: string[] = [];

    await expect(
      removeFavoritesSequentially(
        ["listing-a", "listing-b"],
        async (listingId) => {
          attempted.push(listingId);
          return listingId === "listing-a";
        },
      ),
    ).rejects.toBeInstanceOf(FavoriteRemovalNotConfirmedError);
    expect(attempted).toEqual(["listing-a"]);
  });

  it("returns the authoritative remainder after a partial clear", async () => {
    const serverIds = new Set(["listing-a", "listing-b"]);

    const remaining = await clearFavoritesWithReconciliation(
      [...serverIds],
      async (listingId) => {
        if (listingId === "listing-b") throw new Error("network");
        serverIds.delete(listingId);
        return false;
      },
      async () => [...serverIds],
    );

    expect(remaining).toEqual(["listing-b"]);
  });

  it("accepts an authoritative empty state after a committed response is lost", async () => {
    const serverIds = new Set(["listing-a"]);

    const remaining = await clearFavoritesWithReconciliation(
      [...serverIds],
      async (listingId) => {
        serverIds.delete(listingId);
        throw new Error("response lost");
      },
      async () => [...serverIds],
    );

    expect(remaining).toEqual([]);
  });
});
