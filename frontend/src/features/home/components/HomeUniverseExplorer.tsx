import React from "react";
import { themeColors } from "@shongre/design-tokens";
import { RefreshCw, ScanSearch } from "lucide-react";
import { routes } from "../../../configuration/routes";
import { EmptyState } from "../../../design-system/components/Feedback";
import { ListingCardSkeleton } from "../../../design-system/components/Skeleton";
import { Button } from "../../../design-system/primitives/Button";
import { CategoryIcon } from "../../../design-system/primitives/CategoryIcon";
import { Container } from "../../../design-system/primitives/Layout";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import { StatePanel } from "../../../design-system/primitives/StatePanel";
import { taxonomyService } from "../../../domains/taxonomy/taxonomy.service";
import { useTranslation } from "../../../i18n/I18nProvider";
import type { HomeUniverseListingGroup } from "../useHomeUniverseListings";
import { HomeSectionAction } from "./HomeSectionAction";
import { HomeSectionHeading } from "./HomeSectionHeading";

interface UniverseRailProps {
  group: HomeUniverseListingGroup;
  onRetry: () => void;
}

const UniverseRail: React.FC<UniverseRailProps> = ({ group, onRetry }) => {
  const { locale, t } = useTranslation();
  const groupLabel = taxonomyService.getLabel(group.root, { locale });
  const headingId = `home-universe-${group.root.slug}-title`;
  const railLabel = t("home.homeUniverseExplorer.railLabel", {
    category: groupLabel,
  });

  return (
    <section
      aria-labelledby={headingId}
      data-home-universe-group={group.root.slug}
      className="[contain-intrinsic-size:auto_28rem] [content-visibility:auto]"
    >
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon
            category={group.root}
            color={themeColors.primary}
            size="md"
            withBackground
          />
          <h3
            id={headingId}
            className="truncate text-lg font-bold tracking-tight text-text-main sm:text-xl"
          >
            {groupLabel}
          </h3>
        </div>
        <HomeSectionAction to={routes.category(group.root.slug)}>
          {t("home.homeUniverseExplorer.seeAll")}
        </HomeSectionAction>
      </div>

      {group.status === "loading" ? (
        <ListingRail label={railLabel}>
          {Array.from({ length: 6 }, (_, index) => (
            <ListingCardSkeleton
              key={index}
              className="listing-card-showcase-skeleton"
            />
          ))}
        </ListingRail>
      ) : group.status === "error" ? (
        <div className="min-h-listing-card-showcase-height">
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
        </div>
      ) : group.status === "empty" ? (
        <div className="min-h-listing-card-showcase-height">
          <EmptyState
            icon={<ScanSearch className="h-8 w-8 text-text-muted" />}
            title={t("home.homeUniverseExplorer.emptyTitle")}
            description={t("home.homeUniverseExplorer.emptyDescription")}
            action={null}
          />
        </div>
      ) : (
        <ListingRail label={railLabel}>
          {group.listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              variant="showcase"
            />
          ))}
        </ListingRail>
      )}
    </section>
  );
};

export const HomeUniverseExplorerContent: React.FC<{
  groups: HomeUniverseListingGroup[];
  onRetry: () => void;
}> = ({ groups, onRetry }) => {
  const { t } = useTranslation();

  if (!groups.length) return null;

  return (
    <Container
      as="section"
      aria-labelledby="home-universe-explorer-title"
      data-testid="home-universe-explorer"
    >
      <div className="mb-6 sm:mb-8">
        <span
          className="mb-3 block h-0.5 w-14 rounded-pill bg-primary"
          aria-hidden="true"
        />
        <HomeSectionHeading id="home-universe-explorer-title">
          {t("home.homeUniverseExplorer.title")}
        </HomeSectionHeading>
        <p className="mt-1 text-sm font-medium text-text-secondary sm:text-base">
          {t("home.homeUniverseExplorer.subtitle")}
        </p>
      </div>

      <div className="space-y-7 sm:space-y-9">
        {groups.map((group) => (
          <UniverseRail key={group.root.id} group={group} onRetry={onRetry} />
        ))}
      </div>
    </Container>
  );
};
