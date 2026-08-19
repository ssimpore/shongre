import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ChevronRight,
  Layers,
  TrendingUp,
  Tag,
  Shirt,
  Home,
  Bike,
} from 'lucide-react';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { Image } from '../../../design-system/primitives/Image';
import { IMAGE_SIZES } from '../../../design-system/primitives/responsiveImage';
import { collectionService } from '../../../domains/collection/collection.service';
import { CollectionPillarId } from '../../../domains/collection/collection.types';

const BADGE_STYLES: Record<string, string> = {
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

const HOME_PILLARS: { id: CollectionPillarId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'editorial', label: 'Tendances & Pépites', icon: Sparkles },
  { id: 'budget', label: 'Bons plans & Petits prix', icon: Tag },
  { id: 'style', label: 'Vintage & Éco', icon: Shirt },
  { id: 'lifestyle', label: 'Maison & Déco', icon: Home },
  { id: 'mobility', label: 'Mobilité & Plein air', icon: Bike },
];

export const HomeCollectionsSection: React.FC = () => {
  const [activePillar, setActivePillar] = useState<CollectionPillarId>('editorial');

  const displayedCollections = collectionService.getCollections(activePillar).slice(0, 4);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16" aria-labelledby="home-collections-title">
      {/* Section Header */}
      <div className="flex items-end justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0 space-y-1">
          <h2 id="home-collections-title" className="text-xl sm:text-3xl font-black text-stone-900 tracking-tight">
            Nos collections du moment
          </h2>

          <p className="text-xs sm:text-sm text-stone-500 max-w-2xl font-medium hidden sm:block">
            Des sélections thématiques préparées pour dénicher des pépites uniques, durables et vérifiées.
          </p>
        </div>

        <Link
          to="/collections"
          className="text-xs sm:text-sm font-bold text-stone-900 bg-white border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all shadow-2xs active:scale-95 flex items-center gap-1.5 w-fit shrink-0 whitespace-nowrap mb-0.5"
        >
          <span className="hidden sm:inline">Toutes les collections</span>
          <span className="sm:hidden">Voir tout</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-600" />
        </Link>
      </div>

      {/* Quick Theme Switcher Pills */}
      <div className="mb-6">
        <ScrollRail label="thématiques collections" className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-2 min-w-max">
            {HOME_PILLARS.map((p) => {
              const isSelected = activePillar === p.id;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActivePillar(p.id)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-primary' : 'text-stone-400'}`} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </ScrollRail>
      </div>

      {/* Collections Grid / Rail */}
      <ScrollRail label="collections" className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
        <div className="flex gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-6">
          {displayedCollections.map((col) => (
            <Link
              key={col.id}
              to={`/collections/${col.slug}`}
              className="group relative flex flex-col justify-between w-[280px] sm:w-auto shrink-0 snap-start bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 hover:border-stone-300 shadow-sm hover:shadow-xl transition-all duration-normal overflow-hidden active:scale-[0.98]"
            >
              {/* Media Well with image zoom */}
              <div className="relative w-full h-44 sm:h-48 overflow-hidden bg-stone-100 shrink-0">
                <Image
                  src={col.coverImageUrl}
                  alt={col.title}
                  sizes={IMAGE_SIZES.card}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out-soft"
                />

                {/* Subtle gradient vignette to protect pill badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

                {/* Top Badge */}
                <div className="absolute top-3 left-3 z-10">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-xs backdrop-blur-xs ${
                      BADGE_STYLES[col.badge.variant] || BADGE_STYLES.terracotta
                    }`}
                  >
                    {col.badge.label}
                  </span>
                </div>

                {/* Bottom Item Counter Pill on Image */}
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-[11px] font-semibold">
                    <Layers className="w-3 h-3 text-stone-300" />
                    {col.itemCountLabel}
                  </span>
                </div>
              </div>

              {/* Content Body */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-bold text-stone-900 group-hover:text-primary transition-colors leading-snug line-clamp-1">
                    {col.title}
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed font-normal">
                    {col.subtitle}
                  </p>
                </div>

                {/* Tags & Action Link */}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    {col.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] sm:text-[11px] font-medium text-stone-600 bg-stone-100 group-hover:bg-stone-200/80 px-2 py-0.5 rounded-md transition-colors truncate"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="w-7 h-7 rounded-full bg-stone-100 group-hover:bg-primary group-hover:text-white text-stone-600 flex items-center justify-center transition-colors shrink-0">
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ScrollRail>
    </section>
  );
};
