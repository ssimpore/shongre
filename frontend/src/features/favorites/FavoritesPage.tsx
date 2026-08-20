import { routes } from '../../configuration/routes';
import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ArrowRight } from 'lucide-react';

import { Listing } from '../../types';
import { services } from '../../api/client/service-registry';
import { useFavorites } from '../../app/providers/FavoritesProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { ListingRail } from '../../design-system/primitives/ListingRail';
import { Button } from '../../design-system/primitives/Button';
import { EmptyState, Skeleton } from '../../design-system';
import { useTranslation } from '../../i18n/I18nProvider';
import { usePageMeta } from '../../hooks/usePageMeta';

export const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.favorites.title'),
    description: t('meta.favorites.description'),
    canonicalPath: '/compte/favoris',
    noIndex: true,
  });

  const { favoriteIds, clearFavorites, isLoading: isLoadingIds } = useFavorites();
  const toast = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  useEffect(() => {
    let cancelled = false;
    services.listings
      .getListings()
      .then((result) => {
        if (!cancelled) setListings(result.listings);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingListings(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Derived from the shared favourite set, so un-hearting a card removes it
  // here without this page tracking its own copy of the truth.
  const favoriteListings = listings.filter((listing) => favoriteIds.includes(listing.id));
  const isLoading = isLoadingIds || isLoadingListings;

  const handleClearAll = async () => {
    try {
      await clearFavorites();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Mes annonces favorites ({favoriteListings.length})
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{t('favorites.favoritesPage.retrouvezLesAnnoncesQueVous')}</p>
        </div>

        {favoriteListings.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>{t('favorites.favoritesPage.viderLesFavoris')}</Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : favoriteListings.length > 0 ? (
        // Card titles are h3, so the grid gets its own section heading instead of
        // jumping from the page h1.
        <section aria-labelledby="favorites-grid-heading">
          <h2 id="favorites-grid-heading" className="sr-only">{t('favorites.favoritesPage.annoncesSauvegardees')}</h2>
          <ListingRail label={t('favorites.favoritesPage.annoncesSauvegardees')}>
            {favoriteListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingRail>
        </section>
      ) : (
        <EmptyState
          icon={<Heart className="w-10 h-10 text-stone-400" />}
          title={t('favorites.favoritesPage.aucunFavoriPourLeMoment')}
          description={t('favorites.favoritesPage.cliquezSurLeCUr')}
          action={
            <Button
              to={routes.search()}
              variant="primary"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >{t('favorites.favoritesPage.explorerLesAnnonces')}</Button>
          }
        />
      )}
    </div>
  );
};
