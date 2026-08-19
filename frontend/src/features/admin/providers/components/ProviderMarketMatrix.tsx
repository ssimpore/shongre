import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
  Layers,
} from 'lucide-react';
import { ProviderCategory } from '../../../../domains/providers/provider.types';
import { providerService, MarketCoverageRow } from '../../../../domains/providers/provider.service';
import {
  PROVIDER_CATEGORIES,
  getCategoryMetadata,
} from '../../../../domains/providers/provider-capabilities';
import { Badge } from '../../../../design-system/primitives/Badge';
import { Button } from '../../../../design-system/primitives/Button';
import { useTranslation } from '../../../../i18n/I18nProvider';

interface ProviderMarketMatrixProps {
  onSelectProvider?: (providerId: string) => void;
}

export const ProviderMarketMatrix: React.FC<ProviderMarketMatrixProps> = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const marketCodes = ['FR', 'BE', 'CH', 'ES', 'LU', 'DE'];
  const marketLabels: Record<string, { name: string; flag: string; isDefault?: boolean }> = {
    FR: { name: 'France', flag: '🇫🇷', isDefault: true },
    BE: { name: 'Belgique', flag: '🇧🇪' },
    CH: { name: 'Suisse', flag: '🇨🇭' },
    ES: { name: 'Espagne', flag: '🇪🇸' },
    LU: { name: 'Luxembourg', flag: '🇱🇺' },
    DE: { name: 'Allemagne', flag: '🇩🇪' },
  };

  const matrixRows = useMemo(() => {
    const cat = selectedCategory === 'ALL' ? undefined : (selectedCategory as ProviderCategory);
    return providerService.getMarketCoverageMatrix(marketCodes, cat);
  }, [selectedCategory]);

  return (
    <div className="space-y-4">
      {/* Header card with inheritance explanation */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-info" />{t('admin.providerMarketMatrix.matriceDeCouvertureMultiMarches')}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{t('admin.providerMarketMatrix.laFranceEstLeMarche')}</p>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-1.5 px-2.5 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50 text-stone-700 font-medium"
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
        <span className="font-semibold text-stone-700">{t('admin.providerMarketMatrix.legende')}</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span>{t('admin.providerMarketMatrix.referenceFranceActive')}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
          <span>{t('admin.providerMarketMatrix.heriteDeFrance')}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-info" />
          <span>{t('admin.providerMarketMatrix.personnaliseSurcharge')}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          <span>{t('admin.providerMarketMatrix.desactiveIndisponible')}</span>
        </span>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700 border-collapse">
            <thead className="bg-stone-50 text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
              <tr>
                <th className="py-3 px-4 min-w-[220px]">{t('admin.providerMarketMatrix.fonctionnaliteCapacite')}</th>
                {marketCodes.map((code) => {
                  const m = marketLabels[code];
                  return (
                    <th
                      key={code}
                      className={`py-3 px-3 text-center min-w-[140px] ${
                        m.isDefault ? 'bg-primary/5 text-primary border-x border-primary/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-base">{m.flag}</span>
                        <span>{m.name}</span>
                        {m.isDefault && (
                          <span className="text-micro bg-primary text-white px-1.5 py-0.2 rounded-sm font-bold">{t('admin.providerMarketMatrix.ref')}</span>
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
                  <tr key={row.capability} className="hover:bg-stone-50/70 transition-colors">
                    {/* Capability column */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{row.capabilityName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-micro text-stone-500 font-mono">
                            {row.capability}
                          </span>
                          <span className={`text-micro font-bold px-1.5 py-0.2 rounded border ${catMeta.badgeClass}`}>
                            {catMeta.shortLabel}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Market columns */}
                    {marketCodes.map((code) => {
                      const cell = row.markets[code];
                      const isDefaultMarket = code === 'FR';
                      const isInherited = cell.isInherited && !isDefaultMarket;
                      const isCustomized = !cell.isInherited && !isDefaultMarket && cell.isAvailable;
                      const isUnavailable = !cell.isAvailable;

                      return (
                        <td
                          key={code}
                          className={`py-3 px-2 text-center text-xs ${
                            isDefaultMarket ? 'bg-primary/5 border-x border-primary/10' : ''
                          }`}
                        >
                          {isDefaultMarket ? (
                            cell.isAvailable ? (
                              <Link
                                to={`/admin/fournisseurs/${cell.activeProviderId}`}
                                className="inline-flex flex-col items-center p-1.5 rounded-lg bg-success-surface text-success border border-success-border hover:border-emerald-400 transition-colors max-w-[130px]"
                              >
                                <span className="font-bold text-micro truncate max-w-[120px]">
                                  {cell.activeProviderName}
                                </span>
                                <span className="text-micro text-success font-medium">{t('admin.providerMarketMatrix.referenceActive')}</span>
                              </Link>
                            ) : (
                              <span className="inline-block text-micro font-bold text-danger bg-danger-surface border border-danger-border px-2 py-1 rounded">{t('admin.providerMarketMatrix.nonConfigure')}</span>
                            )
                          ) : isInherited ? (
                            <div className="inline-flex flex-col items-center p-1.5 rounded-lg bg-stone-100 text-stone-600 border border-stone-200/80 max-w-[130px]">
                              <span className="font-semibold text-micro truncate max-w-[120px]">
                                {cell.activeProviderName}
                              </span>
                              <span className="text-micro text-stone-500 font-normal">{t('admin.providerMarketMatrix.heriteDeFr')}</span>
                            </div>
                          ) : isCustomized ? (
                            <Link
                              to={`/admin/fournisseurs/${cell.activeProviderId}`}
                              className="inline-flex flex-col items-center p-1.5 rounded-lg bg-info-surface text-info border border-info-border hover:border-blue-400 transition-colors max-w-[130px]"
                            >
                              <span className="font-bold text-micro truncate max-w-[120px]">
                                {cell.activeProviderName}
                              </span>
                              <span className="text-micro text-info font-bold">{t('admin.providerMarketMatrix.personnalise')}</span>
                            </Link>
                          ) : (
                            <span className="inline-block text-micro font-medium text-stone-500 bg-stone-50 border border-stone-200 px-2 py-0.5 rounded">{t('admin.providerMarketMatrix.desactive')}</span>
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
