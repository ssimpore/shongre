import React, {
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createDefaultHomepageConfiguration,
  resolveHomepageConfiguration,
} from "@shongre/contracts/homepage";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import type {
  HomepageExperience,
  HomepageSectionView,
} from "../../domains/homepage/homepage.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";
import { HomeHeroSection } from "./components/HomeHeroSection";
import { HomeRecentSearches } from "./components/HomeRecentSearches";

const HomeBelowFold = lazy(() =>
  import("./components/HomeBelowFold").then((module) => ({
    default: module.HomeBelowFold,
  })),
);

const DeferredHomeContent: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || isVisible) return;
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <div ref={anchorRef} data-testid="home-deferred-content">
      {isVisible ? (
        children
      ) : (
        <div className="mx-auto min-h-64 max-w-page px-4" aria-hidden="true" />
      )}
    </div>
  );
};

const contentSection = (type: HomepageSectionView["type"]) =>
  type === "trending" || type === "deals" || type === "recent_listings";

function fallbackExperience(input: {
  marketCode: string;
  locale: string;
  failed: boolean;
}): HomepageExperience {
  const timestamp = "2026-01-01T00:00:00.000Z";
  const resolved = resolveHomepageConfiguration(
    createDefaultHomepageConfiguration({
      marketCode: input.marketCode,
      locale: input.locale,
      now: timestamp,
    }),
    new Date(timestamp),
  );
  return {
    ...resolved,
    sections: resolved.sections.map((section) => ({
      ...section,
      status: contentSection(section.type)
        ? input.failed
          ? "error"
          : "loading"
        : "ready",
      errorCode:
        input.failed && section.type === "trending"
          ? "TRENDING_UNAVAILABLE"
          : input.failed && section.type === "deals"
            ? "DEALS_UNAVAILABLE"
            : input.failed && section.type === "recent_listings"
              ? "LISTINGS_UNAVAILABLE"
              : undefined,
    })),
  };
}

export const HomePage: React.FC = () => {
  const { activeMarket, currentLocale, location, marketContext } =
    useMarketLocation();
  const [experience, setExperience] = useState<HomepageExperience | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const pageMeta = useMemo(() => {
    if (!marketContext) return { noIndex: true, follow: true };
    const routeData = { status: "not_applicable", data: null } as const;
    const policy = resolveSeoPolicy({
      pathname: "/",
      marketContext,
      routeData,
    });
    return pageMetaForPolicy(
      policy,
      structuredDataForPolicy(policy, marketContext, routeData),
    );
  }, [marketContext]);
  usePageMeta(pageMeta);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void services.homepage
      .getHomepage({
        marketCode: activeMarket.code,
        locale: currentLocale,
        country: activeMarket.code,
        region: location.region,
        city: location.city,
      })
      .then((next) => {
        if (!cancelled) setExperience(next);
      })
      .catch(() => {
        if (!cancelled) {
          setExperience(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    activeMarket.code,
    currentLocale,
    location.city,
    location.region,
    attempt,
  ]);

  const visibleExperience =
    experience?.marketCode === activeMarket.code &&
    experience.locale === currentLocale
      ? experience
      : fallbackExperience({
          marketCode: activeMarket.code,
          locale: currentLocale,
          failed,
        });
  const hero = visibleExperience.sections.find(
    (section) => section.type === "hero",
  );
  const recentSearches = visibleExperience.sections.find(
    (section) => section.type === "recent_searches",
  );

  return (
    <div className="space-y-8 pb-16 sm:space-y-12">
      {hero ? <HomeHeroSection section={hero} /> : null}
      {recentSearches ? (
        <HomeRecentSearches
          title={recentSearches.title}
          maxItems={recentSearches.maxItems}
        />
      ) : null}
      <DeferredHomeContent>
        <Suspense
          fallback={<div className="mx-auto min-h-64 max-w-page px-4" />}
        >
          <HomeBelowFold
            sections={visibleExperience.sections}
            onRetry={() => setAttempt((current) => current + 1)}
          />
        </Suspense>
      </DeferredHomeContent>
    </div>
  );
};
