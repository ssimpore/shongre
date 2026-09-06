import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import type { ListingCardView } from "@shongre/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useMarket } from "@/features/market/MarketProvider";
import { messagesFr } from "@/i18n/messages.fr";
import { favoritesService } from "./favorites.service";
import {
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
  type FavoritesLoadState,
  type FavoritesSnapshotState,
} from "./favorites.state";

interface FavoritesContextValue {
  favoriteIds: ReadonlySet<string>;
  favoriteListings: readonly ListingCardView[];
  favoriteListingsComplete: boolean;
  loading: boolean;
  loadState: FavoritesLoadState;
  error: string;
  isFavorite(listingId: string): boolean;
  isPending(listingId: string): boolean;
  refresh(): Promise<ReadonlySet<string>>;
  retry(): Promise<void>;
  toggleFavorite(listingId: string): Promise<void>;
}

const EMPTY_IDS: ReadonlySet<string> = new Set();
const EMPTY_LISTINGS: readonly ListingCardView[] = [];
const GUEST_SCOPE = "guest";
const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { activeMarket } = useMarket();
  const scopeKey = user
    ? favoriteScopeKey(user.id, activeMarket.code)
    : GUEST_SCOPE;
  const inFlightLoadsRef = useRef(
    new Map<string, Promise<ReadonlySet<string>>>(),
  );
  const pendingRef = useRef(new Set<string>());
  const [pendingKeys, setPendingKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [snapshot, setSnapshot] = useState<FavoritesSnapshotState>({
    scopeKey: GUEST_SCOPE,
    ids: EMPTY_IDS,
    loadState: "ready",
    error: "",
  });
  const [favoriteListingsSnapshot, setFavoriteListingsSnapshot] =
    useState<FavoriteListingsSnapshotState>({
      scopeKey: GUEST_SCOPE,
      listings: EMPTY_LISTINGS,
      isComplete: true,
    });
  const currentScopeRef = useRef(scopeKey);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    currentScopeRef.current = scopeKey;
  }, [scopeKey]);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const applySnapshot = useCallback(
    (targetScope: string, next: FavoritesSnapshotState) => {
      if (currentScopeRef.current !== targetScope) return;
      snapshotRef.current = next;
      setSnapshot(next);
    },
    [],
  );

  const applyFavoriteListingsSnapshot = useCallback(
    (targetScope: string, next: FavoriteListingsSnapshotState) => {
      if (currentScopeRef.current !== targetScope) return;
      setFavoriteListingsSnapshot(next);
    },
    [],
  );

  const updateMembership = useCallback(
    (targetScope: string, listingId: string, isFavorite: boolean) => {
      setSnapshot((current) => {
        if (current.scopeKey !== targetScope || current.loadState !== "ready") {
          return current;
        }
        const next: FavoritesSnapshotState = {
          scopeKey: targetScope,
          ids: withFavoriteMembership(current.ids, listingId, isFavorite),
          loadState: "ready",
          error: "",
        };
        snapshotRef.current = next;
        return next;
      });
    },
    [],
  );

  const refresh = useCallback(async (): Promise<ReadonlySet<string>> => {
    if (!user) {
      applySnapshot(GUEST_SCOPE, completeFavoritesLoad(GUEST_SCOPE, EMPTY_IDS));
      applyFavoriteListingsSnapshot(GUEST_SCOPE, {
        scopeKey: GUEST_SCOPE,
        listings: EMPTY_LISTINGS,
        isComplete: true,
      });
      return EMPTY_IDS;
    }
    const targetScope = favoriteScopeKey(user.id, activeMarket.code);
    const existingRequest = inFlightLoadsRef.current.get(targetScope);
    if (existingRequest) return existingRequest;

    applySnapshot(
      targetScope,
      beginFavoritesLoad(snapshotRef.current, targetScope),
    );
    setFavoriteListingsSnapshot((current) =>
      currentScopeRef.current === targetScope
        ? beginFavoriteListingsLoad(current, targetScope)
        : current,
    );

    const request = favoritesService
      .list(user.id, activeMarket.code)
      .then((collection) => {
        const next = new Set(collection.listingIds);
        applySnapshot(targetScope, completeFavoritesLoad(targetScope, next));
        applyFavoriteListingsSnapshot(
          targetScope,
          completeFavoriteListingsLoad(
            targetScope,
            next,
            collection.listings,
            activeMarket.code,
          ),
        );
        return next;
      })
      .catch((error: unknown) => {
        applySnapshot(
          targetScope,
          failFavoritesLoad(
            snapshotRef.current,
            targetScope,
            messagesFr["ui.favorites.loadError"],
          ),
        );
        setFavoriteListingsSnapshot((current) =>
          currentScopeRef.current === targetScope
            ? beginFavoriteListingsLoad(current, targetScope)
            : current,
        );
        throw error;
      })
      .finally(() => {
        inFlightLoadsRef.current.delete(targetScope);
      });
    inFlightLoadsRef.current.set(targetScope, request);
    return request;
  }, [activeMarket.code, applyFavoriteListingsSnapshot, applySnapshot, user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      applySnapshot(GUEST_SCOPE, completeFavoritesLoad(GUEST_SCOPE, EMPTY_IDS));
      applyFavoriteListingsSnapshot(GUEST_SCOPE, {
        scopeKey: GUEST_SCOPE,
        listings: EMPTY_LISTINGS,
        isComplete: true,
      });
      return;
    }
    void refresh().catch(() => undefined);
  }, [
    applyFavoriteListingsSnapshot,
    applySnapshot,
    authLoading,
    refresh,
    user,
  ]);

  const retry = useCallback(async (): Promise<void> => {
    try {
      await refresh();
    } catch {
      Alert.alert(
        messagesFr["ui.favorites.errorTitle"],
        messagesFr["ui.favorites.loadError"],
      );
    }
  }, [refresh]);

  const toggleFavorite = useCallback(
    async (listingId: string): Promise<void> => {
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const targetScope = favoriteScopeKey(user.id, activeMarket.code);
      const mutationKey = `${targetScope}::${listingId}`;
      if (pendingRef.current.has(mutationKey)) return;

      let current: boolean;
      try {
        current = readFavoriteMembership(
          snapshotRef.current,
          targetScope,
          listingId,
        );
      } catch {
        // A stale control retries the authoritative collection but never
        // guesses whether this press meant add or remove.
        await retry();
        return;
      }
      pendingRef.current.add(mutationKey);
      setPendingKeys(new Set(pendingRef.current));

      try {
        const confirmed = await toggleFavoriteOptimistically({
          current,
          apply: (isFavorite) =>
            updateMembership(targetScope, listingId, isFavorite),
          persist: (desiredState) =>
            favoritesService.setFavorite(
              user.id,
              activeMarket.code,
              listingId,
              desiredState,
            ),
        });
        setFavoriteListingsSnapshot((currentListings) =>
          currentScopeRef.current === targetScope
            ? reconcileFavoriteListingMutation(
                currentListings,
                targetScope,
                listingId,
                confirmed,
              )
            : currentListings,
        );
      } catch {
        Alert.alert(
          messagesFr["ui.favorites.errorTitle"],
          messagesFr["ui.favorites.errorMessage"],
        );
      } finally {
        pendingRef.current.delete(mutationKey);
        setPendingKeys(new Set(pendingRef.current));
      }
    },
    [activeMarket.code, router, retry, updateMembership, user],
  );

  const visibleSnapshot: FavoritesSnapshotState =
    snapshot.scopeKey === scopeKey
      ? snapshot
      : {
          scopeKey,
          ids: EMPTY_IDS,
          loadState: authLoading || user ? "loading" : "ready",
          error: "",
        };
  const loadState: FavoritesLoadState = authLoading
    ? "loading"
    : visibleSnapshot.loadState;
  // Preserve the last known ids for display, while readFavoriteMembership()
  // keeps them non-authoritative until this exact scope is ready again.
  const visibleIds = visibleSnapshot.ids;
  const visibleFavoriteListingsSnapshot: FavoriteListingsSnapshotState =
    favoriteListingsSnapshot.scopeKey === scopeKey
      ? favoriteListingsSnapshot
      : {
          scopeKey,
          listings: EMPTY_LISTINGS,
          isComplete: !user,
        };
  const visibleListings = useMemo(() => {
    if (!user) return EMPTY_LISTINGS;
    return visibleFavoriteListingsSnapshot.listings.filter((listing) =>
      visibleIds.has(listing.id),
    );
  }, [user, visibleFavoriteListingsSnapshot.listings, visibleIds]);
  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds: visibleIds,
      favoriteListings: visibleListings,
      favoriteListingsComplete: visibleFavoriteListingsSnapshot.isComplete,
      loading: loadState === "loading",
      loadState,
      error: visibleSnapshot.error,
      isFavorite: (listingId) => visibleIds.has(listingId),
      isPending: (listingId) => pendingKeys.has(`${scopeKey}::${listingId}`),
      refresh,
      retry,
      toggleFavorite,
    }),
    [
      loadState,
      pendingKeys,
      refresh,
      retry,
      scopeKey,
      toggleFavorite,
      visibleFavoriteListingsSnapshot.isComplete,
      visibleListings,
      visibleSnapshot.error,
      visibleIds,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const value = useContext(FavoritesContext);
  if (!value)
    throw new Error("useFavorites must be used within FavoritesProvider.");
  return value;
}
