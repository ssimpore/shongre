import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { services } from "../../api/client/service-registry";
import { browserPreferencesService } from "../../services/browser-preferences.service";
import { useAuth } from "./AuthProvider";
import { analyticsService } from "../../services/analytics.service";
import { ForbiddenError } from "../../security/authorization.service";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";
import { useMarketLocation } from "./MarketLocationProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import type { Listing } from "../../types";
import { deliveryRequestIdFromDiscoveryListingId } from "@shongre/contracts/delivery";
import {
  FavoritesStateUnavailableError,
  beginFavoriteListingsLoad,
  beginFavoritesLoad,
  clearFavoritesWithReconciliation,
  completeFavoriteListingsLoad,
  completeFavoritesLoad,
  failFavoritesLoad,
  readFavoriteMembership,
  reconcileLocalFavoriteCollection,
  reconcileFavoriteListingMutation,
  requireFavoritesReady,
  type FavoriteListingsSnapshot,
  type FavoritesLoadState,
  type FavoritesSnapshot,
} from "./favorites.state";

interface FavoritesContextValue {
  /** Ids of every listing the current user has saved. */
  favoriteIds: string[];
  /** Public card projections returned with the scoped favorite collection. */
  favoriteListings: Listing[];
  /** False after an add or failed/in-flight read until the batch is refreshed. */
  favoriteListingsComplete: boolean;
  count: number;
  isLoading: boolean;
  favoriteLoadState: FavoritesLoadState;
  favoritesError: string | null;
  isFavorite: (listingId: string) => boolean;
  refreshFavorites: () => Promise<void>;
  /** Returns the resulting state, so callers can react without re-reading. */
  toggleFavorite: (listingId: string) => Promise<boolean>;
  clearFavorites: () => Promise<void>;
  /** False for Staff sessions and true for customer sessions. */
  canModifyFavorites: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

const GUEST_FAVORITES_KEY = "guest";
const EMPTY_FAVORITE_IDS: string[] = [];
const EMPTY_FAVORITE_LISTINGS: Listing[] = [];

/**
 * One source of truth for saved listings.
 *
 * The header badge, the favourites page and every listing card each read the
 * favourite set straight out of storage on their own render. Nothing told the
 * others when it changed, so saving an item from a card left the header still
 * showing the old count until an unrelated re-render happened to correct it —
 * the header and the page disagreeing about the same fact.
 *
 * Reads and writes go through the listings service contract, so this keeps
 * working through the shared HTTP service boundary.
 */
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favoritesState, setFavoritesState] = useState<FavoritesSnapshot>(
    () => ({
      scopeKey: "",
      ids: EMPTY_FAVORITE_IDS,
      loadState: "loading",
    }),
  );
  const [favoriteListingsState, setFavoriteListingsState] =
    useState<FavoriteListingsSnapshot>(() => ({
      scopeKey: "",
      listings: EMPTY_FAVORITE_LISTINGS,
      isComplete: false,
    }));
  const { currentUser, isRestoring } = useAuth();
  const identity = currentUser?.id ?? null;
  const { activeMarket } = useMarketLocation();
  const marketCode = activeMarket.code;
  const scopeKey = `${identity ?? GUEST_FAVORITES_KEY}::${marketCode}`;
  const currentScopeRef = useRef(scopeKey);
  const favoritesStateRef = useRef(favoritesState);
  const inFlightLoadsRef = useRef(new Map<string, Promise<void>>());
  const mergeGuestScopesRef = useRef(new Set<string>());
  const pendingTogglesRef = useRef(new Map<string, Promise<boolean>>());
  const inFlightClearsRef = useRef(new Map<string, Promise<void>>());
  const { isReadOnly: isReadOnlyStaff } = useStaffMarketplaceAccess();
  const { t } = useTranslation();
  const previousIdentity = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    currentScopeRef.current = scopeKey;
  }, [scopeKey]);
  useEffect(() => {
    favoritesStateRef.current = favoritesState;
  }, [favoritesState]);

  const applySnapshot = useCallback(
    (targetScope: string, next: FavoritesSnapshot) => {
      if (currentScopeRef.current !== targetScope) return;
      favoritesStateRef.current = next;
      setFavoritesState(next);
    },
    [],
  );

  const applyFavoriteListingsSnapshot = useCallback(
    (targetScope: string, next: FavoriteListingsSnapshot) => {
      if (currentScopeRef.current !== targetScope) return;
      setFavoriteListingsState(next);
    },
    [],
  );

  const refreshFavorites = useCallback(async (): Promise<void> => {
    const targetScope = scopeKey;
    const targetIdentity = identity;
    const targetMarket = marketCode;
    if (isRestoring) {
      throw new FavoritesStateUnavailableError();
    }

    const existing = inFlightLoadsRef.current.get(targetScope);
    if (existing) return existing;

    applySnapshot(
      targetScope,
      beginFavoritesLoad(favoritesStateRef.current, targetScope),
    );
    setFavoriteListingsState((current) =>
      currentScopeRef.current === targetScope
        ? beginFavoriteListingsLoad(current, targetScope)
        : current,
    );

    const request = (async () => {
      try {
        if (isReadOnlyStaff) {
          applySnapshot(targetScope, completeFavoritesLoad(targetScope, []));
          applyFavoriteListingsSnapshot(
            targetScope,
            completeFavoriteListingsLoad(targetScope, [], [], targetMarket),
          );
          return;
        }

        if (!targetIdentity) {
          const guestIds = browserPreferencesService.getFavorites(
            GUEST_FAVORITES_KEY,
            targetMarket,
          );
          const guestListings = await services.listings.getPublicListingsByIds(
            guestIds,
            targetMarket,
          );
          const guestCollection = reconcileLocalFavoriteCollection(
            targetScope,
            guestIds,
            guestListings,
            targetMarket,
          );
          // A browser-local favorite has no durable server relationship to
          // preserve. Once a successful public batch proves that it is no
          // longer visible in this market, remove the stale local membership.
          for (const listingId of guestCollection.unavailableIds) {
            browserPreferencesService.toggleFavorite(
              listingId,
              GUEST_FAVORITES_KEY,
              targetMarket,
            );
          }
          applySnapshot(targetScope, guestCollection.favorites);
          applyFavoriteListingsSnapshot(targetScope, guestCollection.listings);
          return;
        }

        let collection =
          await services.listings.getFavoriteCollection(targetMarket);
        if (mergeGuestScopesRef.current.has(targetScope)) {
          const guestIds = browserPreferencesService.getFavorites(
            GUEST_FAVORITES_KEY,
            targetMarket,
          );
          const publicGuestListings =
            await services.listings.getPublicListingsByIds(
              guestIds,
              targetMarket,
            );
          const guestCollection = reconcileLocalFavoriteCollection(
            targetScope,
            guestIds,
            publicGuestListings,
            targetMarket,
          );
          const visibleGuestIds = guestCollection.favorites.ids;
          const missingGuestIds = visibleGuestIds.filter(
            (id) => !collection.listingIds.includes(id),
          );
          const migratedIds = await Promise.all(
            missingGuestIds.map(async (listingId) => ({
              listingId,
              confirmed: await services.listings.setFavorite(
                listingId,
                targetMarket,
                true,
              ),
            })),
          );
          if (migratedIds.some(({ confirmed }) => !confirmed)) {
            throw new Error("Guest favorite migration was not confirmed.");
          }
          if (migratedIds.length > 0) {
            collection =
              await services.listings.getFavoriteCollection(targetMarket);
          }

          // Clear only after every adapter write is confirmed. A partial failure
          // keeps the guest bucket intact so a later retry can reconcile it.
          for (const listingId of guestIds) {
            browserPreferencesService.toggleFavorite(
              listingId,
              GUEST_FAVORITES_KEY,
              targetMarket,
            );
          }
          mergeGuestScopesRef.current.delete(targetScope);
        }

        applySnapshot(
          targetScope,
          completeFavoritesLoad(targetScope, collection.listingIds),
        );
        applyFavoriteListingsSnapshot(
          targetScope,
          completeFavoriteListingsLoad(
            targetScope,
            collection.listingIds,
            collection.listings,
            targetMarket,
          ),
        );
      } catch {
        applySnapshot(
          targetScope,
          failFavoritesLoad(favoritesStateRef.current, targetScope),
        );
        setFavoriteListingsState((current) =>
          currentScopeRef.current === targetScope
            ? beginFavoriteListingsLoad(current, targetScope)
            : current,
        );
        throw new FavoritesStateUnavailableError();
      }
    })();

    inFlightLoadsRef.current.set(targetScope, request);
    void request.then(
      () => {
        if (inFlightLoadsRef.current.get(targetScope) === request) {
          inFlightLoadsRef.current.delete(targetScope);
        }
      },
      () => {
        if (inFlightLoadsRef.current.get(targetScope) === request) {
          inFlightLoadsRef.current.delete(targetScope);
        }
      },
    );
    return request;
  }, [
    applySnapshot,
    applyFavoriteListingsSnapshot,
    identity,
    isReadOnlyStaff,
    isRestoring,
    marketCode,
    scopeKey,
  ]);

  /**
   * The set is reloaded whenever the signed-in account changes, not just on
   * mount. Saved listings are per-account, so a set fetched once outlived the
   * user it belonged to: switching persona left the previous account's saves on
   * screen — in the cards, in the header count and on the favourites page —
   * until something unrelated forced a reload.
   *
   * Signing in also folds in anything saved while signed out, so a visitor who
   * saves a listing and *then* creates an account still has it afterwards.
   */
  useEffect(() => {
    if (isRestoring) return () => undefined;

    // Only an observed signed-out -> signed-in transition merges. Merging on
    // mount instead would hand whoever is already signed in on a shared device
    // the saves left behind by the last signed-out visitor.
    const signingIn =
      previousIdentity.current !== undefined &&
      !previousIdentity.current &&
      Boolean(identity);
    previousIdentity.current = identity;
    if (signingIn && !isReadOnlyStaff) {
      mergeGuestScopesRef.current.add(scopeKey);
    }

    void refreshFavorites().catch(() => undefined);
    return () => undefined;
  }, [identity, isReadOnlyStaff, isRestoring, refreshFavorites, scopeKey]);

  const visibleSnapshot: FavoritesSnapshot =
    favoritesState.scopeKey === scopeKey
      ? favoritesState
      : { scopeKey, ids: EMPTY_FAVORITE_IDS, loadState: "loading" };
  const favoriteLoadState: FavoritesLoadState = isRestoring
    ? "loading"
    : isReadOnlyStaff
      ? "ready"
      : visibleSnapshot.loadState;
  // The ids may be a stale display cache while loading/error, but they are
  // never used as mutation authority: toggle/clear re-check the snapshot state.
  const favoriteIds = isReadOnlyStaff
    ? EMPTY_FAVORITE_IDS
    : visibleSnapshot.ids;
  const visibleFavoriteListingsState: FavoriteListingsSnapshot =
    favoriteListingsState.scopeKey === scopeKey
      ? favoriteListingsState
      : {
          scopeKey,
          listings: EMPTY_FAVORITE_LISTINGS,
          isComplete: false,
        };
  const favoriteListings = useMemo(() => {
    if (isReadOnlyStaff) return EMPTY_FAVORITE_LISTINGS;
    const favoriteIdSet = new Set(favoriteIds);
    return visibleFavoriteListingsState.listings.filter((listing) =>
      favoriteIdSet.has(listing.id),
    );
  }, [favoriteIds, isReadOnlyStaff, visibleFavoriteListingsState.listings]);
  const favoriteListingsComplete =
    isReadOnlyStaff || visibleFavoriteListingsState.isComplete;

  const isFavorite = useCallback(
    (listingId: string) => !isReadOnlyStaff && favoriteIds.includes(listingId),
    [favoriteIds, isReadOnlyStaff],
  );

  const toggleFavorite = useCallback(
    async (listingId: string) => {
      if (isReadOnlyStaff) {
        throw new ForbiddenError(
          "Les comptes Staff ne peuvent pas utiliser les favoris de la place de marché.",
        );
      }

      const targetScope = scopeKey;
      const clearing = inFlightClearsRef.current.get(targetScope);
      if (clearing) {
        await clearing;
        throw new FavoritesStateUnavailableError(
          t("ui.listingCard.favorisRecharges"),
        );
      }
      const pendingKey = `${targetScope}::${listingId}`;
      const existing = pendingTogglesRef.current.get(pendingKey);
      if (existing) return existing;

      let currentFavorite: boolean;
      try {
        currentFavorite = readFavoriteMembership(
          favoritesStateRef.current,
          targetScope,
          listingId,
        );
      } catch {
        // A click from a stale render is a retry-only action. Loading the
        // authoritative set first prevents an empty fallback from turning a
        // real server favorite off (or vice versa).
        await refreshFavorites();
        throw new FavoritesStateUnavailableError(
          t("ui.listingCard.favorisRecharges"),
        );
      }

      // Optimistic: a heart that waits on a round trip feels broken. The service
      // result is authoritative and reconciles the set immediately after.
      const optimistic = !currentFavorite;
      const previousSnapshot = favoritesStateRef.current;
      const previousIds = previousSnapshot.ids;
      applySnapshot(targetScope, {
        scopeKey: targetScope,
        ids: optimistic
          ? [...previousIds, listingId]
          : previousIds.filter((id) => id !== listingId),
        loadState: "ready",
      });

      const operation = (async () => {
        try {
          const deliveryRequestId =
            deliveryRequestIdFromDiscoveryListingId(listingId);
          const confirmed = identity
            ? deliveryRequestId
              ? await services.delivery.setFavoriteRequest(
                  deliveryRequestId,
                  marketCode,
                  optimistic,
                )
              : await services.listings.setFavorite(
                  listingId,
                  marketCode,
                  optimistic,
                )
            : deliveryRequestId
              ? (() => {
                  throw new Error("AUTH_REQUIRED");
                })()
              : browserPreferencesService.toggleFavorite(
                  listingId,
                  GUEST_FAVORITES_KEY,
                  marketCode,
                );
          const latest = favoritesStateRef.current;
          if (
            currentScopeRef.current === targetScope &&
            latest.scopeKey === targetScope
          ) {
            const without = latest.ids.filter((id) => id !== listingId);
            applySnapshot(targetScope, {
              scopeKey: targetScope,
              ids: confirmed ? [...without, listingId] : without,
              loadState: "ready",
            });
            setFavoriteListingsState((current) =>
              reconcileFavoriteListingMutation(
                current,
                targetScope,
                listingId,
                confirmed,
              ),
            );
          }
          analyticsService.track(
            confirmed ? "listing_favorited" : "listing_unfavorited",
            { listingId, marketCode },
          );
          return confirmed;
        } catch {
          // Put the set back the way it was rather than leaving a lie on screen.
          const latest = favoritesStateRef.current;
          if (
            currentScopeRef.current === targetScope &&
            latest.scopeKey === targetScope
          ) {
            const without = latest.ids.filter((id) => id !== listingId);
            applySnapshot(targetScope, {
              scopeKey: targetScope,
              ids: currentFavorite ? [...without, listingId] : without,
              loadState: "ready",
            });
          }
          throw new Error(t("ui.listingCard.favoriErreur"));
        }
      })();
      pendingTogglesRef.current.set(pendingKey, operation);
      void operation.then(
        () => pendingTogglesRef.current.delete(pendingKey),
        () => pendingTogglesRef.current.delete(pendingKey),
      );
      return operation;
    },
    [
      applySnapshot,
      identity,
      isReadOnlyStaff,
      marketCode,
      refreshFavorites,
      scopeKey,
      t,
    ],
  );

  const clearFavorites = useCallback(async () => {
    if (isReadOnlyStaff) {
      throw new ForbiddenError(
        "Les comptes Staff ne peuvent pas utiliser les favoris de la place de marché.",
      );
    }

    const targetScope = scopeKey;
    const existingClear = inFlightClearsRef.current.get(targetScope);
    if (existingClear) return existingClear;

    const operation = (async () => {
      const pendingForScope = [...pendingTogglesRef.current.entries()]
        .filter(([key]) => key.startsWith(`${targetScope}::`))
        .map(([, pending]) => pending);
      if (pendingForScope.length > 0) {
        await Promise.allSettled(pendingForScope);
        try {
          await refreshFavorites();
        } catch {
          throw new Error(t("ui.listingCard.favorisViderErreur"));
        }
      }

      let previous: string[];
      try {
        previous = requireFavoritesReady(
          favoritesStateRef.current,
          targetScope,
        );
      } catch {
        await refreshFavorites();
        throw new FavoritesStateUnavailableError(
          t("ui.listingCard.favorisRechargesAvantVider"),
        );
      }

      applySnapshot(
        targetScope,
        beginFavoritesLoad(favoritesStateRef.current, targetScope),
      );
      const remaining = await clearFavoritesWithReconciliation(
        previous,
        async (listingId) => {
          const deliveryRequestId =
            deliveryRequestIdFromDiscoveryListingId(listingId);
          if (identity && deliveryRequestId) {
            return services.delivery.setFavoriteRequest(
              deliveryRequestId,
              marketCode,
              false,
            );
          }
          return identity
            ? services.listings.setFavorite(listingId, marketCode, false)
            : browserPreferencesService.toggleFavorite(
                listingId,
                GUEST_FAVORITES_KEY,
                marketCode,
              );
        },
        async () => {
          // A set-state response can be lost after the server commits. Never
          // restore the old local array after a partial failure: this scoped
          // read is the only trustworthy post-clear state.
          try {
            await refreshFavorites();
          } catch {
            throw new Error(t("ui.listingCard.favorisViderErreur"));
          }
          return requireFavoritesReady(favoritesStateRef.current, targetScope);
        },
      );
      if (remaining.length > 0) {
        throw new Error(t("ui.listingCard.favorisViderErreur"));
      }
    })();

    inFlightClearsRef.current.set(targetScope, operation);
    void operation.then(
      () => inFlightClearsRef.current.delete(targetScope),
      () => inFlightClearsRef.current.delete(targetScope),
    );
    return operation;
  }, [
    applySnapshot,
    identity,
    isReadOnlyStaff,
    marketCode,
    refreshFavorites,
    scopeKey,
    t,
  ]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds: isReadOnlyStaff ? EMPTY_FAVORITE_IDS : favoriteIds,
      favoriteListings,
      favoriteListingsComplete,
      count: isReadOnlyStaff ? 0 : favoriteIds.length,
      isLoading: favoriteLoadState === "loading",
      favoriteLoadState,
      favoritesError:
        favoriteLoadState === "error"
          ? t("ui.listingCard.favorisChargementErreur")
          : null,
      isFavorite,
      refreshFavorites,
      toggleFavorite,
      clearFavorites,
      canModifyFavorites: !isReadOnlyStaff,
    }),
    [
      favoriteIds,
      favoriteListings,
      favoriteListingsComplete,
      isFavorite,
      favoriteLoadState,
      refreshFavorites,
      toggleFavorite,
      clearFavorites,
      isReadOnlyStaff,
      t,
    ],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>.");
  }
  return context;
};
