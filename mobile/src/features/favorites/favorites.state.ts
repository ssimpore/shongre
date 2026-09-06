import type { ListingCardView } from "@shongre/contracts";

export type FavoritesLoadState = "loading" | "ready" | "error";

export interface FavoritesSnapshotState {
  scopeKey: string;
  ids: ReadonlySet<string>;
  loadState: FavoritesLoadState;
  error: string;
}

export interface FavoriteListingsSnapshotState {
  scopeKey: string;
  listings: readonly ListingCardView[];
  isComplete: boolean;
}

export class FavoritesStateUnavailableError extends Error {
  constructor() {
    super("Favorite membership is not authoritative for this scope.");
    this.name = "FavoritesStateUnavailableError";
  }
}

export function favoriteScopeKey(userId: string, marketCode: string): string {
  return `${userId}::${marketCode.toUpperCase()}`;
}

export function beginFavoritesLoad(
  current: FavoritesSnapshotState,
  scopeKey: string,
): FavoritesSnapshotState {
  return {
    scopeKey,
    ids: current.scopeKey === scopeKey ? current.ids : new Set(),
    loadState: "loading",
    error: "",
  };
}

export function completeFavoritesLoad(
  scopeKey: string,
  ids: ReadonlySet<string> | readonly string[],
): FavoritesSnapshotState {
  return {
    scopeKey,
    ids: new Set(ids),
    loadState: "ready",
    error: "",
  };
}

export function failFavoritesLoad(
  current: FavoritesSnapshotState,
  scopeKey: string,
  error: string,
): FavoritesSnapshotState {
  return {
    scopeKey,
    ids: current.scopeKey === scopeKey ? current.ids : new Set(),
    loadState: "error",
    error,
  };
}

export function beginFavoriteListingsLoad(
  current: FavoriteListingsSnapshotState,
  scopeKey: string,
): FavoriteListingsSnapshotState {
  return {
    scopeKey,
    listings: current.scopeKey === scopeKey ? current.listings : [],
    isComplete: false,
  };
}

export function completeFavoriteListingsLoad(
  scopeKey: string,
  favoriteIds: ReadonlySet<string> | readonly string[],
  listings: readonly ListingCardView[],
  marketCode: string,
): FavoriteListingsSnapshotState {
  const normalizedMarket = marketCode.toUpperCase();
  const ids = [...new Set(favoriteIds)];
  const allowedIds = new Set(ids);
  const byId = new Map(
    listings
      .filter(
        (listing) =>
          allowedIds.has(listing.id) &&
          listing.marketCode.toUpperCase() === normalizedMarket,
      )
      .map((listing) => [listing.id, listing] as const),
  );
  return {
    scopeKey,
    listings: ids.flatMap((id) => {
      const listing = byId.get(id);
      return listing ? [listing] : [];
    }),
    isComplete: true,
  };
}

export function reconcileFavoriteListingMutation(
  current: FavoriteListingsSnapshotState,
  scopeKey: string,
  listingId: string,
  isFavorite: boolean,
): FavoriteListingsSnapshotState {
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
  snapshot: FavoritesSnapshotState,
  scopeKey: string,
  listingId: string,
): boolean {
  if (snapshot.scopeKey !== scopeKey || snapshot.loadState !== "ready") {
    throw new FavoritesStateUnavailableError();
  }
  return snapshot.ids.has(listingId);
}

export function withFavoriteMembership(
  ids: ReadonlySet<string>,
  listingId: string,
  isFavorite: boolean,
): Set<string> {
  const next = new Set(ids);
  if (isFavorite) next.add(listingId);
  else next.delete(listingId);
  return next;
}

export async function toggleFavoriteOptimistically(input: {
  current: boolean;
  apply: (isFavorite: boolean) => void;
  persist: (desiredState: boolean) => Promise<boolean>;
}): Promise<boolean> {
  const optimistic = !input.current;
  input.apply(optimistic);
  try {
    const confirmed = await input.persist(optimistic);
    input.apply(confirmed);
    return confirmed;
  } catch (error) {
    input.apply(input.current);
    throw error;
  }
}
