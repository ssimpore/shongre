import { routes } from "../../configuration/routes";
import React, { useEffect } from "react";
import { Heart, Trash2, ArrowRight } from "lucide-react";

import { useFavorites } from "../../app/providers/FavoritesProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { ListingCard } from "../../design-system/primitives/ListingCard";
import { Button } from "../../design-system/primitives/Button";
import {
  EmptyState,
  ListingCardSkeleton,
  ListingGrid,
} from "../../design-system";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

export const FavoritesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.favorites.title"),
    description: t("meta.favorites.description"),
    canonicalPath: "/compte/favoris",
    noIndex: true,
  });

  const {
    favoriteIds,
    favoriteListings,
    favoriteListingsComplete,
    clearFavorites,
    favoriteLoadState,
    favoritesError,
    isLoading: isLoadingIds,
    refreshFavorites,
  } = useFavorites();
  const toast = useToast();

  useEffect(() => {
    if (favoriteLoadState === "ready" && !favoriteListingsComplete) {
      void refreshFavorites().catch(() => undefined);
    }
  }, [favoriteListingsComplete, favoriteLoadState, refreshFavorites]);

  const isLoading =
    isLoadingIds ||
    Boolean(favoriteLoadState === "ready" && !favoriteListingsComplete);

  const handleClearAll = async () => {
    try {
      await clearFavorites();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  };

  const handleFavoriteRetry = async () => {
    try {
      await refreshFavorites();
    } catch {
      toast.error(t("ui.listingCard.favorisChargementErreur"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-main">
            Mes annonces favorites (
            {favoriteLoadState === "ready" ? favoriteIds.length : 0})
          </h1>
          <p className="text-xs sm:text-sm text-text-tertiary mt-0.5">
            {t("favorites.favoritesPage.retrouvezLesAnnoncesQueVous")}
          </p>
        </div>

        {favoriteLoadState === "ready" &&
          favoriteListingsComplete &&
          favoriteIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              leftIcon={<Trash2 className="w-icon-sm h-icon-sm" />}
            >
              {t("favorites.favoritesPage.viderLesFavoris")}
            </Button>
          )}
      </div>

      {isLoading ? (
        <ListingGrid fluid>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </ListingGrid>
      ) : favoriteLoadState === "error" ? (
        <EmptyState
          icon={<Heart className="w-10 h-10 text-text-inverse-subtle" />}
          title={t("favorites.favoritesPage.chargementImpossibleTitle")}
          description={
            favoritesError ?? t("ui.listingCard.favorisChargementErreur")
          }
          action={
            <Button
              variant="primary"
              onClick={() => void handleFavoriteRetry()}
            >
              {t("ui.listingCard.favorisReessayer")}
            </Button>
          }
        />
      ) : favoriteListings.length > 0 ? (
        // Card titles are h3, so the grid gets its own section heading instead of
        // jumping from the page h1.
        <section aria-labelledby="favorites-grid-heading">
          <h2 id="favorites-grid-heading" className="sr-only">
            {t("favorites.favoritesPage.annoncesSauvegardees")}
          </h2>
          <ListingGrid fluid>
            {favoriteListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </ListingGrid>
        </section>
      ) : (
        <EmptyState
          icon={<Heart className="w-10 h-10 text-text-inverse-subtle" />}
          title={t("favorites.favoritesPage.aucunFavoriPourLeMoment")}
          description={t("favorites.favoritesPage.cliquezSurLeCUr")}
          action={
            <Button
              to={routes.search()}
              variant="primary"
              rightIcon={<ArrowRight className="w-icon-md h-icon-md" />}
            >
              {t("favorites.favoritesPage.explorerLesAnnonces")}
            </Button>
          }
        />
      )}
    </div>
  );
};
