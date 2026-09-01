import React from "react";
import { Globe2, LoaderCircle, X } from "lucide-react";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { useMarketLocation } from "../providers/MarketLocationProvider";

export const MarketRecommendationBanner: React.FC = () => {
  const { t } = useTranslation();
  const {
    marketRecommendation,
    marketDetectionIssue,
    isDetectingMarket,
    retryMarketDetection,
    acceptMarketRecommendation,
    dismissMarketRecommendation,
    openPreferencesModal,
  } = useMarketLocation();
  const country = marketRecommendation?.country;
  if (!country && !marketDetectionIssue) return null;

  const uncertain =
    marketRecommendation?.status === "uncertain" ||
    marketRecommendation?.confidence === "low";

  return (
    <section
      aria-labelledby="market-recommendation-title"
      aria-live="polite"
      className="border-b border-warning-border bg-warning-surface"
    >
      <div className="mx-auto flex w-full max-w-page flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <Globe2 className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2
            id="market-recommendation-title"
            className="text-sm font-black text-stone-950"
          >
            {country
              ? t("shell.marketDetection.recommendationTitle", {
                  country: country.name,
                })
              : marketDetectionIssue === "error"
                ? t("shell.marketDetection.failureTitle")
                : t("shell.marketDetection.unknownTitle")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-stone-700">
            {country
              ? t("shell.marketDetection.recommendationBody")
              : t("shell.marketDetection.selectCountryBody")}
            {country && uncertain
              ? ` ${t("shell.marketDetection.lowConfidence")}`
              : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {country ? (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={acceptMarketRecommendation}
              >
                {t("shell.marketDetection.viewCountry", {
                  country: country.name,
                })}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={openPreferencesModal}
              >
                {t("shell.marketDetection.chooseAnother")}
              </Button>
              <button
                type="button"
                onClick={dismissMarketRecommendation}
                className="inline-flex min-h-control-touch items-center gap-1.5 rounded-control px-2 text-xs font-bold text-stone-700 hover:bg-bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-icon-sm w-icon-sm" aria-hidden="true" />
                {t("shell.marketDetection.ignore")}
              </button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="primary"
                onClick={openPreferencesModal}
              >
                {t("shell.marketDetection.chooseCountry")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={retryMarketDetection}
                disabled={isDetectingMarket}
              >
                {isDetectingMarket ? (
                  <LoaderCircle
                    className="h-icon-sm w-icon-sm motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : null}
                {isDetectingMarket ? t("common.loading") : t("common.retry")}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
