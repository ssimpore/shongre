import React, { useEffect, useState } from "react";
import type { MonetizationCatalog } from "@shongre/contracts/monetization";
import { Sparkles, Check, Zap } from "lucide-react";
import { services } from "../../api";
import { Button } from "../../design-system/primitives/Button";
import { Badge } from "../../design-system/primitives/Badge";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

export const ProPlansPage: React.FC = () => {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState<MonetizationCatalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    services.businessRules
      .getCatalog("FR")
      .then((result) => active && setCatalog(result))
      .catch((error) => active && setCatalogError(error instanceof Error ? error.message : "Offres indisponibles"));
    return () => {
      active = false;
    };
  }, []);
  usePageMeta({
    title: "Offres et forfaits professionnels",
    description:
      "Comparez les forfaits professionnels Shongre : quotas d'annonces, vitrine personnalisée, statistiques et options de mise en avant. Sans engagement.",
    canonicalPath: "/solutions-pro",
  });

  const plans = catalog?.products.filter(
    (product) =>
      product.status === "active" &&
      (product.id === "listing.standard.individual" || product.id.startsWith("plan.pro.")),
  ) || [];
  const boosts = catalog?.products.filter(
    (product) => product.status === "active" && product.kind === "premium_option",
  ) || [];
  const formatMinor = (amountMinor: number, currency: string) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountMinor / 100);

  return (
    <div className="space-y-12 pb-16">
      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-light border border-primary-border text-primary text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          Offres & Forfaits Professionnels Shongre
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900 tracking-tight">
          {t("sellerworkspace.proPlansPage.developpezVosVentesAvecNos")}
        </h1>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          {t("sellerworkspace.proPlansPage.sansEngagementActivezVotreVitrine")}
        </p>
      </div>

      {!catalog && !catalogError && (
        <div className="max-w-6xl mx-auto rounded-xl border border-border-base bg-bg-surface p-8 text-center text-sm font-semibold text-stone-600" aria-live="polite">
          Chargement des offres actives…
        </div>
      )}
      {catalogError && (
        <div className="max-w-6xl mx-auto rounded-xl border border-danger-border bg-danger-surface p-4 text-sm font-semibold text-danger" role="alert">
          {catalogError}
        </div>
      )}

      {/* Subscription Plans Grid */}
      {/* Three pricing columns only from `xl`. Each card carries 32px of padding
          a side plus a feature list, so a third of 768px (and still a third of
          1024px, inside the account shell) left the plan name and its quota
          badge fighting over the same line and pushed the page sideways. */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const isPopular = plan.recommended;
          const price = plan.prices.find((entry) => entry.billingPeriod === "month") || plan.prices[0];
          const maxActiveListings = plan.entitlements.find((entry) => entry.key === "maxActiveListings")?.value;
          /* The free tier is the individual account, not a professional one, so
             it signs up through the individual flow. Every card used to point at
             the professional route, which met someone choosing "Particulier"
             with a SIREN and VAT form they have no way to complete. */
          const signupPath =
            plan.audience === "individual"
              ? "/inscription/particulier"
              : "/inscription/professionnel";
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-normal ${
                isPopular
                  ? "border-primary ring-2 ring-primary shadow-xl relative"
                  : "border-border-base shadow-xs hover:border-stone-400"
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
                  {t("sellerworkspace.proPlansPage.lePlusPopulaire")}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2">
                  <h2 className="text-lg font-black text-stone-900">
                    {plan.name}
                  </h2>
                  <Badge variant={isPopular ? "primary" : "neutral"} size="sm">
                    {typeof maxActiveListings === "number" ? maxActiveListings : "—"} annonces
                  </Badge>
                </div>

                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl sm:text-4xl font-black text-stone-900">
                    {formatMinor(price.amount.amountMinor, price.amount.currency)}
                  </span>
                  <span className="text-xs text-stone-500 font-semibold">
                    HT / mois
                  </span>
                </div>

                <p className="text-xs text-stone-500 mb-6">{plan.description}</p>

                <ul className="space-y-3 text-xs text-stone-700 pb-6 border-b border-border-subtle">
                  {plan.entitlements.map((entitlement) => (
                    <li key={entitlement.key} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      <span>{entitlement.label} : {String(entitlement.value)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <Button
                  to={signupPath}
                  variant={isPopular ? "primary" : "outline"}
                  size="lg"
                  fullWidth
                  className="font-bold shadow-xs"
                >
                  Choisir l'offre {plan.name}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visibility Boost Options Grid */}
      <div className="max-w-6xl mx-auto space-y-6 pt-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-stone-900">
            {t("sellerworkspace.proPlansPage.optionsDeMiseEnAvant")}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {t("sellerworkspace.proPlansPage.aActiverSurNImporte")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {boosts.map((opt) => {
            const price = opt.prices[0];
            return (
            <div
              key={opt.id}
              className="bg-white rounded-xl border border-border-base p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="w-9 h-9 rounded-lg bg-primary-light text-primary flex items-center justify-center mb-3">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-stone-900">{opt.name}</h3>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {opt.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  {price.durationDays || 1} jours
                </span>
                <span className="text-sm font-black text-primary">
                  {formatMinor(price.amount.amountMinor, price.amount.currency)}
                </span>
              </div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
};
