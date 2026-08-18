import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { services } from '../../api/client/service-registry';

interface FavoritesContextValue {
  /** Ids of every listing the current user has saved. */
  favoriteIds: string[];
  count: number;
  isLoading: boolean;
  isFavorite: (listingId: string) => boolean;
  /** Returns the resulting state, so callers can react without re-reading. */
  toggleFavorite: (listingId: string) => Promise<boolean>;
  clearFavorites: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

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
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    services.listings
      .getFavorites()
      .then((ids) => {
        if (!cancelled) setFavoriteIds(ids);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isFavorite = useCallback(
    (listingId: string) => favoriteIds.includes(listingId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(async (listingId: string) => {
    // Optimistic: a heart that waits on a round trip feels broken. The service
    // result is authoritative and reconciles the set immediately after.
    let optimistic = false;
    setFavoriteIds((previous) => {
      optimistic = !previous.includes(listingId);
      return optimistic ? [...previous, listingId] : previous.filter((id) => id !== listingId);
    });

    try {
      const confirmed = await services.listings.toggleFavorite(listingId);
      setFavoriteIds((previous) => {
        const without = previous.filter((id) => id !== listingId);
        return confirmed ? [...without, listingId] : without;
      });
      return confirmed;
    } catch {
      // Put the set back the way it was rather than leaving a lie on screen.
      setFavoriteIds((previous) =>
        optimistic ? previous.filter((id) => id !== listingId) : [...previous, listingId],
      );
      throw new Error('Impossible de mettre à jour vos favoris pour le moment.');
    }
  }, []);

  const clearFavorites = useCallback(async () => {
    const previous = favoriteIds;
    setFavoriteIds([]);
    try {
      await Promise.all(previous.map((id) => services.listings.toggleFavorite(id)));
    } catch {
      setFavoriteIds(previous);
      throw new Error('Impossible de vider vos favoris pour le moment.');
    }
  }, [favoriteIds]);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoriteIds,
      count: favoriteIds.length,
      isLoading,
      isFavorite,
      toggleFavorite,
      clearFavorites,
    }),
    [favoriteIds, isLoading, isFavorite, toggleFavorite, clearFavorites],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = (): FavoritesContextValue => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used inside <FavoritesProvider>.');
  }
  return context;
};
