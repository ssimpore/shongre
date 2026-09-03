import React from "react";
import { RefreshCw, ScanSearch } from "lucide-react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import type { TrendingTopic } from "../../../domains/trending/trending.types";
import {
  Container,
  EmptyState,
  ListingCardSkeleton,
  StatePanel,
} from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { HomeSectionAction } from "./HomeSectionAction";
import {
  trackHomepageEvent,
  useHomepageViewEvent,
} from "../useHomepageAnalytics";

interface TrendingTopicRailProps {
  topic: TrendingTopic;
  marketCode: string;
  position: number;
}

const TrendingTopicRail: React.FC<TrendingTopicRailProps> = ({
  topic,
  marketCode,
  position,
}) => {
  const { t } = useTranslation();
  const viewRef = useHomepageViewEvent("homepage_trending_topic_view", {
    market: marketCode,
    sectionKey: "trending",
    topicType: topic.type,
    categorySlug: topic.categorySlug,
    position,
  });

  return (
    <section ref={viewRef} aria-labelledby={`home-trending-${topic.id}`}>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={`home-trending-${topic.id}`}
            className="text-lg font-bold tracking-tight text-text-primary sm:text-xl"
          >
            {topic.title}
          </h3>
          {topic.subtitle ? (
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {topic.subtitle}
            </p>
          ) : null}
        </div>
        <HomeSectionAction
          to={topic.href}
          onClick={() =>
            trackHomepageEvent("homepage_trending_view_all_click", {
              market: marketCode,
              sectionKey: "trending",
              topicType: topic.type,
              categorySlug: topic.categorySlug,
              position,
            })
          }
        >
          {t("home.homepageTrending.viewAllListings")}
        </HomeSectionAction>
      </div>
      <div
        onClickCapture={(event) => {
          const link = (event.target as Element).closest<HTMLAnchorElement>(
            'a[href^="/annonce/"]',
          );
          if (!link) return;
          const listingId = link.getAttribute("href")?.split("/").at(-1);
          trackHomepageEvent("homepage_trending_topic_click", {
            market: marketCode,
            sectionKey: "trending",
            topicType: topic.type,
            categorySlug: topic.categorySlug,
            position: topic.listings.findIndex(
              (listing) => listing.id === listingId,
            ),
          });
        }}
      >
        <ListingRail label={topic.title}>
          {topic.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="showcase"
            />
          ))}
        </ListingRail>
      </div>
    </section>
  );
};

interface HomeTrendingSectionProps {
  section: HomepageSectionView;
  marketCode: string;
  onRetry: () => void;
}

export const HomeTrendingSection: React.FC<HomeTrendingSectionProps> = ({
  section,
  marketCode,
  onRetry,
}) => {
  const { t } = useTranslation();
  if (section.status === "empty" && !section.trending?.topics.length) {
    return (
      <Container as="section" aria-labelledby="home-trending-title">
        <HomeSectionHeading id="home-trending-title">
          {section.title}
        </HomeSectionHeading>
        <EmptyState
          icon={<ScanSearch className="h-8 w-8 text-text-muted" />}
          title={t("home.homepageTrending.emptyTitle")}
          description={t("home.homepageTrending.emptyDescription")}
          action={
            <Button to="/categories" variant="outline" size="sm">
              {t("home.homepageTrending.browseCategories")}
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container
      as="section"
      aria-labelledby="home-trending-title"
      data-testid="home-trending"
      className="space-y-6 sm:space-y-8"
    >
      <div>
        <HomeSectionHeading id="home-trending-title">
          {section.title}
        </HomeSectionHeading>
        {section.subtitle ? (
          <p className="mt-1 text-sm font-medium text-text-secondary">
            {section.subtitle}
          </p>
        ) : null}
      </div>

      {section.status === "loading" ? (
        <div className="space-y-8" aria-label={t("common.loading")}>
          {Array.from({ length: section.maxItems }).map((_, topicIndex) => (
            <div key={topicIndex}>
              <div className="skeleton-shimmer mb-4 h-6 w-40 rounded-control bg-bg-muted" />
              <ListingRail label={t("common.loading")}>
                {Array.from({ length: 6 }).map((__, listingIndex) => (
                  <ListingCardSkeleton
                    key={listingIndex}
                    className="listing-card-showcase-skeleton"
                  />
                ))}
              </ListingRail>
            </div>
          ))}
        </div>
      ) : section.status === "error" ? (
        <StatePanel
          variant="offline"
          title={t("home.homepageTrending.errorTitle")}
          description={t("home.homepageTrending.errorDescription")}
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
      ) : (
        section.trending?.topics.map((topic, index) => (
          <TrendingTopicRail
            key={topic.id}
            topic={topic}
            marketCode={marketCode}
            position={index}
          />
        ))
      )}
    </Container>
  );
};
