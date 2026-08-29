import React from "react";
import type { HomepageSectionType } from "@shongre/contracts/homepage";
import type { HomepageSectionView } from "../../domains/homepage/homepage.types";
import type { Market } from "../../domains/market/market.types";
import type { PublishCtaKeys } from "../../security/usePublishCta";
import { HomeCollectionExplorer } from "./components/HomeCollectionExplorer";
import { HomeDealsSection } from "./components/HomeDealsSection";
import { HomeHeroSection } from "./components/HomeHeroSection";
import { HomeProCtaSection } from "./components/HomeProCtaSection";
import { HomeRecentListingsSection } from "./components/HomeRecentListingsSection";
import { HomeRecentSearches } from "./components/HomeRecentSearches";
import { HomeTrendingSection } from "./components/HomeTrendingSection";
import {
  trackHomepageEvent,
  useHomepageViewEvent,
} from "./useHomepageAnalytics";

interface HomepageSectionRendererProps {
  section: HomepageSectionView;
  activeMarket: Market;
  publishCta: PublishCtaKeys;
  onRetry: () => void;
  preview?: boolean;
}

type HomepageSectionRenderer = React.FC<HomepageSectionRendererProps>;

const HeroRenderer: HomepageSectionRenderer = ({ section }) => (
  <HomeHeroSection section={section} />
);
const RecentSearchesRenderer: HomepageSectionRenderer = ({ section }) => (
  <HomeRecentSearches title={section.title} maxItems={section.maxItems} />
);
const TrendingRenderer: HomepageSectionRenderer = ({
  section,
  activeMarket,
  onRetry,
}) => (
  <HomeTrendingSection
    section={section}
    marketCode={activeMarket.code}
    onRetry={onRetry}
  />
);
const DealsRenderer: HomepageSectionRenderer = ({
  section,
  activeMarket,
  onRetry,
  preview,
}) => (
  <HomeDealsSection
    section={section}
    marketCode={activeMarket.code}
    onRetry={onRetry}
    preview={preview}
  />
);
const RecentListingsRenderer: HomepageSectionRenderer = ({
  section,
  activeMarket,
  publishCta,
  onRetry,
}) => (
  <HomeRecentListingsSection
    section={section}
    activeMarket={activeMarket}
    publishCta={publishCta}
    onRetry={onRetry}
  />
);
const CollectionsRenderer: HomepageSectionRenderer = ({ section }) => (
  <HomeCollectionExplorer
    title={section.title}
    subtitle={section.subtitle}
    maxItems={section.maxItems}
  />
);
const ProCtaRenderer: HomepageSectionRenderer = ({ section }) => (
  <HomeProCtaSection section={section} />
);

export const HOMEPAGE_SECTION_REGISTRY: Readonly<
  Record<HomepageSectionType, HomepageSectionRenderer>
> = {
  hero: HeroRenderer,
  recent_searches: RecentSearchesRenderer,
  trending: TrendingRenderer,
  deals: DealsRenderer,
  recent_listings: RecentListingsRenderer,
  collections: CollectionsRenderer,
  pro_cta: ProCtaRenderer,
};

export const HomepageSectionSlot: React.FC<HomepageSectionRendererProps> = (
  props,
) => {
  const { section, activeMarket } = props;
  const ref = useHomepageViewEvent("homepage_section_view", {
    market: activeMarket.code,
    sectionKey: section.key,
  });
  const Renderer = HOMEPAGE_SECTION_REGISTRY[section.type];
  const visibilityClass =
    section.mobileVisible && section.desktopVisible
      ? ""
      : section.mobileVisible
        ? "lg:hidden"
        : "hidden lg:block";

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={visibilityClass}
      data-homepage-section={section.key}
      onClickCapture={(event) => {
        if (!(event.target as Element).closest("a, button")) return;
        trackHomepageEvent("homepage_section_click", {
          market: activeMarket.code,
          sectionKey: section.key,
        });
      }}
    >
      <Renderer {...props} />
    </div>
  );
};
