import React from "react";
import { PlusCircle, RefreshCw, ScanSearch } from "lucide-react";
import type { HomepageSectionView } from "../../../domains/homepage/homepage.types";
import type { Market } from "../../../domains/market/market.types";
import {
  Container,
  EmptyState,
  ListingCardSkeleton,
  ListingGrid,
  StatePanel,
} from "../../../design-system";
import { Button } from "../../../design-system/primitives/Button";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import { useTranslation } from "../../../i18n/I18nProvider";
import type { PublishCtaKeys } from "../../../security/usePublishCta";
import { HomeSectionHeading } from "./HomeSectionHeading";
import { HomeSectionAction } from "./HomeSectionAction";

interface HomeRecentListingsSectionProps {
  section: HomepageSectionView;
  activeMarket: Market;
  publishCta: PublishCtaKeys;
  onRetry: () => void;
}

export const HomeRecentListingsSection: React.FC<
  HomeRecentListingsSectionProps
> = ({ section, activeMarket, publishCta, onRetry }) => {
  const { t } = useTranslation();
  return (
    <Container as="section" aria-labelledby="home-recent-listings-title">
      <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
        <div className="min-w-0">
          <HomeSectionHeading id="home-recent-listings-title">
            {section.title}
          </HomeSectionHeading>
          {section.subtitle ? (
            <p className="mt-1 hidden text-sm font-medium text-text-secondary sm:block">
              {section.subtitle}
            </p>
          ) : null}
        </div>
        <HomeSectionAction to="/recherche?sortBy=date_desc">
          {t("home.homePage.toutesLesNouveautes")}
        </HomeSectionAction>
      </div>

      {section.status === "loading" ? (
        <ListingGrid>
          {Array.from({ length: section.maxItems }).map((_, index) => (
            <ListingCardSkeleton key={index} />
          ))}
        </ListingGrid>
      ) : section.status === "error" ? (
        <StatePanel
          variant="offline"
          title={t("common.error")}
          description={t("shell.errorBoundary.applicationARencontreUnProbleme")}
          action={
            <Button
              type="button"
              onClick={onRetry}
              leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
            >
              {t("common.retry")}
            </Button>
          }
        />
      ) : section.status === "empty" ? (
        <EmptyState
          icon={<ScanSearch className="h-8 w-8 text-text-muted" />}
          title={t("home.homepageRecent.emptyTitle", {
            market: activeMarket.name,
          })}
          description={t("home.homePage.ceMarcheVientDOuvrir")}
          action={
            <Button
              to={publishCta.to}
              leftIcon={<PlusCircle className="h-icon-md w-icon-md" />}
            >
              {t(publishCta.labelKey)}
            </Button>
          }
        />
      ) : (
        <ListingRail label={section.title}>
          {section.listings?.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </ListingRail>
      )}
    </Container>
  );
};
