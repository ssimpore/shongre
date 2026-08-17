import { routes } from '../../configuration/routes';
import React, { useState, useEffect } from 'react';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listingRepository } from '../../repositories/listing.repository';
import { Listing } from '../../types';
import { storageService } from '../../services/storage.service';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { Button } from '../../design-system/primitives/Button';
import { EmptyState } from '../../design-system/primitives/UIComponents';

export const FavoritesPage: React.FC = () => {
  const [favoriteListings, setFavoriteListings] = useState<Listing[]>([]);

  useEffect(() => {
    const favIds = storageService.getFavorites();
    const all = storageService.getListings();
    setFavoriteListings(all.filter((l) => favIds.includes(l.id)));
  }, []);

  const handleFavoriteToggle = (id: string, isFav: boolean) => {
    if (!isFav) {
      setFavoriteListings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleClearAll = () => {
    storageService.getFavorites().forEach((id) => storageService.toggleFavorite(id));
    setFavoriteListings([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900">
            Mes annonces favorites ({favoriteListings.length})
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
            Retrouvez les annonces que vous avez sauvegardées
          </p>
        </div>

        {favoriteListings.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAll} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
            Vider les favoris
          </Button>
        )}
      </div>

      {favoriteListings.length > 0 ? (
        // Card titles are h3, so the grid gets its own section heading instead of
        // jumping from the page h1.
        <section aria-labelledby="favorites-grid-heading">
          <h2 id="favorites-grid-heading" className="sr-only">
            Annonces sauvegardées
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favoriteListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={<Heart className="w-10 h-10 text-stone-400" />}
          title="Aucun favori pour le moment"
          description="Cliquez sur le cœur d'une annonce pour la sauvegarder et la retrouver facilement ici."
          action={
            <Link to={routes.search()}>
              <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explorer les annonces
              </Button>
            </Link>
          }
        />
      )}
    </div>
  );
};
