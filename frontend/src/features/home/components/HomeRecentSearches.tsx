import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, X } from 'lucide-react';
import { storageService } from '../../../services/storage.service';
import { RecentSearch } from '../../../types';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { useTranslation } from '../../../i18n/I18nProvider';

export const HomeRecentSearches: React.FC = () => {
  const { t } = useTranslation();
  // Read once during state initialisation. Rendering an empty rail and filling
  // it in an effect caused a visible layout shift after the home page mounted.
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() =>
    storageService.getRecentSearchItems()
  );

  const handleDelete = (id: string) => {
    storageService.deleteRecentSearchItem(id);
    setRecentSearches(storageService.getRecentSearchItems());
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      aria-labelledby="home-recent-searches-title"
    >
      {/* Section Header */}
      <div className="mb-3 sm:mb-4">
        <h2
          id="home-recent-searches-title"
          className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight"
        >
          {t('home.homeRecentSearches.recherchesRecentes')}
        </h2>
      </div>

      {/* Recent Searches Cards Rail / Grid */}
      <ScrollRail
        label={t('home.homeRecentSearches.recherchesRecentes')}
        snap
        className="-mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible"
      >
        <div className="flex gap-3 sm:gap-4 md:grid md:grid-cols-3 min-w-max md:min-w-0">
          {recentSearches.map((item) => (
            <div
              key={item.id}
              className="group relative w-[240px] sm:w-[280px] md:w-auto bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400/90 shadow-2xs hover:shadow-xs transition-all duration-normal select-none shrink-0 snap-start"
            >
              {/* The destination and delete action are siblings. The former
                  implementation made the whole card a role=button and nested
                  the delete button inside it, which creates two overlapping
                  controls and fails WCAG 4.1.2. */}
              <Link
                to={item.to}
                className="flex min-h-[86px] flex-col justify-between rounded-2xl p-3.5 pr-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-[92px] sm:p-4 sm:pr-12"
              >
                <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors duration-fast">
                  {item.title}
                </h3>

                <span className="flex items-center gap-1.5 text-xs text-stone-500 font-normal mt-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">
                    {item.locationLabel || t('home.homeRecentSearches.touteLaFrance')}
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label={`${t('home.homeRecentSearches.supprimerCetteRecherche')} : ${item.title}`}
                className="absolute right-2.5 top-2.5 z-10 inline-flex min-h-6 min-w-6 items-center justify-center rounded-full text-stone-500 transition-colors duration-fast hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:right-3 sm:top-3"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </ScrollRail>
    </section>
  );
};
