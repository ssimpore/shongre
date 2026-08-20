import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Home as HomeIcon,
  ChevronRight,
  Search
  
  
  
  
  
} from 'lucide-react';
import { TAXONOMY } from '../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../domains/taxonomy/taxonomy.service';
import { CategoryIcon } from '../../design-system/primitives/CategoryIcon';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useTranslation } from '../../i18n/I18nProvider';

interface CategoryMeta {
  itemCountLabel: string;
  badge?: { label: string; variant: 'terracotta' | 'emerald' | 'sky' | 'amber' | 'purple' | 'rose' | 'indigo' | 'success' | 'info' | 'warning' | 'danger' };
  accentBg: string;
  accentBorder: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  vehicules: {
    itemCountLabel: '18 400+ annonces',
    badge: { label: '🛡️ Contrôle vérifié', variant: 'terracotta' },
    accentBg: 'from-orange-50/60 to-stone-50',
    accentBorder: 'border-primary-border',
  },
  immobilier: {
    itemCountLabel: '12 800+ biens',
    badge: { label: '📍 Villes & Régions', variant: 'sky' },
    accentBg: 'from-sky-50/60 to-stone-50',
    accentBorder: 'border-info-border',
  },
  'maison-deco': {
    itemCountLabel: '24 500+ pépites',
    badge: { label: '🛋️ Mobilier & Déco', variant: 'amber' },
    accentBg: 'from-amber-50/60 to-stone-50',
    accentBorder: 'border-warning-border',
  },
  'mode-beaute': {
    itemCountLabel: '31 000+ articles',
    badge: { label: '✨ Seconde main chic', variant: 'rose' },
    accentBg: 'from-rose-50/60 to-stone-50',
    accentBorder: 'border-danger-border',
  },
  multimedia: {
    itemCountLabel: '16 200+ appareils',
    badge: { label: '⚡ Reconditionné & Testé', variant: 'indigo' },
    accentBg: 'from-indigo-50/60 to-stone-50',
    accentBorder: 'border-indigo-200/80',
  },
  'sports-loisirs': {
    itemCountLabel: '14 100+ équipements',
    badge: { label: '🚴 Plein air & Cycles', variant: 'emerald' },
    accentBg: 'from-emerald-50/60 to-stone-50',
    accentBorder: 'border-success-border',
  },
  'famille-enfants': {
    itemCountLabel: '11 500+ articles',
    badge: { label: '👶 Puériculture & Jouets', variant: 'rose' },
    accentBg: 'from-pink-50/60 to-stone-50',
    accentBorder: 'border-pink-200/80',
  },
  'bricolage-jardin': {
    itemCountLabel: '9 800+ outils',
    badge: { label: '🔧 Outillage Pro', variant: 'amber' },
    accentBg: 'from-yellow-50/60 to-stone-50',
    accentBorder: 'border-warning-border',
  },
  'materiel-professionnel': {
    itemCountLabel: '6 400+ équipements',
    badge: { label: '🏢 Pour les Pros', variant: 'indigo' },
    accentBg: 'from-slate-50/80 to-stone-50',
    accentBorder: 'border-slate-200/80',
  },
  services: {
    itemCountLabel: '4 500+ prestataires',
    badge: { label: '🤝 Services de proximité', variant: 'sky' },
    accentBg: 'from-cyan-50/60 to-stone-50',
    accentBorder: 'border-info-border',
  },
  emploi: {
    itemCountLabel: '3 200+ offres',
    badge: { label: '💼 Recrutements actifs', variant: 'indigo' },
    accentBg: 'from-blue-50/60 to-stone-50',
    accentBorder: 'border-info-border',
  },
  'locations-vacances': {
    itemCountLabel: '5 800+ séjours',
    badge: { label: '☀️ Évasion & Gîtes', variant: 'emerald' },
    accentBg: 'from-teal-50/60 to-stone-50',
    accentBorder: 'border-success-border',
  },
  animaux: {
    itemCountLabel: '3 900+ annonces',
    badge: { label: '🐾 Accessoires & Soins', variant: 'amber' },
    accentBg: 'from-amber-50/60 to-stone-50',
    accentBorder: 'border-warning-border',
  },
  'art-artisanat': {
    itemCountLabel: '4 100+ créations',
    badge: { label: '🎨 Fait main & Collections', variant: 'purple' },
    accentBg: 'from-purple-50/60 to-stone-50',
    accentBorder: 'border-purple-200/80',
  },
  'musique-instruments': {
    itemCountLabel: '3 400+ instruments',
    badge: { label: '🎸 Studio & Scène', variant: 'terracotta' },
    accentBg: 'from-red-50/60 to-stone-50',
    accentBorder: 'border-danger-border',
  },
  'dons-echanges': {
    itemCountLabel: '1 200+ dons gratuits',
    badge: { label: '🎁 100% Gratuit', variant: 'emerald' },
    accentBg: 'from-emerald-50/60 to-stone-50',
    accentBorder: 'border-success-border',
  },
};

const BADGE_PILL_STYLES: Record<string, string> = {
  terracotta: 'bg-primary-light text-primary border-primary-border',
  emerald: 'bg-success-surface text-success border-success-border',
  sky: 'bg-info-surface text-info border-info-border',
  amber: 'bg-warning-surface text-warning border-warning-border',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  rose: 'bg-danger-surface text-danger border-danger-border',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  success: 'bg-success-surface text-success border-success-border',
  info: 'bg-info-surface text-info border-info-border',
  warning: 'bg-warning-surface text-warning border-warning-border',
  danger: 'bg-danger-surface text-danger border-danger-border',
};

