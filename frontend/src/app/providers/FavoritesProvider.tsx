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
import { storageService } from "../../services/storage.service";
import { useAuth } from "./AuthProvider";
import { analyticsService } from "../../services/analytics.service";
import { ForbiddenError } from "../../security/authorization.service";
import { useStaffMarketplaceAccess } from "../../security/useStaffMarketplaceAccess";

interface FavoritesContextValue {
  /** Ids of every listing the current user has saved. */
  favoriteIds: string[];
  count: number;
  isLoading: boolean;
  isFavorite: (listingId: string) => boolean;
  /** Returns the resulting state, so callers can react without re-reading. */
  toggleFavorite: (listingId: string) => Promise<boolean>;
  clearFavorites: () => Promise<void>;
  /** False for ordinary Staff sessions; true for customers and Staff demo sandboxes. */
  canModifyFavorites: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(
  undefined,
);

const GUEST_FAVORITES_KEY = "guest";

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
 * working unchanged when the demo adapter is swapped for the HTTP one.
 */
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, isRestoring } = useAuth();
  const identity = currentUser?.id ?? null;
  const { isReadOnly: isReadOnlyStaff } = useStaffMarketplaceAccess();
  const previousIdentity = useRef<string | null | undefined>(undefined);

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
    let cancelled = false;
    if (isRestoring) return () => undefined;

    if (isReadOnlyStaff) {
      previousIdentity.current = identity;
      setFavoriteIds([]);
      setIsLoading(false);
      return () => undefined;
    }

    // Only an observed signed-out -> signed-in transition merges. Merging on
    // mount instead would hand whoever is already signed in on a shared device
    // the saves left behind by the last signed-out visitor.
    const signingIn =
      previousIdentity.current !== undefined &&
      !previousIdentity.current &&
      Boolean(identity);
    previousIdentity.current = identity;

    const loadFavorites = async () => {
      setIsLoading(true);
      try {
        if (!identity) {
          setFavoriteIds(storageService.getFavorites(GUEST_FAVORITES_KEY));
          return;
        }

        let ids = await services.listings.getFavorites();

        if (signingIn) {
          const guestIds = storageService.getFavorites(GUEST_FAVORITES_KEY);
          const missingGuestIds = guestIds.filter((id) => !ids.includes(id));
          const migratedIds = await Promise.all(
            missingGuestIds.map(async (listingId) => ({
              listingId,
              confirmed: await services.listings.toggleFavorite(listingId),
            })),
          );
          ids = [
            ...ids,
            ...migratedIds
              .filter(({ confirmed }) => confirmed)
              .map(({ listingId }) => listingId),
          ];
          // Clear only after every remote/demo adapter write succeeds. If a
          // write fails, the guest bucket remains available for a later retry.
          for (const listingId of guestIds) {
            storageService.toggleFavorite(listingId, GUEST_FAVORITES_KEY);
          }
        }

        if (!cancelled) setFavoriteIds(ids);
      } catch {
        if (!cancelled) setFavoriteIds([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [identity, isRestoring, isReadOnlyStaff]);

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

      // Optimistic: a heart that waits on a round trip feels broken. The service
      // result is authoritative and reconciles the set immediately after.
      let optimistic = false;
      setFavoriteIds((previous) => {
        optimistic = !previous.includes(listingId);
        return optimistic
          ? [...previous, listingId]
          : previous.filter((id) => id !== listingId);
      });

      try {
        const confirmed = identity
          ? await services.listings.toggleFavorite(listingId)
          : storageService.toggleFavorite(listingId, GUEST_FAVORITES_KEY);
        setFavoriteIds((previous) => {
          const without = previous.filter((id) => id !== listingId);
          return confirmed ? [...without, listingId] : without;
        });
        analyticsService.track(
          confirmed ? "listing_favorited" : "listing_unfavorited",
          { listingId },
        );
        return confirmed;
      } catch {
        // Put the set back the way it was rather than leaving a lie on screen.
        setFavoriteIds((previous) =>
          optimistic
            ? previous.filter((id) => id !== listingId)
            : [...previous, listingId],
        );
        throw new Error(
          "Impossible de mettre à jour vos favoris pour le moment.",
        );
      }
    },
    [identity, isReadOnlyStaff],
  );

  const clearFavorites = useCallback(async () => {
    if (isReadOnlyStaff) {
      throw new ForbiddenError(
        "Les comptes Staff ne peuvent pas utiliser les favoris de la place de marché.",
      );
    }

    const previous = favoriteIds;
    setFavoriteIds([]);
    try {
      if (identity) {
        await Promise.all(
          previous.map((id) => services.listings.toggleFavorite(id)),
        );
      } else {
        previous.forEach((id) =>
          storageService.toggleFavorite(id, GUEST_FAVORITES_KEY),
        );
      }
    } catch {
      setFavoriteIds(previous);
      throw new Error("Impossible de vider vos favoris pour le moment.");
    }
  }, [favoriteIds, identity, isReadOnlyStaff]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds: isReadOnlyStaff ? [] : favoriteIds,
      count: isReadOnlyStaff ? 0 : favoriteIds.length,
      isLoading: isReadOnlyStaff ? false : isLoading,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      canModifyFavorites: !isReadOnlyStaff,
    }),
    [
      favoriteIds,
      isLoading,
      isFavorite,
      toggleFavorite,
      clearFavorites,
      isReadOnlyStaff,
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
