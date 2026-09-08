import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Layers3 } from "lucide-react";
import { Link } from "react-router-dom";
import { IMAGE_SIZES } from "@shongre/shared";
import { routes } from "../../../configuration/routes";
import { collectionService } from "../../../domains/collection/collection.service";
import type { Collection } from "../../../domains/collection/collection.types";
import { Image } from "../../../design-system/primitives/Image";
import { Container } from "../../../design-system/primitives/Layout";
import { ScrollRail } from "../../../design-system/primitives/ScrollRail";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { HomeSectionAction } from "./HomeSectionAction";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";
import { Button } from "../../../design-system/primitives/Button";
import { StatePanel } from "../../../design-system/primitives/StatePanel";

interface HomeCollectionExplorerProps {
  section: HomepageSectionView;
}

export function selectHomeCollections(
  items: Collection[],
  section: HomepageSectionView,
): Collection[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const selected =
    section.settings.selectionMode === "automatic"
      ? items
      : (section.settings.collectionSlugs ?? []).flatMap((slug) => {
          const collection = bySlug.get(slug);
          return collection ? [collection] : [];
        });
  return selected
    .filter(
      (item) =>
        item.listingCount > 0 &&
        item.listingCount >= section.minimumListingCount,
    )
    .slice(0, section.maxItems);
}

export const HomeCollectionExplorer: React.FC<HomeCollectionExplorerProps> = ({
  section,
}) => {
  const { t } = useTranslation();
  const { currentLocale, marketContext } = useMarketLocation();
  const countryCode = marketContext?.countryCode;
  const enabled = Boolean(
    countryCode &&
    (section.settings.selectionMode === "automatic" ||
      section.settings.collectionSlugs?.length),
  );
  const query = useQuery({
    queryKey: ["home-collections", countryCode, currentLocale],
    queryFn: () =>
      collectionService.getCollections(
        { countryCode: countryCode! },
        currentLocale,
      ),
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const collections = selectHomeCollections(query.data ?? [], section);

  if (!enabled || (!query.isPending && !query.isError && !collections.length))
    return null;
  const heading =
    section.title || t("home.homeCollectionsSection.nosCollectionsDuMoment");

  return (
    <Container
      as="section"
      aria-labelledby="home-collection-explorer-title"
      data-testid="home-collection-explorer"
      className={homepageVisibilityClass(section)}
    >
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <HomeSectionHeading id="home-collection-explorer-title">
            {heading}
          </HomeSectionHeading>
          {section.subtitle ? (
            <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
              {section.subtitle}
            </p>
          ) : null}
        </div>
        <HomeSectionAction to={routes.collections.list()}>
          {t("home.homeCollectionsSection.toutesLesCollections")}
        </HomeSectionAction>
      </div>

      {query.isPending ? (
        <div
          className="h-48 animate-pulse rounded-listing-card bg-bg-subtle"
          role="status"
          aria-label={t("common.loading")}
        />
      ) : query.isError ? (
        <StatePanel
          variant="offline"
          title={t("home.homeCollectionsSection.unavailable")}
          description={t("home.homeCollectionsSection.retryDescription")}
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => void query.refetch()}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : (
        <ScrollRail
          snap
          label={heading}
          className="-mx-4 px-4 py-1.5 sm:mx-0 sm:px-0"
        >
          <div className="flex w-max items-stretch gap-3 sm:gap-4 lg:w-full">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                to={routes.collections.detail(collection.slug)}
                aria-label={t(
                  "home.homeCollectionsSection.explorerLaCollection",
                  { name: collection.title },
                )}
                className="group relative h-48 w-64 shrink-0 snap-start overflow-hidden rounded-listing-card border border-border-base bg-bg-subtle shadow-xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-lg lg:min-w-0 lg:flex-1"
              >
                <Image
                  src={collection.coverImageUrl}
                  alt=""
                  sizes={IMAGE_SIZES.card}
                  className="absolute inset-0 h-full w-full object-cover motion-surface group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-surface-overlay-deep/85 via-surface-overlay-deep/25 to-surface-overlay-deep/10" />
                <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-text-inverse">
                  <span className="min-w-0">
                    <span className="block text-base font-bold leading-tight">
                      {collection.shortTitle}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-text-inverse/85">
                      <Layers3 className="h-icon-sm w-icon-sm shrink-0" />
                      {t(
                        collection.listingCount === 1
                          ? "home.homeCollectionsSection.listingCountOne"
                          : "home.homeCollectionsSection.listingCountMany",
                        { formattedCount: collection.itemCountLabel },
                      )}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-on-inverse/30 bg-bg-surface/15">
                    <ArrowRight className="h-icon-sm w-icon-sm" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </ScrollRail>
      )}
    </Container>
  );
};
