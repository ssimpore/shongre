import React, { useState, useEffect } from 'react';
import { Building2, Search, MapPin, Star, ShieldCheck, ArrowRight } from 'lucide-react';

import { userRepository } from '../../repositories/user.repository';
import { UserProfile } from '../../types';
import { SellerCard } from '../../design-system/primitives/SellerCard';
import { Breadcrumbs } from '../../design-system/primitives/UIComponents';
import { Button } from '../../design-system/primitives/Button';
import { NoResultsFound } from '../../design-system/primitives/NoResultsFound';

export const ProDirectoryPage: React.FC = () => {
  const [proSellers, setProSellers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    userRepository.getAllProSellers().then(setProSellers);
  }, []);

  const filtered = proSellers.filter(
    (s) =>
      (s.companyName || s.name).toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Accueil', href: '/' },
          { label: 'Annuaire des Boutiques Professionnelles' },
        ]}
      />

      <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-2xl p-6 sm:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold">
            <Building2 className="w-3.5 h-3.5" />
            Vendeurs Professionnels Agréés
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Trouvez des commerçants et artisans de confiance
          </h1>
          <p className="text-xs sm:text-sm text-stone-300">
            Toutes les entreprises référencées possèdent un numéro SIRET vérifié et proposent des garanties professionnelles.
          </p>
        </div>

        <Button
          to="/inscription/professionnel"
          variant="primary"
          size="lg"
          className="shrink-0 font-bold"
        >
          Ouvrir ma boutique Pro
        </Button>
      </div>

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom de boutique ou par ville..."
            aria-label="Rechercher une boutique professionnelle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-control-touch pl-10 pr-3 bg-white text-xs sm:text-sm rounded-xl border border-border-base focus:outline-none focus:border-primary"
          />
        </div>
        <span className="text-xs text-stone-500 font-semibold">
          {filtered.length} boutique{filtered.length > 1 ? 's' : ''} disponible{filtered.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Stores Grid or Empty State */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((seller) => (
            <SellerCard key={seller.id} user={seller} />
          ))}
        </div>
      ) : (
        <NoResultsFound
          id="pro-directory-no-results"
          query={search}
          title="Aucune boutique professionnelle trouvée"
          description="Aucun commerçant ou artisan ne correspond à votre recherche par nom ou par ville."
          onClearFilters={() => setSearch('')}
          clearFiltersLabel="Effacer la recherche"
        />
      )}
    </div>
  );
};
