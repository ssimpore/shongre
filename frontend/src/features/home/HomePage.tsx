import React, { Suspense, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { usePublicRouteData } from "../../app/providers/PublicRouteDataProvider";
import type { HomepageExperience } from "../../domains/homepage/homepage.types";
import { usePageMeta } from "../../hooks/usePageMeta";
import {
  pageMetaForPolicy,
  resolveSeoPolicy,
  structuredDataForPolicy,
} from "../../platform/seo/seo-policy";
import { getPublicRuntimeConfig } from "../../platform/runtime-config/public-runtime-config";
import { socialProfilesFromExternalLinks } from "../../platform/seo/discovery-structured-data";
import { HomeHeroSection } from "./components/HomeHeroSection";
import { Button, Container, StatePanel } from "../../design-system";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";

// `next/dynamic` so the document preloads the chunk the server rendered with;
// see the note on the listing page's sections for the shift it avoids.
const HomeBelowFold = dynamic(() =>
  import("./components/HomeBelowFold").then((module) => ({
    default: module.HomeBelowFold,
  })),
);

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, currentLocale, location, marketContext } =
    useMarketLocation();
  const publicRouteData = usePublicRouteData();
  const serverHomepage =
    publicRouteData?.kind === "homepage" ? publicRouteData : null;
  const [experience, setExperience] = useState<HomepageExperience | null>(
    serverHomepage?.experience ?? null,
  );
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
      structuredDataForPolicy(policy, marketContext, routeData, {
        socialProfiles: socialProfilesFromExternalLinks(
          getPublicRuntimeConfig().externalLinks,
        ),
      }),
    );
  }, [marketContext]);
  usePageMeta(pageMeta);

  useEffect(() => {
    const wholeMarketLocation =
      location.postalCode === "" &&
      location.radiusKm === 0 &&
      location.city === `Toute la ${activeMarket.name}`;
    /* The document already carries this exact answer: the server resolved the
       market-wide experience for this market and locale, and nothing narrows
       it until the reader chooses a city, another market or a retry. */
    if (
      attempt === 0 &&
      wholeMarketLocation &&
      !location.region &&
      serverHomepage?.experience.marketCode === activeMarket.code &&
      serverHomepage.experience.locale === currentLocale
    ) {
      return;
    }
    let cancelled = false;
    setExperience(null);
    setFailed(false);
    void services.homepage
      .getHomepage({
        marketCode: activeMarket.code,
        locale: currentLocale,
        country: activeMarket.code,
        region: location.region,
        city: wholeMarketLocation ? undefined : location.city,
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
    activeMarket.name,
    currentLocale,
    location.city,
    location.postalCode,
    location.radiusKm,
    location.region,
    attempt,
    serverHomepage,
  ]);

  const visibleExperience =
    experience?.marketCode === activeMarket.code &&
    experience.locale === currentLocale
      ? experience
      : null;
  if (!visibleExperience) {
    return (
      <Container width="results" className="py-12 sm:py-20">
        {failed ? (
          <StatePanel
            variant="offline"
            title={t("home.homePage.configurationUnavailableTitle")}
            description={t("home.homePage.configurationUnavailableDescription")}
            action={
              <Button
                type="button"
                size="sm"
                onClick={() => setAttempt((current) => current + 1)}
                leftIcon={<RefreshCw className="h-icon-md w-icon-md" />}
              >
                {t("common.retry")}
              </Button>
            }
          />
        ) : (
          <div
            className="min-h-96 animate-pulse rounded-listing-card border border-border-base bg-bg-subtle"
            role="status"
            aria-label={t("home.homePage.loadingConfiguration")}
          />
        )}
      </Container>
    );
  }
  return (
    <div className="space-y-8 pb-16 sm:space-y-12">
      {visibleExperience.sections.map((section) => {
        if (section.type === "hero") {
          return (
            <HomeHeroSection
              key={section.key}
              section={section}
              heroListings={
                visibleExperience === serverHomepage?.experience
                  ? serverHomepage.heroListings
                  : undefined
              }
            />
          );
        }
        return (
          <Suspense
            key={section.key}
            fallback={<Container width="results" className="min-h-64" />}
          >
            <HomeBelowFold
              sections={[section]}
              onRetry={() => setAttempt((current) => current + 1)}
            />
          </Suspense>
        );
      })}
    </div>
  );
};
