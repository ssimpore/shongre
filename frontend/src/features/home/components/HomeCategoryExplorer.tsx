import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { TAXONOMY } from '../../../domains/taxonomy/taxonomy.data';
import { getTaxonomyLabel } from '../../../domains/taxonomy/taxonomy.service';
import { CategoryIcon } from '../../../design-system/primitives/CategoryIcon';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { routes } from '../../../configuration/routes';

interface CategoryVisualMeta {
  itemCountLabel: string;
  badge?: { label: string; variant: 'terracotta' | 'emerald' | 'sky' | 'amber' | 'purple' | 'rose' | 'indigo' };
  accentBg: string;
  accentBorder: string;
  hoverBorder: string;
}

const CATEGORY_META: Record<string, CategoryVisualMeta> = {
  vehicules: {
    itemCountLabel: '18 400+ annonces',
    badge: { label: '🛡️ Contrôle vérifié', variant: 'terracotta' },
    accentBg: 'from-orange-50/60 to-stone-50',
    accentBorder: 'border-orange-200/80',
    hoverBorder: 'hover:border-primary',
  },
  immobilier: {
    itemCountLabel: '12 800+ biens',
    badge: { label: '📍 Villes & Régions', variant: 'sky' },
    accentBg: 'from-sky-50/60 to-stone-50',
    accentBorder: 'border-sky-200/80',
    hoverBorder: 'hover:border-sky-500',
  },
  'maison-deco': {
    itemCountLabel: '24 500+ pépites',
    badge: { label: '🛋️ Mobilier & Déco', variant: 'amber' },
    accentBg: 'from-amber-50/60 to-stone-50',
    accentBorder: 'border-amber-200/80',
    hoverBorder: 'hover:border-amber-500',
  },
  multimedia: {
    itemCountLabel: '16 200+ appareils',
    badge: { label: '⚡ Reconditionné', variant: 'indigo' },
    accentBg: 'from-indigo-50/60 to-stone-50',
    accentBorder: 'border-indigo-200/80',
    hoverBorder: 'hover:border-indigo-500',
  },
  'mode-beaute': {
    itemCountLabel: '31 000+ articles',
    badge: { label: '✨ Seconde main chic', variant: 'rose' },
    accentBg: 'from-rose-50/60 to-stone-50',
    accentBorder: 'border-rose-200/80',
    hoverBorder: 'hover:border-rose-500',
  },
};

const BADGE_PILL_STYLES: Record<string, string> = {
  terracotta: 'bg-primary-light text-primary border-primary-border',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

export const HomeCategoryExplorer: React.FC = () => {
  // Show exactly 5 main categories on the homepage
  const topFiveCategories = TAXONOMY.slice(0, 5);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-14" aria-labelledby="home-category-explorer-title">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
        <div className="min-w-0 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200/90 text-stone-700 text-xs font-semibold shadow-2xs w-fit">
            <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Univers Thématiques</span>
          </div>

          <h2 id="home-category-explorer-title" className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Explorer par catégorie
          </h2>

          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl font-medium">
            Des millions d’annonces vérifiées classées avec précision selon vos projets et vos envies.
          </p>
        </div>

        <Link
          to="/categories"
          className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 w-fit shrink-0"
        >
          <span>Toutes les catégories</span>
          <ArrowRight className="w-4 h-4 text-stone-600" />
        </Link>
      </div>

      {/* Top 5 Categories Grid / Rail */}
      <ScrollRail label="5 catégories principales" className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
        <div className="flex gap-4 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4.5">
          {topFiveCategories.map((cat) => {
            const meta = CATEGORY_META[cat.slug] || {
              itemCountLabel: 'Annonces disponibles',
              accentBg: 'from-stone-50 to-white',
              accentBorder: 'border-stone-200',
              hoverBorder: 'hover:border-primary',
            };

            const subCategoriesToShow = cat.subCategories ? cat.subCategories.slice(0, 3) : [];

            return (
              <div
                key={cat.id}
                className={`group relative flex flex-col justify-between w-[250px] sm:w-auto shrink-0 snap-start bg-gradient-to-b ${meta.accentBg} rounded-2xl sm:rounded-3xl border ${meta.accentBorder} ${meta.hoverBorder} shadow-2xs hover:shadow-xl transition-all duration-normal p-4 sm:p-5`}
              >
                <div>
                  {/* Top Row: Icon + Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200/90 shadow-2xs group-hover:scale-105 flex items-center justify-center transition-transform shrink-0">
                      <CategoryIcon
                        category={cat}
                        size="lg"
                        className="w-6 h-6 text-stone-800 group-hover:text-primary transition-colors"
                      />
                    </div>

                    {meta.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                          BADGE_PILL_STYLES[meta.badge.variant] || BADGE_PILL_STYLES.terracotta
                        }`}
                      >
                        {meta.badge.label}
                      </span>
                    )}
                  </div>

                  {/* Title & Count */}
                  <div className="space-y-0.5 mb-3.5">
                    <Link
                      to={`/categorie/${cat.slug}`}
                      className="text-base font-black text-stone-900 group-hover:text-primary transition-colors line-clamp-1 block"
                    >
                      {cat.name}
                    </Link>
                    <p className="text-xs font-semibold text-stone-400">
                      {meta.itemCountLabel}
                    </p>
                  </div>

                  {/* Subcategory Quick Links */}
                  <div className="pt-2.5 border-t border-stone-200/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {subCategoriesToShow.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/categorie/${cat.slug}?subCategory=${sub.slug}`}
                          className="text-[11px] font-medium text-stone-600 bg-white/90 hover:bg-white hover:text-primary hover:border-primary/40 border border-stone-200/80 px-2 py-0.5 rounded-md shadow-2xs transition-all active:scale-95 truncate max-w-[130px]"
                          title={sub.name}
                        >
                          {sub.shortLabel || sub.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Main Category Entry Link */}
                <div className="pt-3 mt-3 border-t border-stone-200/60">
                  <Link
                    to={`/categorie/${cat.slug}`}
                    className="inline-flex items-center justify-between w-full text-[11px] font-bold text-stone-700 group-hover:text-primary transition-colors"
                  >
                    <span>Explorer {getTaxonomyLabel(cat, 'compact')}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollRail>
    </section>
  );
};
