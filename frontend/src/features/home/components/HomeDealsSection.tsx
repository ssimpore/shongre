import React from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
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
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionHeading } from "./HomeSectionHeading";
import {
  trackHomepageEvent,
  useHomepageViewEvent,
} from "../useHomepageAnalytics";

interface HomeDealsSectionProps {
  section: HomepageSectionView;
  marketCode: string;
  onRetry: () => void;
  preview?: boolean;
}

export const HomeDealsSection: React.FC<HomeDealsSectionProps> = ({
  section,
  marketCode,
  onRetry,
  preview = false,
}) => {
  const { t } = useTranslation();
  const sectionRef = useHomepageViewEvent("homepage_deals_view", {
    market: marketCode,
    sectionKey: section.key,
  });
  if (
    section.status === "empty" &&
    !preview &&
    !section.settings.previewEmptyState
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="home-deals-title"
      data-testid="home-deals"
    >
      <Container>
      <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <HomeSectionHeading id="home-deals-title">
            {section.title}
          </HomeSectionHeading>
          {section.subtitle ? (
            <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
              {section.subtitle}
            </p>
          ) : null}
        </div>
        <Button
          to="/bons-plans"
          variant="secondary"
          size="sm"
          onClick={() =>
            trackHomepageEvent("homepage_deals_view_all_click", {
              market: marketCode,
              sectionKey: section.key,
            })
          }
          rightIcon={<ArrowRight className="h-icon-sm w-icon-sm" />}
          className="shrink-0"
        >
          <span className="hidden sm:inline">
            {t("home.homepageDeals.viewAll")}
          </span>
          <span className="sm:hidden">{t("home.homePage.voirTout")}</span>
        </Button>
      </div>

      {section.status === "loading" ? (
        <ListingRail label={section.title}>
          {Array.from({ length: section.maxItems }).map((_, index) => (
            <ListingCardSkeleton key={index} />
          ))}
        </ListingRail>
      ) : section.status === "error" ? (
        <StatePanel
          variant="offline"
          title={t("home.homepageDeals.errorTitle")}
          description={t("home.homepageDeals.errorDescription")}
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
      ) : section.status === "empty" ? (
        <EmptyState
          title={t("home.homepageDeals.emptyTitle")}
          description={t("home.homepageDeals.emptyDescription")}
          action={null}
        />
      ) : (
        <div
          onClickCapture={(event) => {
            const link = (event.target as Element).closest<HTMLAnchorElement>(
              'a[href^="/annonce/"]',
            );
            if (!link) return;
            const listingId = link.getAttribute("href")?.split("/").at(-1);
            const position = section.deals?.findIndex(
              (item) => item.listing.id === listingId,
            );
            const offerType = section.deals?.find(
              (item) => item.listing.id === listingId,
            )?.offer.type;
            trackHomepageEvent("homepage_deal_click", {
              market: marketCode,
              sectionKey: section.key,
              offerType,
              position,
            });
          }}
        >
          <ListingRail label={section.title}>
            {section.deals?.map(({ listing, offer }) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                pricing={{
                  currentPrice: offer.currentPrice,
                  originalPrice: offer.originalPrice,
                }}
              />
            ))}
          </ListingRail>
        </div>
      )}
      </Container>
    </section>
  );
};
