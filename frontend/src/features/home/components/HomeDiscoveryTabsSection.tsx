import React, { useMemo, useState } from "react";
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

interface DiscoveryTab {
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

export const HomeDiscoveryTabsSection: React.FC<{
  sections: HomepageSectionView[];
  onRetry: () => void;
}> = ({ sections, onRetry }) => {
  const { t } = useTranslation();
  const tabs = useMemo<DiscoveryTab[]>(
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
  const [selectedType, setSelectedType] = useState<DiscoveryType>(
    tabs[0]?.type ?? "trending",
  );
  const active = tabs.find((tab) => tab.type === selectedType) ?? tabs[0];

  if (!active) return null;

  return (
    <Container
      as="section"
      aria-labelledby="home-discovery-title"
      data-testid="home-discovery"
      className="[contain-intrinsic-size:auto_32rem] [content-visibility:auto]"
    >
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <HomeSectionHeading id="home-discovery-title">
            {active.section.title}
          </HomeSectionHeading>
          <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
            {active.section.subtitle}
          </p>
        </div>
        <HomeSectionAction to={destinationFor(active.type)}>
          {t("common.seeAll")}
        </HomeSectionAction>
      </div>

      <div
        role="tablist"
        aria-label={t("home.discovery.tabsLabel")}
        className="mb-5 flex gap-1 overflow-x-auto rounded-control border border-border-subtle bg-bg-subtle p-1 shadow-2xs"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            return;
          }
          const buttons = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[role="tab"]',
            ),
          );
          if (!buttons.length) return;
          event.preventDefault();
          const currentIndex = Math.max(
            buttons.indexOf(document.activeElement as HTMLButtonElement),
            0,
          );
          const nextIndex =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : event.key === "ArrowRight"
                  ? (currentIndex + 1) % buttons.length
                  : (currentIndex - 1 + buttons.length) % buttons.length;
          const nextTab = tabs[nextIndex];
          if (nextTab) setSelectedType(nextTab.type);
          buttons[nextIndex]?.focus();
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.type === active.type;
          return (
            <button
              key={tab.type}
              id={`home-discovery-tab-${tab.type}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="home-discovery-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setSelectedType(tab.type)}
              className={`min-h-control-md shrink-0 rounded-control px-3 text-sm font-bold motion-interactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                selected
                  ? "bg-bg-surface text-primary shadow-sm"
                  : "text-text-secondary hover:bg-bg-surface hover:text-text-primary"
              }`}
            >
              {tab.section.title}
            </button>
          );
        })}
      </div>

      <div
        id="home-discovery-panel"
        role="tabpanel"
        aria-labelledby={`home-discovery-tab-${active.type}`}
      >
        {active.section.status === "loading" ? (
          <ListingRail label={t("common.loading")}>
            {Array.from({ length: 6 }).map((_, index) => (
              <ListingCardSkeleton key={index} />
            ))}
          </ListingRail>
        ) : active.section.status === "error" ? (
          <StatePanel
            variant="offline"
            title={t("common.error")}
            description={t(
              "shell.errorBoundary.applicationARencontreUnProbleme",
            )}
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
        ) : active.listings.length === 0 ? (
          <EmptyState
            icon={<ScanSearch className="h-8 w-8 text-text-muted" />}
            title={t("home.homepageTrending.emptyTitle")}
            description={t("home.homepageTrending.emptyDescription")}
            action={null}
          />
        ) : (
          <ListingRail label={active.section.title}>
            {active.listings.map((listing) => {
              const deal =
                active.type === "deals"
                  ? active.section.deals?.find(
                      (item) => item.listing.id === listing.id,
                    )
                  : undefined;
              return (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  pricing={
                    deal
                      ? {
                          currentPrice: deal.offer.currentPrice,
                          originalPrice: deal.offer.originalPrice,
                        }
                      : undefined
                  }
                />
              );
            })}
          </ListingRail>
        )}
      </div>
    </Container>
  );
};
