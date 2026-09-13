import { Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { routes } from "../../../configuration/routes";
import { Container } from "../../../design-system/primitives/Layout";
import { IconButton } from "../../../design-system/primitives/IconButton";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";
import { useRecentSearches } from "../../../hooks/useRecentSearches";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";

export function HomeRecentSearches({
  section,
}: {
  section: HomepageSectionView;
}) {
  const { t } = useTranslation();
  const { recentSearches, removeSearch } = useRecentSearches();
  const searches = recentSearches.slice(0, section.maxItems);
  if (!searches.length || searches.length < section.minimumListingCount)
    return null;

  return (
    <Container
      as="section"
      width="results"
      aria-labelledby="home-recent-searches-title"
      className={homepageVisibilityClass(section)}
    >
      <HomeSectionHeading id="home-recent-searches-title">
        {section.title || t("home.homeRecentSearches.recherchesRecentes")}
      </HomeSectionHeading>
      {section.subtitle ? (
        <p className="mt-1 text-sm text-text-secondary">{section.subtitle}</p>
      ) : null}
      <div
        className="mt-4 flex flex-wrap gap-2.5"
        data-testid="home-recent-searches"
      >
        {searches.map((query) => (
          <div
            key={query}
            data-testid="home-recent-search-chip"
            className="flex max-w-full items-center gap-1 rounded-pill border border-border-base bg-bg-surface pl-3 pr-1 shadow-xs"
          >
            <Link
              to={routes.search(query)}
              className="flex min-h-control-md min-w-0 items-center gap-2 rounded-control text-sm font-semibold text-text-main decoration-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Search
                aria-hidden="true"
                className="h-icon-sm w-icon-sm shrink-0 text-text-muted"
              />
              <span className="break-words py-2 [overflow-wrap:anywhere]">
                {query}
              </span>
            </Link>
            <IconButton
              variant="ghost"
              size="sm"
              className="shrink-0"
              ariaLabel={`${t("home.homeRecentSearches.supprimerCetteRecherche")} : ${query}`}
              onClick={() => removeSearch(query)}
            >
              <X aria-hidden="true" className="h-icon-sm w-icon-sm" />
            </IconButton>
          </div>
        ))}
      </div>
    </Container>
  );
}
