import React, { useEffect, useMemo, useState } from "react";
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
import { usePublishCta } from "../../security/usePublishCta";
import { HomepageSectionSlot } from "./homepageSection.registry";

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
  const publishCta = usePublishCta();
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

  return (
    <div className="space-y-8 pb-16 sm:space-y-12">
      {visibleExperience.sections.map((section) => (
        <HomepageSectionSlot
          key={section.key}
          section={section}
          activeMarket={activeMarket}
          publishCta={publishCta}
          onRetry={() => setAttempt((current) => current + 1)}
        />
      ))}
    </div>
  );
};
