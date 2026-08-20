import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, X } from 'lucide-react';
import { storageService } from '../../../services/storage.service';
import { RecentSearch } from '../../../types';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { useTranslation } from '../../../i18n/I18nProvider';

export const HomeRecentSearches: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecentSearches(storageService.getRecentSearchItems());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
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
              onClick={() => navigate(item.to)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(item.to);
                }
              }}
              className="group relative flex flex-col justify-between w-[240px] sm:w-[280px] md:w-auto bg-white rounded-2xl border border-stone-200/90 hover:border-stone-400/90 shadow-2xs hover:shadow-xs p-3.5 sm:p-4 min-h-[86px] sm:min-h-[92px] transition-all duration-200 cursor-pointer select-none shrink-0 snap-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {/* Top Row: Search Title + Close Icon */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, item.id)}
                  aria-label={t('home.homeRecentSearches.supprimerCetteRecherche')}
                  className="text-stone-400 hover:text-stone-700 p-1 -mr-1 -mt-1 rounded-full hover:bg-stone-100 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom Row: Location Pin + Location Name */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500 font-normal mt-2">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">
                  {item.locationLabel || t('home.homeRecentSearches.touteLaFrance')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollRail>
    </section>
  );
};
