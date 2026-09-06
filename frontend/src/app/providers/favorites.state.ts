import type { Listing } from "../../types";

export type FavoritesLoadState = "loading" | "ready" | "error";

export interface FavoritesSnapshot {
  scopeKey: string;
  ids: string[];
  loadState: FavoritesLoadState;
}

export interface FavoriteListingsSnapshot {
  scopeKey: string;
  listings: Listing[];
  isComplete: boolean;
}

export interface LocalFavoriteCollectionSnapshot {
  favorites: FavoritesSnapshot;
  listings: FavoriteListingsSnapshot;
  unavailableIds: string[];
}

export class FavoritesStateUnavailableError extends Error {
  constructor(
    message = "Vos favoris doivent être rechargés avant toute modification.",
  ) {
    super(message);
    this.name = "FavoritesStateUnavailableError";
  }
}

export class FavoriteRemovalNotConfirmedError extends Error {
  constructor() {
    super("La suppression du favori n'a pas été confirmée.");
    this.name = "FavoriteRemovalNotConfirmedError";
  }
}

export function beginFavoritesLoad(
  current: FavoritesSnapshot,
  scopeKey: string,
): FavoritesSnapshot {
  return {
    scopeKey,
    ids: current.scopeKey === scopeKey ? current.ids : [],
    loadState: "loading",
  };
}

export function completeFavoritesLoad(
  scopeKey: string,
  ids: readonly string[],
): FavoritesSnapshot {
  return {
    scopeKey,
    ids: [...new Set(ids)],
    loadState: "ready",
  };
}

export function failFavoritesLoad(
  current: FavoritesSnapshot,
  scopeKey: string,
): FavoritesSnapshot {
  return {
    scopeKey,
    ids: current.scopeKey === scopeKey ? current.ids : [],
    loadState: "error",
  };
}

export function beginFavoriteListingsLoad(
  current: FavoriteListingsSnapshot,
  scopeKey: string,
): FavoriteListingsSnapshot {
  return {
    scopeKey,
    listings: current.scopeKey === scopeKey ? current.listings : [],
    isComplete: false,
  };
}

export function completeFavoriteListingsLoad(
  scopeKey: string,
  favoriteIds: readonly string[],
  listings: readonly Listing[],
  marketCode: string,
): FavoriteListingsSnapshot {
  const normalizedMarket = marketCode.toUpperCase();
  const allowedIds = new Set(favoriteIds);
  const byId = new Map(
    listings
      .filter(
        (listing) =>
          allowedIds.has(listing.id) &&
          (listing.marketCode?.toUpperCase() === normalizedMarket ||
            listing.marketCodes?.some(
              (candidate) => candidate.toUpperCase() === normalizedMarket,
            )),
      )
      .map((listing) => [listing.id, listing] as const),
  );
  return {
    scopeKey,
    listings: [...new Set(favoriteIds)].flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [listing] : [];
    }),
    isComplete: true,
  };
}

/**
 * Browser-local guest favorites have no durable server relationship. A
 * successful market-scoped public lookup therefore makes its returned cards
 * authoritative and identifies stale memberships that can be removed.
 */
export function reconcileLocalFavoriteCollection(
  scopeKey: string,
  requestedIds: readonly string[],
  listings: readonly Listing[],
  marketCode: string,
): LocalFavoriteCollectionSnapshot {
  const listingSnapshot = completeFavoriteListingsLoad(
    scopeKey,
    requestedIds,
    listings,
    marketCode,
  );
  const visibleIds = listingSnapshot.listings.map((listing) => listing.id);
  const visibleIdSet = new Set(visibleIds);
  return {
    favorites: completeFavoritesLoad(scopeKey, visibleIds),
    listings: listingSnapshot,
    unavailableIds: [...new Set(requestedIds)].filter(
      (listingId) => !visibleIdSet.has(listingId),
    ),
  };
}

export function reconcileFavoriteListingMutation(
  current: FavoriteListingsSnapshot,
  scopeKey: string,
  listingId: string,
  isFavorite: boolean,
): FavoriteListingsSnapshot {
  if (current.scopeKey !== scopeKey) return current;
  return {
    ...current,
    listings: isFavorite
      ? current.listings
      : current.listings.filter((listing) => listing.id !== listingId),
    isComplete: isFavorite ? false : current.isComplete,
  };
}

export function readFavoriteMembership(
  snapshot: FavoritesSnapshot,
  scopeKey: string,
  listingId: string,
): boolean {
  return requireFavoritesReady(snapshot, scopeKey).includes(listingId);
}

export function requireFavoritesReady(
  snapshot: FavoritesSnapshot,
  scopeKey: string,
): string[] {
  if (snapshot.scopeKey !== scopeKey || snapshot.loadState !== "ready") {
    throw new FavoritesStateUnavailableError();
  }
  return snapshot.ids;
}

/**
 * The transport has no bulk delete. Serialising idempotent removals limits a
 * failure to one boundary and lets the caller reconcile the exact server state
 * afterwards.
 */
export async function removeFavoritesSequentially(
  listingIds: readonly string[],
  remove: (listingId: string) => Promise<boolean>,
): Promise<void> {
  for (const listingId of new Set(listingIds)) {
    const isStillFavorite = await remove(listingId);
    if (isStillFavorite) throw new FavoriteRemovalNotConfirmedError();
  }
}

export async function clearFavoritesWithReconciliation(
  listingIds: readonly string[],
  remove: (listingId: string) => Promise<boolean>,
  readAuthoritativeIds: () => Promise<readonly string[]>,
): Promise<string[]> {
  try {
    await removeFavoritesSequentially(listingIds, remove);
  } catch {
    // The server may have committed before the response was lost. Only the
    // scoped read below can distinguish a partial clear from a completed one.
  }
  return [...(await readAuthoritativeIds())];
}
