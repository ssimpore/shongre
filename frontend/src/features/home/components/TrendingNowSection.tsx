import React, { useEffect } from "react";
import { ArrowRight, Flame, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { services } from "../../../api/client/service-registry";
import type { TrendingTopic } from "../../../domains/trending/trending.types";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { useAuth } from "../../../app/providers/AuthProvider";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import {
  Container,
  Heading,
  ListingGrid,
  ListingCardSkeleton,
} from "../../../design-system";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { analyticsService } from "../../../services/analytics.service";
import { useTranslation } from "../../../i18n/I18nProvider";

const TOPIC_LISTINGS = 5;

function topicQueryCity(city: string): string | undefined {
  if (!city || city.startsWith("Tout") || city.startsWith("Toute"))
    return undefined;
  return city;
}

function TrendingLoading(): React.ReactElement {
  return (
    <div
      className="space-y-7"
      aria-busy="true"
      aria-label="Chargement des tendances"
    >
      {Array.from({ length: 2 }).map((_, topicIndex) => (
        <div
          key={topicIndex}
          className="space-y-4 border-t border-border-subtle pt-6 first:border-t-0 first:pt-0"
        >
          <div className="space-y-2">
            <div className="h-7 w-44 animate-pulse rounded-control bg-bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded-control bg-bg-muted" />
          </div>
          <ListingGrid>
            {Array.from({ length: TOPIC_LISTINGS }).map((__, index) => (
              <ListingCardSkeleton
                key={index}
                className="rounded-card border border-border-base bg-bg-surface p-2"
              />
            ))}
          </ListingGrid>
        </div>
      ))}
    </div>
  );
}

function topicHeadingId(topicId: string): string {
  const safeTopicId = topicId.replace(/[^a-z0-9_-]/gi, "-");
  return `trending-topic-heading-${safeTopicId || "topic"}`;
}

function TrendingTopicSection({
  topic,
  position,
  marketCode,
}: {
  topic: TrendingTopic;
  position: number;
  marketCode: string;
}): React.ReactElement {
  const { t } = useTranslation();
  const headingId = topicHeadingId(topic.id);

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-4 border-t border-border-subtle py-6 first:border-t-0 first:pt-0 last:pb-0 sm:space-y-5 sm:py-7"
      data-topic-position={position}
      data-topic-id={topic.id}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Heading as="h3" size="heading-md" id={headingId}>
              {topic.title}
            </Heading>
            {topic.badge && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary-light px-2.5 py-1 text-micro font-bold text-primary">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                {topic.badge}
              </span>
            )}
          </div>
          {topic.subtitle && (
            <p className="mt-1 text-xs font-medium text-stone-500 sm:text-sm">
              {topic.subtitle}
            </p>
          )}
        </div>
        <Link
          to={topic.href}
          aria-label={`${t("home.trendingNow.voirTout")} — ${topic.title}`}
          onClick={() =>
            analyticsService.track("trending_topic_click", {
              market: marketCode,
              topic: topic.id,
              topicType: topic.type,
              position,
              source: "trending_now",
            })
          }
          className="inline-flex min-h-control-sm shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
        >
          {t("home.trendingNow.voirTout")}
          <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
        </Link>
      </div>

      <ListingRail label={`${topic.title} — ${t("home.trendingNow.annonces")}`}>
        {topic.listings
          .slice(0, TOPIC_LISTINGS)
          .map((listing, listingPosition) => (
            <div
              key={listing.id}
              onClick={() =>
                analyticsService.track("trending_listing_click", {
                  market: marketCode,
                  topic: topic.id,
                  topicType: topic.type,
                  listingId: listing.id,
                  position: listingPosition,
                  source: "trending_now",
                })
              }
            >
              <ListingCard listing={listing} variant="grid" />
            </div>
          ))}
      </ListingRail>
    </section>
  );
}

function trackTrendingListingImpressions(
  topics: TrendingTopic[],
  marketCode: string,
): void {
  topics.forEach((topic) => {
    topic.listings
      .slice(0, TOPIC_LISTINGS)
      .forEach((listing, listingPosition) => {
        analyticsService.track("trending_listing_impression", {
          market: marketCode,
          topic: topic.id,
          topicType: topic.type,
          listingId: listing.id,
          position: listingPosition,
          source: "trending_now",
        });
      });
  });
}

export const TrendingNowSection: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, location } = useMarketLocation();
  const { currentUser } = useAuth();

  const city = topicQueryCity(location.city);
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "trending-now",
      activeMarket.code,
      city,
      location.region,
      currentUser?.id || "guest",
    ],
    queryFn: () =>
      services.trending.getTrending({
        marketCode: activeMarket.code,
        city,
        region: location.region,
        userId: currentUser?.id,
      }),
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    if (!data?.topics.length) return;
    analyticsService.track("trending_section_view", {
      market: activeMarket.code,
      source: "trending_now",
    });
    data.topics.forEach((topic, position) => {
      analyticsService.track("trending_topic_impression", {
        market: activeMarket.code,
        topic: topic.id,
        topicType: topic.type,
        position,
        source: "trending_now",
      });
    });
    trackTrendingListingImpressions(data.topics, activeMarket.code);
  }, [data, activeMarket.code]);

  if (isLoading) return <TrendingLoading />;
  if (isError || !data?.enabled || data.topics.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden"
      aria-labelledby="trending-now-title"
    >
      <Container>
        <div className="rounded-overlay border border-border-base bg-bg-surface px-4 py-5 shadow-xs sm:px-7 sm:py-7 lg:px-9 lg:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                <Flame className="h-icon-sm w-icon-sm" aria-hidden="true" />
                <span>{t("home.trendingNow.kicker")}</span>
              </div>
              <HomeSectionHeading id="trending-now-title">
                {data.title}
              </HomeSectionHeading>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-500 sm:text-base">
                {data.subtitle}
              </p>
            </div>
            <Link
              to="/recherche?sortBy=relevance"
              onClick={() =>
                analyticsService.track("trending_see_all_click", {
                  market: activeMarket.code,
                  source: "trending_now",
                })
              }
              className="inline-flex min-h-control-sm shrink-0 items-center gap-1.5 self-start rounded-control border border-border-base bg-bg-base px-3 text-xs font-bold text-stone-800 motion-interactive hover:border-primary-border hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto sm:px-4 sm:text-sm"
            >
              {t("home.trendingNow.explorerTout")}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>

          {/* The status line is the live region, not the content. Announcing
              the container meant every render pushed ~2 000 characters of topic
              names, badges and seller lines into the screen-reader queue. */}
          <span className="sr-only" role="status" aria-live="polite">
            {t("home.trendingNow.topicsAnnouncement_other", {
              count: data.topics.length,
            })}
          </span>
          <div className="mt-7 divide-y divide-border-subtle sm:mt-8">
            {data.topics.map((topic, position) => (
              <TrendingTopicSection
                key={topic.id}
                topic={topic}
                position={position}
                marketCode={activeMarket.code}
              />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};
