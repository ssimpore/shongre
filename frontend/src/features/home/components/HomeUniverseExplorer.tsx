import React, { useEffect, useMemo, useState } from "react";
import type { TaxonomyV4Node } from "@shongre/contracts";
import { themeColors } from "@shongre/design-tokens";
import { RefreshCw, ScanSearch } from "lucide-react";
import { routes } from "../../../configuration/routes";
import { EmptyState } from "../../../design-system/components/Feedback";
import { Button } from "../../../design-system/primitives/Button";
import { CategoryIcon } from "../../../design-system/primitives/CategoryIcon";
import { Container } from "../../../design-system/primitives/Layout";
import { ListingCard } from "../../../design-system/primitives/ListingCard";
import { ListingRail } from "../../../design-system/primitives/ListingRail";
import { StatePanel } from "../../../design-system/primitives/StatePanel";
import { homepageVisibilityClass } from "../../../domains/homepage/homepage.presentation";
import type {
  HomepageSectionView,
  HomepageUniverseGroup,
} from "../../../domains/homepage/homepage.types";
import { services } from "../../../api/client/service-registry";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { localizedTaxonomyLabel } from "../../../domains/publication/publication.onboarding";
import { useTranslation } from "../../../i18n/I18nProvider";
import { HomeSectionAction } from "./HomeSectionAction";
import { HomeSectionHeading } from "./HomeSectionHeading";

export interface ResolvedUniverseGroup extends HomepageUniverseGroup {
  root: TaxonomyV4Node;
}

export const resolveUniverseGroups = (
  section: HomepageSectionView,
  taxonomyNodes: ReadonlyMap<string, TaxonomyV4Node>,
): ResolvedUniverseGroup[] =>
  (section.universeGroups || []).flatMap((group) => {
    const root = taxonomyNodes.get(group.categoryId);
    return root ? [{ ...group, root }] : [];
  });

const UniverseRail: React.FC<{ group: ResolvedUniverseGroup }> = ({
  group,
}) => {
  const { locale, t } = useTranslation();
  const groupLabel = localizedTaxonomyLabel(group.root.labels, locale);
  const headingId = `home-universe-${group.root.slug}-title`;
  const railLabel = t("home.homeUniverseExplorer.railLabel", {
    category: groupLabel,
  });

  return (
    <section
      aria-labelledby={headingId}
      data-home-universe-group={group.categoryId}
      className={`[contain-intrinsic-size:auto_28rem] [content-visibility:auto] ${homepageVisibilityClass(group)}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <CategoryIcon
            category={group.root.slug}
            iconName={group.root.iconName}
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

      {group.listings.length === 0 ? (
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

export const HomeUniverseExplorer: React.FC<{
  section: HomepageSectionView;
  onRetry: () => void;
}> = ({ section, onRetry }) => {
  const { locale, t } = useTranslation();
  const { marketContext } = useMarketLocation();
  const [taxonomyNodes, setTaxonomyNodes] = useState<
    ReadonlyMap<string, TaxonomyV4Node>
  >(new Map());
  const [taxonomyState, setTaxonomyState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [taxonomyRetryKey, setTaxonomyRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    if (!marketContext || marketContext.kind !== "market") {
      setTaxonomyNodes(new Map());
      setTaxonomyState("error");
      return () => {
        active = false;
      };
    }
    setTaxonomyState("loading");
    void services.taxonomy
      .getV4Tree({
        marketContext,
        locale,
        taxonomyVersion: "4.0.0",
      })
      .then((response) => {
        if (!active) return;
        setTaxonomyNodes(
          new Map(response.items.map((node) => [node.id, node])),
        );
        setTaxonomyState("ready");
      })
      .catch(() => {
        if (!active) return;
        setTaxonomyNodes(new Map());
        setTaxonomyState("error");
      });
    return () => {
      active = false;
    };
  }, [locale, marketContext, taxonomyRetryKey]);

  const groups = useMemo(
    () => resolveUniverseGroups(section, taxonomyNodes),
    [section.universeGroups, taxonomyNodes],
  );

  if (section.status === "error") {
    return (
      <Container
        as="section"
        aria-labelledby="home-universe-explorer-title"
        className={homepageVisibilityClass(section)}
      >
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
      </Container>
    );
  }
  if (taxonomyState === "error") {
    return (
      <Container
        as="section"
        aria-labelledby="home-universe-explorer-title"
        className={homepageVisibilityClass(section)}
      >
        <StatePanel
          variant="offline"
          title={t("common.error")}
          description={t(
            "categories.categoriesPage.catalogueIndisponibleDescription",
          )}
          action={
            <Button
              type="button"
              size="sm"
              onClick={() => setTaxonomyRetryKey((value) => value + 1)}
              leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
            >
              {t("common.retry")}
            </Button>
          }
        />
      </Container>
    );
  }
  if (taxonomyState === "loading") return null;
  if (!groups.length) return null;

  return (
    <Container
      as="section"
      aria-labelledby="home-universe-explorer-title"
      data-testid="home-universe-explorer"
      className={homepageVisibilityClass(section)}
    >
      <div className="mb-6 sm:mb-8">
        <span
          className="mb-3 block h-0.5 w-14 rounded-pill bg-primary"
          aria-hidden="true"
        />
        <HomeSectionHeading id="home-universe-explorer-title">
          {section.title}
        </HomeSectionHeading>
        {section.subtitle ? (
          <p className="mt-1 text-sm font-medium text-text-secondary sm:text-base">
            {section.subtitle}
          </p>
        ) : null}
      </div>

      <div className="space-y-7 sm:space-y-9">
        {groups.map((group) => (
          <UniverseRail key={group.categoryId} group={group} />
        ))}
      </div>
    </Container>
  );
};
