import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { ProviderCategory } from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import {
  PROVIDER_CATEGORIES,
  getCategoryMetadata,
} from "../../../../domains/providers/provider-capabilities";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";

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
      {/* Header card with inheritance explanation */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-info" />
            {t("admin.providerMarketMatrix.matriceDeCouvertureMultiMarches")}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            {availableMarkets.find((market) => market.isDefault)?.name ||
              "Le marché par défaut"}{" "}
            est la référence canonique ; les autres marchés peuvent hériter de
            sa configuration.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-control border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50 text-stone-700 font-medium h-control-touch"
          >
            <option value="ALL">Tous les domaines ({matrixRows.length})</option>
            {Object.values(PROVIDER_CATEGORIES).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600 bg-stone-50/80 p-3 rounded-lg border border-stone-200">
        <span className="font-semibold text-stone-700">
          {t("admin.providerMarketMatrix.legende")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span>Preuve live vérifiée</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          <span>Non vérifié / hérité</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-info" />
          <span>Simulation démo</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span>{t("admin.providerMarketMatrix.desactiveIndisponible")}</span>
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 border-collapse">
            <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
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
                          <span className="text-micro bg-primary text-white px-1.5 py-0.2 rounded-sm font-bold">
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
                const catMeta = getCategoryMetadata(row.category);
                return (
                  <tr
                    key={row.capability}
                    className="hover:bg-stone-50/70 transition-colors"
                  >
                    {/* Capability column */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">
                          {row.capabilityName}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-micro text-stone-500 font-mono">
                            {row.capability}
                          </span>
                          <span
                            className={`text-micro font-bold px-1.5 py-0.2 rounded border ${catMeta.badgeClass}`}
                          >
                            {catMeta.shortLabel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Market columns */}
                    {marketCodes.map((code) => {
                      const cell = row.markets[code];
                      const isDefaultMarket = code === defaultMarketCode;
                      const isInherited = cell.isInherited && !isDefaultMarket;
                      const isCustomized =
                        !cell.isInherited &&
                        !isDefaultMarket &&
                        cell.isAvailable;

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
                              Aucun adaptateur
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
                                    : isCustomized
                                      ? "Surcharge non vérifiée"
                                      : isInherited
                                        ? "Hérité · non vérifié"
                                        : isDefaultMarket
                                          ? "Référence · non vérifiée"
                                          : "Non vérifié"}
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
