import React from "react";
import { IMAGE_SIZES } from "@shongre/shared";
import { Link } from "react-router-dom";
import { ArrowRight, Layers3 } from "lucide-react";
import { routes } from "../../../configuration/routes";
import { collectionService } from "../../../domains/collection/collection.service";
import type { Collection } from "../../../domains/collection/collection.types";
import { Image } from "../../../design-system/primitives/Image";
import { Container } from "../../../design-system/primitives/Layout";
import { ScrollRail } from "../../../design-system/primitives/ScrollRail";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { HomeSectionAction } from "./HomeSectionAction";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";

interface HomeCollectionExplorerProps {
  section: HomepageSectionView;
}

export const HomeCollectionExplorer: React.FC<HomeCollectionExplorerProps> = ({
  section,
}) => {
  const { t } = useTranslation();
  const heading =
    section.title || t("home.homeCollectionsSection.nosCollectionsDuMoment");
  const eligibleCollections: Collection[] = (
    section.settings.collectionSlugs || []
  ).flatMap((slug) => {
    const collection = collectionService.getCollection(slug);
    return collection ? [collection] : [];
  });

  if (eligibleCollections.length < section.minimumListingCount) return null;
  const collections = eligibleCollections.slice(0, section.maxItems);

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
          <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
            {section.subtitle ||
              t(
                "home.homeCollectionsSection.desSelectionsThematiquesPrepareesPour",
              )}
          </p>
        </div>

        <HomeSectionAction to={routes.collections.list()}>
          {t("home.homeCollectionsSection.toutesLesCollections")}
        </HomeSectionAction>
      </div>

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
              className="group relative h-48 w-64 shrink-0 snap-start overflow-hidden rounded-control border border-border-base bg-bg-subtle shadow-xs motion-surface hover:-translate-y-0.5 hover:border-primary-border hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus lg:min-w-0 lg:flex-1"
            >
              <Image
                src={collection.coverImageUrl}
                alt=""
                sizes={IMAGE_SIZES.card}
                className="absolute inset-0 h-full w-full object-cover motion-surface group-hover:scale-105"
              />
              <span
                className="absolute inset-0 bg-gradient-to-t from-surface-overlay-deep/85 via-surface-overlay-deep/25 to-surface-overlay-deep/10"
                aria-hidden="true"
              />

              <span className="absolute inset-x-3 top-3">
                <span className="inline-flex max-w-full truncate rounded-pill border border-border-on-inverse/30 bg-surface-overlay-deep/55 px-2.5 py-1 text-micro font-bold text-text-inverse shadow-xs backdrop-blur-xs">
                  {collection.badge.label}
                </span>
              </span>

              <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-text-inverse">
                <span className="min-w-0">
                  <span className="block text-base font-bold leading-tight">
                    {collection.shortTitle}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-text-inverse/85">
                    <Layers3
                      className="h-icon-sm w-icon-sm shrink-0"
                      aria-hidden="true"
                    />
                    <span className="truncate">
                      {collection.itemCountLabel}
                    </span>
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-on-inverse/30 bg-bg-surface/15 backdrop-blur-xs motion-interactive group-hover:bg-bg-surface group-hover:text-primary">
                  <ArrowRight
                    className="h-icon-sm w-icon-sm motion-interactive group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </ScrollRail>
    </Container>
  );
};
