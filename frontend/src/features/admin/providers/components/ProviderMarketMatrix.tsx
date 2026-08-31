import React, { useState, useMemo } from "react";
import { Select } from "../../../../design-system";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { ProviderCategory } from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { PROVIDER_CATEGORIES } from "../../../../domains/providers/provider-capabilities";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";
import { ProviderCapabilityLabel } from "./ProviderCapabilityLabel";

interface ProviderMarketMatrixProps {
  onSelectProvider?: (providerId: string) => void;
}

export const ProviderMarketMatrix: React.FC<ProviderMarketMatrixProps> = () => {
  const { t } = useTranslation();
  const { availableMarkets } = useMarketLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const marketCodes = availableMarkets.map((market) => market.code);
  const marketLabels = Object.fromEntries(
    availableMarkets.map((market) => [market.code, market]),
  );
  const defaultMarketCode =
    availableMarkets.find((market) => market.isDefault)?.code ||
    availableMarkets[0]?.code;

  const matrixRows = useMemo(() => {
    const cat =
      selectedCategory === "ALL"
        ? undefined
        : (selectedCategory as ProviderCategory);
    return providerService.getMarketCoverageMatrix(marketCodes, cat);
  }, [marketCodes.join(","), selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Header card with explicit-assignment explanation */}
      <div className="bg-bg-surface p-4 rounded-control border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
            <Globe className="w-icon-md h-icon-md text-info" />
            {t("admin.providerMarketMatrix.matriceDeCouvertureMultiMarches")}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {t(
              "admin.providerMarketMatrix.chaqueCelluleResulteDUneAffectationPropreAuMarcheUne",
            )}
          </p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Select
            className="w-auto"
            aria-label={t("ui.globalSearchBar.filtrerParCategorie")}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">
              {t("admin.providerMarketMatrix.tousLesDomaines")}
              {matrixRows.length})
            </option>
            {Object.values(PROVIDER_CATEGORIES).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.shortLabel}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary bg-stone-50/80 p-3 rounded-lg border border-stone-200">
        <span className="font-semibold text-stone-700">
          {t("admin.providerMarketMatrix.legende")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-pill bg-success" />
          <span>{t("admin.providerMarketMatrix.preuveLiveVerifiee")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-pill bg-stone-400" />
          <span>{t("admin.providerMarketMatrix.affectationNonVerifiee")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-pill bg-info" />
          <span>{t("admin.providerMarketMatrix.simulationDemo")}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-pill bg-danger" />
          <span>{t("admin.providerMarketMatrix.desactiveIndisponible")}</span>
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-bg-surface rounded-control border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 border-collapse">
            <thead className="bg-stone-50 text-text-secondary font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th scope="col" className="py-3 px-4 min-w-55">
                  {t("admin.providerMarketMatrix.fonctionnaliteCapacite")}
                </th>
                {marketCodes.map((code) => {
                  const m = marketLabels[code];
                  return (
                    <th
                      scope="col"
                      key={code}
                      className={`py-3 px-3 text-center min-w-35 ${
                        m.isDefault
                          ? "bg-primary/5 text-primary border-x border-primary/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-base">{m.flag}</span>
                        <span>{m.name}</span>
                        {m.isDefault && (
                          <span className="text-micro bg-primary text-text-inverse px-1.5 py-0.5 rounded-sm font-bold">
                            {t("admin.providerMarketMatrix.ref")}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {matrixRows.map((row) => {
                return (
                  <tr
                    key={row.capability}
                    className="hover:bg-stone-50/70 transition-colors"
                  >
                    {/* Capability column */}
                    <td className="py-3 px-4">
                      <ProviderCapabilityLabel
                        capability={row.capability}
                        showCategory
                        className="text-text-main"
                      />
                    </td>

                    {/* Market columns */}
                    {marketCodes.map((code) => {
                      const cell = row.markets[code];
                      const isDefaultMarket = code === defaultMarketCode;
                      return (
                        <td
                          key={code}
                          className={`py-3 px-2 text-center text-xs ${
                            isDefaultMarket
                              ? "bg-primary/5 border-x border-primary/10"
                              : ""
                          }`}
                        >
                          {cell.mode === "missing" ? (
                            <span className="inline-block text-micro font-medium text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">
                              {t("admin.providerMarketMatrix.aucunAdaptateur")}
                            </span>
                          ) : (
                            <Link
                              to={`/admin/fournisseurs/${cell.activeProviderId}`}
                              className={`inline-flex flex-col items-center p-1.5 rounded-lg border transition-colors max-w-32.5 ${
                                cell.mode === "live"
                                  ? "bg-success-surface text-success border-success-border"
                                  : cell.mode === "demo"
                                    ? "bg-info-surface text-info border-info-border"
                                    : "bg-stone-100 text-stone-700 border-stone-200"
                              }`}
                            >
                              <span className="font-bold text-micro truncate max-w-30">
                                {cell.activeProviderName}
                              </span>
                              <span className="text-micro font-medium">
                                {cell.mode === "live"
                                  ? "Live vérifié"
                                  : cell.mode === "demo"
                                    ? "Démo uniquement"
                                    : "Affectation non vérifiée"}
                              </span>
                            </Link>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
