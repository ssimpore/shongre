import React, { useState, useEffect } from 'react';
import {  Search    } from 'lucide-react';

import { userRepository } from '../../repositories/user.repository';
import { UserProfile } from '../../types';
import { SellerCard } from '../../design-system/primitives/SellerCard';
import { Breadcrumbs } from '../../design-system';
import { Button } from '../../design-system/primitives/Button';
import { NoResultsFound } from '../../design-system/primitives/NoResultsFound';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

export const ProDirectoryPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Annuaire des vendeurs professionnels",
    description:
      "Trouvez un vendeur professionnel vérifié sur Shongre : boutiques, spécialités et avis clients, partout en France.",
    canonicalPath: "/professionnels",
  });

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
          <h1 className="text-2xl sm:text-3xl font-black text-white">{t('pro.proDirectoryPage.trouvezDesCommercantsEtArtisans')}</h1>
          <p className="text-xs sm:text-sm text-stone-300">{t('pro.proDirectoryPage.toutesLesEntreprisesReferenceesPossedent')}</p>
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
            placeholder={t('proDirectory.rechercherParNomDeBoutique')}
            aria-label={t('proDirectory.rechercherUneBoutiqueProfessionnelle')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-control-touch pl-10 pr-3 bg-white text-xs sm:text-sm rounded-control border border-border-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {/* Live, so filtering announces its own result. The count also stops
            pluralising by hand: `> 1 ? 's' : ''` puts 0 in the plural, which is
            wrong in French ("0 boutique disponible"), and cannot express the
            few/many categories other locales need. */}
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-stone-500 font-semibold"
        >
          {t('proDirectory.boutiquesDisponibles', { count: filtered.length })}
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
          title={t('proDirectory.aucuneBoutiqueProfessionnelleTrouvee')}
          description={t('proDirectory.aucunCommercantOuArtisanNe')}
          onClearFilters={() => setSearch('')}
          clearFiltersLabel={t('proDirectory.effacerLaRecherche')}
        />
      )}
    </div>
  );
};
