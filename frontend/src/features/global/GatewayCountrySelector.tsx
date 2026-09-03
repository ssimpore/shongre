"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Globe2 } from "lucide-react";
import {
  publicMarketExperience,
  type MarketDetectionRecommendation,
  type PublicCountryConfig,
} from "@shongre/contracts";
import {
  marketSelectionPreferenceRepository,
  saveManualMarketSelectionPreference,
} from "../../domains/market/market-selection.preference";
import { marketDetectionController } from "../../domains/market/market-detection.controller";
import { useTranslation } from "../../i18n/I18nProvider";

export interface GatewayCountryLink {
  country: PublicCountryConfig;
  href: string;
}

export function GatewayCountrySelector({
  countries,
}: {
  countries: GatewayCountryLink[];
}) {
  const { t } = useTranslation();
  const [recommendation, setRecommendation] =
    useState<MarketDetectionRecommendation | null>(null);

  useEffect(() => {
    let active = true;
    if (marketSelectionPreferenceRepository.getManualCountry()) {
      return () => {
        active = false;
      };
    }
    void marketDetectionController
      .detectProbableCountry()
      .then((result) => {
        if (active) setRecommendation(result);
      })
      .catch(() => {
        if (active) setRecommendation(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const recommendedEntry = useMemo(
    () =>
      countries.find(
        ({ country }) => country.code === recommendation?.country?.code,
      ),
    [countries, recommendation?.country?.code],
  );

  return (
    <div aria-labelledby="country-list-title">
      {recommendedEntry ? (
        <aside className="mb-5 rounded-card border border-warning-border bg-warning-surface p-4">
          <div className="flex gap-3">
            <Globe2
              className="h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-sm font-bold">
                {t("shell.marketDetection.gatewaySuggestedCountry", {
                  country: recommendedEntry.country.name,
                })}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-700">
                {t("shell.marketDetection.gatewayEstimate")}
                {recommendation?.status === "uncertain"
                  ? ` ${t("shell.marketDetection.lowConfidence")}`
                  : ""}
              </p>
              <a
                href={recommendedEntry.href}
                onClick={() =>
                  saveManualMarketSelectionPreference(
                    recommendedEntry.country.code,
                  )
                }
                className="mt-3 inline-flex min-h-control-touch items-center gap-2 rounded-control bg-primary px-4 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t("shell.marketDetection.gatewayContinue", {
                  country: recommendedEntry.country.name,
                })}
                <ArrowRight
                  className="h-icon-md w-icon-md"
                  aria-hidden="true"
                />
              </a>
            </div>
          </div>
        </aside>
      ) : null}

      <h2 id="country-list-title" className="mb-4 text-lg font-bold">
        {t("shell.marketDetection.gatewayChooseCountry")}
      </h2>
      <ul className="divide-y divide-border-subtle border-y border-border-base">
        {countries.map(({ country, href }) => {
          const available = publicMarketExperience(country) === "active";
          return (
            <li key={country.code}>
              <a
                href={href}
                onClick={() =>
                  saveManualMarketSelectionPreference(country.code)
                }
                className="group flex min-h-16 items-center gap-4 px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={
                  available
                    ? country.name
                    : t("shell.marketDetection.countryOpeningSoon", {
                        country: country.name,
                      })
                }
              >
                <span className="text-2xl" aria-hidden="true">
                  {country.flag}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-stone-950">
                    {country.name}
                  </span>
                  <span className="block truncate text-xs text-stone-600">
                    {country.nativeName} · {country.currency}
                  </span>
                </span>
                {available ? (
                  <ArrowRight
                    className="h-icon-lg w-icon-lg text-primary transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="rounded-control border border-border-base bg-bg-subtle px-2.5 py-1 text-xs font-bold text-stone-700">
                    {publicMarketExperience(country) === "coming_soon"
                      ? t("shell.marketDetection.openingSoon")
                      : t("shell.marketDetection.unavailable")}
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