export const CategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: "Toutes les catégories d'annonces",
    description:
      "Parcourez toutes les catégories d'annonces Shongre : véhicules, immobilier, mode, maison, multimédia, loisirs, emploi et services.",
    canonicalPath: "/categories",
  });

  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return TAXONOMY;
    const q = searchQuery.toLowerCase().trim();

    return TAXONOMY.filter((cat) => {
      const matchCat =
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q);

      const matchSub = cat.subCategories?.some((sub) =>
        sub.name.toLowerCase().includes(q) || sub.slug.toLowerCase().includes(q)
      );

      return matchCat || matchSub;
    });
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-bg-base pb-20">
      {/* 1. Breadcrumbs */}
      <div className="border-b border-border-base bg-bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-xs text-stone-500">
            <Link to="/" className="hover:text-stone-900 transition-colors inline-flex items-center gap-1 min-h-6">
              <HomeIcon className="w-3.5 h-3.5" />
              <span>Accueil</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="font-bold text-stone-900">{t('categories.categoriesPage.toutesLesCategories')}</span>
          </nav>
        </div>
      </div>

      {/* 2. Hero Header */}
      <section className="relative bg-[#FAF8F5] pt-8 pb-10 sm:py-14 border-b border-border-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <h1 className="font-display text-3xl sm:text-5xl font-bold text-stone-900 tracking-tight leading-tight">{t('categories.categoriesPage.toutesNosCategories')}</h1>

              <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-normal max-w-2xl">{t('categories.categoriesPage.explorezLEnsembleDesCategories')}</p>
            </div>

            {/* In-page Category Search */}
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="w-4.5 h-4.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('categories.categoriesPage.filtrerUneCategorieSousCategorie')}
                aria-label={t('categories.categoriesPage.filtrerUneCategorieSousCategorie')}
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm rounded-2xl bg-white border border-stone-200 shadow-2xs focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Categories Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <span className="text-xs sm:text-sm text-stone-500 font-medium">{t('categories.categoriesPage.affichageDe')}<strong>{filteredCategories.length} univers</strong>
            {searchQuery && ` pour "${searchQuery}"`}
          </span>

          <Link
            to="/recherche"
            className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap min-h-6"
          >
            <span className="hidden sm:inline">{t('categories.categoriesPage.voirToutesLesAnnonces')}</span>
            <span className="sm:hidden">{t('categories.categoriesPage.voirTout')}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {filteredCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredCategories.map((cat) => {
              const meta = CATEGORY_META[cat.slug] || {
                itemCountLabel: 'Annonces disponibles',
                accentBg: 'from-stone-50 to-white',
                accentBorder: 'border-stone-200',
              };

              const subCategories = cat.subCategories || [];

              return (
                <div
                  key={cat.id}
                  className={`group relative flex flex-col justify-between bg-gradient-to-b ${meta.accentBg} rounded-3xl border ${meta.accentBorder} hover:border-primary shadow-2xs hover:shadow-xl transition-all duration-normal p-5`}
                >
                  <div>
                    {/* Top Row: Icon + Badge */}
                    <div className="flex items-start justify-between gap-2 mb-3.5">
                      <div className="w-13 h-13 rounded-2xl bg-white border border-stone-200/90 shadow-2xs group-hover:scale-105 flex items-center justify-center transition-transform shrink-0">
                        <CategoryIcon
                          category={cat}
                          size="lg"
                          className="w-7 h-7 text-stone-800 group-hover:text-primary transition-colors"
                        />
                      </div>

                      {meta.badge && (
                        <span
                          className={`text-micro font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                            BADGE_PILL_STYLES[meta.badge.variant] || BADGE_PILL_STYLES.terracotta
                          }`}
                        >
                          {meta.badge.label}
                        </span>
                      )}
                    </div>

                    {/* Title & Count */}
                    <div className="space-y-1 mb-4">
                      <Link
                        to={`/categorie/${cat.slug}`}
                        className="text-lg font-black text-stone-900 group-hover:text-primary transition-colors block"
                      >
                        {cat.name}
                      </Link>
                                            {/* stone-400 measured 2.44:1 on the `bg-base` cream surface — an AA
                        failure (WCAG 1.4.3) on text that carries the category
                        inventory count. stone-500 is the next step of the same
                        ramp and clears 4.5:1. */}
                      <p className="text-xs font-semibold text-stone-500">
                        {meta.itemCountLabel}
                      </p>
                    </div>

                    {/* Subcategories list */}
                    <div className="pt-3 border-t border-stone-200/60 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {subCategories.map((sub) => (
                          <Link
                            key={sub.id}
                            to={`/categorie/${cat.slug}?subCategory=${sub.slug}`}
                            className="inline-flex items-center min-h-6 text-micro font-medium text-stone-600 bg-white/95 hover:bg-white hover:text-primary hover:border-primary/40 border border-stone-200/80 px-2 py-1 rounded-lg shadow-2xs transition-all active:scale-95 truncate max-w-[170px]"
                            title={sub.name}
                          >
                            {sub.shortLabel || sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Direct Link Footer */}
                  <div className="pt-4 mt-4 border-t border-stone-200/60">
                    <Link
                      to={`/categorie/${cat.slug}`}
                      className="inline-flex items-center justify-between w-full min-h-6 text-xs font-bold text-stone-800 group-hover:text-primary transition-colors"
                    >
                      <span>Explorer {getTaxonomyLabel(cat, 'compact')}</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">{t('categories.categoriesPage.aucuneCategorieTrouvee')}</h3>
            <p className="text-xs text-stone-500">
              Aucune catégorie ne correspond à votre recherche "{searchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="h-9 px-4 rounded-xl bg-stone-900 text-white font-bold text-xs hover:bg-stone-800 transition-colors"
            >{t('categories.categoriesPage.afficherToutesLesCategories')}</button>
          </div>
        )}
      </div>
    </div>
  );
};
