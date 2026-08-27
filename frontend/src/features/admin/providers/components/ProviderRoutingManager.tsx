import React, { useState, useMemo } from "react";
import { Select } from "../../../../design-system";
import { Link } from "react-router-dom";
import { Sliders, ShieldCheck } from "lucide-react";
import { getAllCapabilities } from "../../../../domains/providers/provider-capabilities";
import { providerService } from "../../../../domains/providers/provider.service";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";
import { ProviderCapabilityLabel } from "./ProviderCapabilityLabel";

export const ProviderRoutingManager: React.FC = () => {
  const { t } = useTranslation();
  const { activeMarket, availableMarkets } = useMarketLocation();
  const [selectedMarket, setSelectedMarket] = useState<string>(
    activeMarket.code,
  );

  const capabilitiesWithMultipleProviders = useMemo(() => {
    return getAllCapabilities().map((cap) => {
      const resolution = providerService.resolveEffectiveProviders(
        cap.id,
        selectedMarket,
      );

      return {
        capability: cap,
        primary: resolution.primaryProvider,
        fallback: resolution.fallbackProvider,
        automaticFailoverApproved: resolution.fallbackActivationApproved,
      };
    });
  }, [selectedMarket]);

  return (
    <div className="space-y-4">
      {/* Header bar with market selector */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Sliders className="w-icon-md h-icon-md text-primary" />
            {t(
              "admin.providerRoutingManager.gestionnaireDeRoutagePrioritesSecours",
            )}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Seuls les adaptateurs compatibles, configurés et vérifiés peuvent
            devenir primaire ou secours.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="provider-routing-target-market"
            className="text-xs font-semibold text-stone-600"
          >
            {t("admin.providerRoutingManager.marcheCible")}
          </label>
          <Select
            className="w-auto"
            id="provider-routing-target-market"
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
          >
            {availableMarkets.map((market) => (
              <option key={market.code} value={market.code}>
                {market.flag} {market.name}
                {market.isDefault ? " · défaut" : ""}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Capabilities Routing List */}
      <div className="space-y-3">
        {capabilitiesWithMultipleProviders.map(
          ({ capability, primary, fallback, automaticFailoverApproved }) => {
            return (
              <div
                key={capability.id}
                className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Capability description */}
                <div className="max-w-md">
                  <ProviderCapabilityLabel
                    capability={capability.id}
                    showCategory
                    className="text-stone-900"
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    {capability.description}
                  </p>
                </div>

                {/* Routing Chain (Primary -> Fallback) */}
                <div className="flex flex-1 items-center gap-3">
                  {/* Primary Provider Box */}
                  <div
                    className={`flex-1 p-2.5 rounded-lg border ${
                      primary
                        ? "border-success-border bg-success-surface/50"
                        : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <div className="text-micro font-bold uppercase tracking-wider text-stone-600 mb-1 flex items-center justify-between">
                      <span>1. Prestataire Primaire</span>
                      {primary && (
                        <span className="bg-emerald-200/70 text-success px-1 rounded text-micro">
                          P1
                        </span>
                      )}
                    </div>
                    {primary ? (
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/admin/fournisseurs/${primary.id}`}
                          className="font-bold text-xs text-stone-900 hover:text-primary transition-colors"
                        >
                          {primary.name}
                        </Link>
                        <span
                          className="w-2 h-2 rounded-full bg-success"
                          title={t("admin.providerRoutingManager.operationnel")}
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-stone-500 italic">
                        Aucun fournisseur vérifié
                      </span>
                    )}
                  </div>

                  <span className="text-stone-300 font-black">→</span>

                  {/* Fallback Provider Box */}
                  <div
                    className={`flex-1 p-2.5 rounded-lg border ${
                      fallback
                        ? "border-info-border bg-info-surface/50"
                        : "border-stone-200 bg-stone-50/50 border-dashed"
                    }`}
                  >
                    <div className="text-micro font-bold uppercase tracking-wider text-stone-600 mb-1 flex items-center justify-between">
                      <span>2. Secours (Fallback)</span>
                      {fallback && (
                        <span className="bg-blue-200/70 text-info px-1 rounded text-micro">
                          P2
                        </span>
                      )}
                    </div>
                    {fallback ? (
                      <div className="flex items-center justify-between">
                        <Link
                          to={`/admin/fournisseurs/${fallback.id}`}
                          className="font-bold text-xs text-stone-900 hover:text-primary transition-colors"
                        >
                          {fallback.name}
                        </Link>
                        <span
                          className="w-2 h-2 rounded-full bg-info"
                          title={
                            automaticFailoverApproved
                              ? "Bascule automatique explicitement autorisée"
                              : "Secours explicite avec activation manuelle"
                          }
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-stone-500 italic">
                        {t("admin.providerRoutingManager.aucunSecoursDefini")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Pill */}
                <div className="shrink-0 flex items-center gap-2">
                  {fallback ? (
                    <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-1 rounded-full">
                      <ShieldCheck className="w-icon-sm h-icon-sm" />
                      {automaticFailoverApproved
                        ? "Bascule auto approuvée"
                        : "Secours manuel"}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-micro font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                      Aucun secours vérifié
                    </span>
                  )}
                </div>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
};
