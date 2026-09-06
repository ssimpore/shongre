import React, { useMemo } from "react";
import { RefreshCw, ScanSearch } from "lucide-react";
import type { Listing } from "../../../types";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import {
  Container,
  EmptyState,
  ListingCardSkeleton,
  StatePanel,
} from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import { routes } from "../../../configuration/routes";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionAction } from "./HomeSectionAction";
import { HomeSectionHeading } from "./HomeSectionHeading";

type DiscoveryType = "trending" | "deals" | "recent_listings";

interface DiscoverySectionContent {
  type: DiscoveryType;
  section: HomepageSectionView;
  listings: Listing[];
}

const discoveryTypes = new Set<HomepageSectionView["type"]>([
  "trending",
  "deals",
  "recent_listings",
]);

function listingsFor(section: HomepageSectionView): Listing[] {
  if (section.type === "deals") {
    return section.deals?.map((item) => item.listing) ?? [];
  }
  if (section.type === "recent_listings") return section.listings ?? [];
  if (section.type !== "trending") return [];

  const unique = new Map<string, Listing>();
  section.trending?.topics.forEach((topic) => {
    topic.listings.forEach((listing) => unique.set(listing.id, listing));
  });
  return [...unique.values()].slice(0, Math.max(section.maxItems, 8));
}

function destinationFor(type: DiscoveryType): string {
  if (type === "deals") return routes.deals();
  if (type === "recent_listings") return "/recherche?sortBy=date_desc";
  return "/recherche?sortBy=popularite";
}

const HomeDiscoverySection: React.FC<{
  content: DiscoverySectionContent;
  onRetry: () => void;
}> = ({ content, onRetry }) => {
  const { t } = useTranslation();
  const { listings, section, type } = content;
  const headingId = `home-discovery-${type}-title`;

  return (
    <Container
      as="section"
      aria-labelledby={headingId}
      data-testid={`home-discovery-${type}`}
      data-home-discovery-type={type}
      className="[contain-intrinsic-size:auto_28rem] [content-visibility:auto]"
    >
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <HomeSectionHeading id={headingId}>
            {section.title}
          </HomeSectionHeading>
          {section.subtitle ? (
            <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
              {section.subtitle}
            </p>
          ) : null}
        </div>
        <HomeSectionAction to={destinationFor(type)}>
          {t("common.seeAll")}
        </HomeSectionAction>
      </div>

      {section.status === "loading" ? (
        <ListingRail label={t("common.loading")}>
          {Array.from({ length: 6 }).map((_, index) => (
            <ListingCardSkeleton
              key={index}
              className="listing-card-showcase-skeleton"
            />
          ))}
        </ListingRail>
      ) : section.status === "error" ? (
        <StatePanel
          variant="offline"
          title={t("common.error")}
          description={t("shell.errorBoundary.applicationARencontreUnProbleme")}
          action={
            <Button
              type="button"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={<ScanSearch className="h-8 w-8 text-text-muted" />}
          title={t("home.homepageTrending.emptyTitle")}
          description={t("home.homepageTrending.emptyDescription")}
          action={null}
        />
      ) : (
        <ListingRail label={section.title}>
          {listings.map((listing) => {
            const deal =
              type === "deals"
                ? section.deals?.find((item) => item.listing.id === listing.id)
                : undefined;
            return (
              <ListingCard
                key={listing.id}
                listing={listing}
                variant="showcase"
                pricing={
                  deal
                    ? {
                        currentPrice: deal.offer.currentPrice,
                      }
                    : undefined
                }
              />
            );
          })}
        </ListingRail>
      )}
    </Container>
  );
};

export const HomeDiscoverySections: React.FC<{
  sections: HomepageSectionView[];
  onRetry: () => void;
}> = ({ sections, onRetry }) => {
  const content = useMemo<DiscoverySectionContent[]>(
    () =>
      sections.flatMap((section) =>
        discoveryTypes.has(section.type)
          ? [
              {
                type: section.type as DiscoveryType,
                section,
                listings: listingsFor(section),
              },
            ]
          : [],
      ),
    [sections],
  );

  return (
    <>
      {content.map((item) => (
        <HomeDiscoverySection
          key={item.type}
          content={item}
          onRetry={onRetry}
        />
      ))}
    </>
  );
};
