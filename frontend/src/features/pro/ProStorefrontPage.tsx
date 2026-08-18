import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Star,
  ShieldCheck,
  Globe,
  Phone,
  Clock,
  Search,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { userRepository } from '../../repositories/user.repository';
import { listingRepository } from '../../repositories/listing.repository';
import { UserProfile, Listing } from '../../types';
import { Avatar, Badge } from '../../design-system/primitives/Badge';
import { ListingCard } from '../../design-system/primitives/ListingCard';
import { Button } from '../../design-system/primitives/Button';
import { StatePanel } from '../../design-system/primitives/StatePanel';
import { Breadcrumbs } from '../../design-system/primitives/UIComponents';

export const ProStorefrontPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [seller, setSeller] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    userRepository.getProSellerBySlug(slug || 'atelier-nordique-sas').then((user) => {
      if (user) {
        setSeller(user);
        listingRepository.getListings({ sellerType: 'pro', limit: 20 }).then((res) => {
          setListings(res.listings.filter((l) => l.sellerId === user.id));
        });
      }
    });
  }, [slug]);

  if (!seller) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <StatePanel
          variant="notFound"
          title="Boutique introuvable"
          description="Cette boutique n'existe plus ou son adresse a changé. Parcourez l'annuaire pour trouver un professionnel équivalent."
          action={
            <Button
              to="/professionnels"
              variant="primary"
            >
              Voir l'annuaire des professionnels
            </Button>
          }
          secondaryAction={
            <Button
              to="/"
              variant="outline"
            >
              Retour à l'accueil
            </Button>
          }
        />
      </div>
    );
  }

  const filteredListings = listings.filter((l) =>
    l.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-16">
      
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs
          items={[
            { label: 'Accueil', href: '/' },
            { label: 'Boutiques Professionnelles', href: '/professionnels' },
            { label: seller.companyName || seller.name },
          ]}
        />
      </div>

      {/* Pro Banner & Profile Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-border-base overflow-hidden shadow-xs">
          
          {/* Cover Header */}
          <div className="h-44 sm:h-60 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-6 flex items-end relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <Badge variant="pro" size="md">Vendeur Professionnel Agréé</Badge>
              <Badge variant="verified" size="md" icon>SIRET Vérifié</Badge>
            </div>
          </div>

          {/* Seller details below banner */}
          <div className="p-6 sm:p-8 pt-0 relative">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
              <div className="flex items-end gap-4">
                <Avatar
                  src={seller.avatarUrl}
                  name={seller.companyName || seller.name}
                  size="xl"
                  isVerified={true}
                  isPro={true}
                  className="ring-4 ring-white shadow-lg"
                />
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-black text-stone-900">
                    {seller.companyName || seller.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-stone-600">
                    <span className="flex items-center gap-1 font-bold text-stone-900">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      {seller.rating.toFixed(1)}
                    </span>
                    <span>({seller.reviewCount} avis clients vérifiés)</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-stone-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {seller.city} ({seller.postalCode})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  to={`/compte/messages`}
                  variant="primary"
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                >
                  Contacter la boutique
                </Button>
              </div>
            </div>

            {/* Bio & Details */}
            {seller.bio && (
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed max-w-4xl border-t border-border-subtle pt-4">
                {seller.bio}
              </p>
            )}

            {/* Legal SIRET & Response info */}
            <div className="mt-4 pt-4 border-t border-border-subtle grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-stone-500">
              {seller.siret && (
                <div>
                  <span className="font-bold block text-stone-700">SIRET</span>
                  <span>{seller.siret}</span>
                </div>
              )}
              <div>
                <span className="font-bold block text-stone-700">Taux de réponse</span>
                <span>{seller.responseRatePercent}%</span>
              </div>
              <div>
                <span className="font-bold block text-stone-700">Délai moyen</span>
                <span>{seller.responseTimeText}</span>
              </div>
              <div>
                <span className="font-bold block text-stone-700">Catalogue actif</span>
                <span>{listings.length} annonce{listings.length > 1 ? 's' : ''}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Catalog Search & Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black text-stone-900">
            Catalogue de la boutique ({listings.length})
          </h2>

          <div className="w-full sm:w-72 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher dans cette boutique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs bg-white rounded-xl border border-border-base focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500 text-xs bg-white rounded-2xl border border-border-base">
            Aucun article correspondant dans cette boutique.
          </div>
        )}
      </div>

    </div>
  );
};
