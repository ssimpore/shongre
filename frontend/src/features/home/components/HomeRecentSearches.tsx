import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, X } from "lucide-react";
import {
  RECENT_SEARCH_ITEMS_CHANGED_EVENT,
  storageService,
} from "../../../services/storage.service";
import { RecentSearch } from "../../../types";
import { Container } from "../../../design-system/primitives/Layout";
import { IconButton } from "../../../design-system/primitives/IconButton";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { normalizeRecentSearchesLimit } from "../../../domains/market/market.constants";
import { getRecentSearchTitle } from "../../../domains/taxonomy/taxonomy.display";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";

interface HomeRecentSearchesProps {
  section: HomepageSectionView;
}

export const HomeRecentSearches: React.FC<HomeRecentSearchesProps> = ({
  section,
}) => {
  const { t } = useTranslation();
  const { effectiveConfig } = useMarketLocation();
  // Browser persistence cannot influence the initial hydrated tree.
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    const refreshRecentSearches = () => {
      setRecentSearches(storageService.getRecentSearchItems());
    };

    refreshRecentSearches();

    // The custom event covers same-tab writes; the native event covers another
    // tab. Both keep the section reactive without turning storage into a second
    // source of React state.
    window.addEventListener(
      RECENT_SEARCH_ITEMS_CHANGED_EVENT,
      refreshRecentSearches,
    );
    window.addEventListener("storage", refreshRecentSearches);
    return () => {
      window.removeEventListener(
        RECENT_SEARCH_ITEMS_CHANGED_EVENT,
        refreshRecentSearches,
      );
      window.removeEventListener("storage", refreshRecentSearches);
    };
  }, []);

  const handleDelete = (id: string) => {
    storageService.deleteRecentSearchItem(id);
    setRecentSearches(storageService.getRecentSearchItems());
  };

  if (recentSearches.length < section.minimumListingCount) {
    return null;
  }

  const visibleRecentSearches = recentSearches.slice(
    0,
    Math.min(
      section.maxItems,
      normalizeRecentSearchesLimit(
        effectiveConfig.features.recentSearchesLimit,
      ),
    ),
  );

  return (
    <Container
      as="section"
      aria-labelledby="home-recent-searches-title"
      className={homepageVisibilityClass(section)}
    >
      {/* Section Header */}
      <div className="mb-3 sm:mb-4">
        <HomeSectionHeading id="home-recent-searches-title">
          {section.title || t("home.homeRecentSearches.recherchesRecentes")}
        </HomeSectionHeading>
      </div>

      <div
        className="flex flex-wrap gap-2.5"
        data-testid="home-recent-searches"
      >
        {visibleRecentSearches.map((item) => {
          const displayTitle = getRecentSearchTitle(item);

          return (
            <div
              key={item.id}
              data-testid="home-recent-search-chip"
              className="group flex max-w-full items-center rounded-pill border border-border-base bg-bg-surface shadow-xs motion-surface hover:border-primary-border hover:shadow-sm"
            >
              {/* The destination and delete action remain siblings so the chip
                  exposes two valid, non-overlapping controls. */}
              <Link
                to={item.to}
                className="flex min-w-0 items-center gap-2 rounded-l-pill py-2 pl-3 pr-1 text-sm font-bold text-text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus group-hover:text-primary"
              >
                <Search
                  className="h-icon-md w-icon-md shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="max-w-52 truncate sm:max-w-64">
                  {displayTitle}
                </span>
              </Link>

              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(item.id)}
                ariaLabel={`${t("home.homeRecentSearches.supprimerCetteRecherche")} : ${displayTitle}`}
                className="mr-1 shrink-0 rounded-full text-text-muted hover:bg-primary-light hover:text-primary"
              >
                <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
              </IconButton>
            </div>
          );
        })}
      </div>
    </Container>
  );
};
