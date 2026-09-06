import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FavoritesStateUnavailableError,
  beginFavoritesLoad,
  completeFavoritesLoad,
  failFavoritesLoad,
  requireFavoritesReady,
  type FavoritesLoadState,
  type FavoritesSnapshot,
} from "../../app/providers/favorites.state";

export interface ScopedFavoritesAdapter {
  load(accountId: string, marketCode: string): Promise<string[]>;
  set(
    accountId: string,
    resourceId: string,
    marketCode: string,
    isFavorite: boolean,
  ): Promise<boolean>;
}

export interface ScopedResourceFavorites {
  favoriteIds: ReadonlySet<string>;
  loadState: FavoritesLoadState;
  refresh: () => Promise<void>;
  toggleFavorite: (resourceId: string) => Promise<boolean>;
}

/**
 * Exact account-and-market favorite state for vertical resources which are not
 * generic listings. Failed reads remain explicit and never become an empty,
 * writable snapshot.
 */
export function useScopedResourceFavorites(
  accountId: string | undefined,
  marketCode: string,
  adapter: ScopedFavoritesAdapter,
): ScopedResourceFavorites {
  const scopeKey = `${accountId ?? "guest"}::${marketCode}`;
  const [snapshot, setSnapshot] = useState<FavoritesSnapshot>(() => ({
    scopeKey,
    ids: [],
    loadState: accountId ? "loading" : "ready",
  }));
  const snapshotRef = useRef(snapshot);
  const scopeRef = useRef(scopeKey);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef<{
    scopeKey: string;
    promise: Promise<void>;
  } | null>(null);
  scopeRef.current = scopeKey;
  snapshotRef.current = snapshot;

  const applySnapshot = useCallback(
    (targetScope: string, next: FavoritesSnapshot) => {
      if (scopeRef.current !== targetScope) return;
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [],
  );

  const refresh = useCallback(() => {
    const existing = inFlightRef.current;
    if (existing?.scopeKey === scopeKey) return existing.promise;

    const requestId = ++requestIdRef.current;
    const request = (async () => {
      if (!accountId) {
        applySnapshot(scopeKey, completeFavoritesLoad(scopeKey, []));
        return;
      }

      applySnapshot(
        scopeKey,
        beginFavoritesLoad(snapshotRef.current, scopeKey),
      );
      try {
        const ids = await adapter.load(accountId, marketCode);
        if (requestIdRef.current !== requestId) return;
        applySnapshot(scopeKey, completeFavoritesLoad(scopeKey, ids));
      } catch (error) {
        if (requestIdRef.current === requestId) {
          applySnapshot(
            scopeKey,
            failFavoritesLoad(snapshotRef.current, scopeKey),
          );
        }
        throw error;
      }
    })();
    inFlightRef.current = { scopeKey, promise: request };
    const clear = () => {
      if (inFlightRef.current?.promise === request) inFlightRef.current = null;
    };
    void request.then(clear, clear);
    return request;
  }, [accountId, adapter, applySnapshot, marketCode, scopeKey]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    return () => {
      requestIdRef.current += 1;
      if (inFlightRef.current?.scopeKey === scopeKey)
        inFlightRef.current = null;
    };
  }, [refresh, scopeKey]);

  const loadState: FavoritesLoadState =
    snapshot.scopeKey === scopeKey
      ? snapshot.loadState
      : accountId
        ? "loading"
        : "ready";
  const favoriteIds = useMemo(
    () =>
      new Set(
        snapshot.scopeKey === scopeKey && snapshot.loadState === "ready"
          ? snapshot.ids
          : [],
      ),
    [scopeKey, snapshot],
  );

  const toggleFavorite = useCallback(
    async (resourceId: string) => {
      if (!accountId) throw new FavoritesStateUnavailableError();
      const currentIds = requireFavoritesReady(snapshotRef.current, scopeKey);
      const desired = !currentIds.includes(resourceId);
      const requestId = requestIdRef.current;
      const active = await adapter.set(
        accountId,
        resourceId,
        marketCode,
        desired,
      );
      if (requestIdRef.current !== requestId) return active;
      const nextIds = new Set(
        requireFavoritesReady(snapshotRef.current, scopeKey),
      );
      if (active) nextIds.add(resourceId);
      else nextIds.delete(resourceId);
      applySnapshot(
        scopeKey,
        completeFavoritesLoad(scopeKey, Array.from(nextIds)),
      );
      return active;
    },
    [accountId, adapter, applySnapshot, marketCode, scopeKey],
  );

  return { favoriteIds, loadState, refresh, toggleFavorite };
}
