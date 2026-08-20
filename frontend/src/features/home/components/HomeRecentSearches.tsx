import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, X } from 'lucide-react';
import { storageService } from '../../../services/storage.service';
import { RecentSearch } from '../../../types';
import { ScrollRail } from '../../../design-system/primitives/ScrollRail';
import { Container } from '../../../design-system/primitives/Layout';
import { IconButton } from '../../../design-system/primitives/IconButton';
import { useTranslation } from '../../../i18n/I18nProvider';
import { HomeSectionHeading } from './HomeSectionHeading';

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
    <Container
      as="section"
      aria-labelledby="home-recent-searches-title"
    >
      {/* Section Header */}
      <div className="mb-4 sm:mb-6">
        <HomeSectionHeading id="home-recent-searches-title">
          {t('home.homeRecentSearches.recherchesRecentes')}
        </HomeSectionHeading>
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
              className="group relative w-[272px] shrink-0 snap-start overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs transition-all duration-normal hover:-translate-y-0.5 hover:border-primary-border hover:shadow-md sm:w-[304px] md:w-auto"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-3 left-0 w-0.5 rounded-r-full bg-primary opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-within:opacity-100"
              />

              {/* The destination and delete action are siblings. The former
                  implementation made the whole card a role=button and nested
                  the delete button inside it, which creates two overlapping
                  controls and fails WCAG 4.1.2. */}
              <Link
                to={item.to}
                className="flex min-h-24 items-center gap-3.5 rounded-card p-4 pr-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:min-h-[104px] sm:gap-4 sm:p-5 sm:pr-14"
              >
                <span className="flex h-control-md w-control-md shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary transition-colors duration-normal group-hover:bg-primary group-hover:text-white group-focus-within:bg-primary group-focus-within:text-white">
                  <Search className="h-icon-lg w-icon-lg" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-stone-900 transition-colors duration-fast group-hover:text-primary sm:text-base">
                    {item.title}
                  </h3>

                  <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-stone-500">
                    <MapPin className="h-icon-sm w-icon-sm shrink-0 text-stone-400" aria-hidden="true" />
                    <span className="truncate">
                      {item.locationLabel || t('home.homeRecentSearches.touteLaFrance')}
                    </span>
                  </span>
                </span>
              </Link>

              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                ariaLabel={`${t('home.homeRecentSearches.supprimerCetteRecherche')} : ${item.title}`}
                className="absolute right-2 top-2 z-raised rounded-full text-stone-400 hover:bg-primary-light hover:text-primary sm:right-2.5 sm:top-2.5"
              >
                <X className="h-icon-md w-icon-md" />
              </IconButton>
            </div>
          ))}
        </div>
      </ScrollRail>
    </Container>
  );
};
