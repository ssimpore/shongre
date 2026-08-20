import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  
  CheckCircle2,
  
  
  
  
  
  
  ChevronRight,
  
  
  
  X,
  Play,
  RotateCcw
} from 'lucide-react';
import {
  Provider,
  
  ProviderConfiguration,
  ProviderEnvironment,
  ProviderHealthStatus
  
} from '../../../../domains/providers/provider.types';
import {
  PROVIDER_CATEGORIES,
  getCategoryMetadata
  
} from '../../../../domains/providers/provider-capabilities';
import { Button } from '../../../../design-system/primitives/Button';
import { useTranslation } from '../../../../i18n/I18nProvider';

interface ProviderCatalogTableProps {
  providers: Provider[];
  configurations: Record<string, ProviderConfiguration>;
  selectedCategory?: string;
  onSelectCategory: (category: string) => void;
  onOpenTestModal: (providerId: string) => void;
}

export const ProviderCatalogTable: React.FC<ProviderCatalogTableProps> = ({
  providers,
  configurations,
  selectedCategory,
  onSelectCategory,
  onOpenTestModal,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled' | 'requires_action'>('all');
  const [envFilter, setEnvFilter] = useState<'all' | ProviderEnvironment>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | ProviderHealthStatus>('all');

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const config = configurations[p.id];
      const q = searchQuery.toLowerCase().trim();

      // Search matching
      if (q) {
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesCode = p.code.toLowerCase().includes(q);
        const matchesCat = p.category.toLowerCase().includes(q);
        const matchesCap = p.capabilities.some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesCode && !matchesCat && !matchesCap) return false;
      }

      // Category filter
      if (selectedCategory && selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active' && (!config || !config.enabled)) return false;
      if (statusFilter === 'disabled' && config && config.enabled) return false;
      if (statusFilter === 'requires_action' && (!config || config.credentialStatus !== 'not_configured')) return false;

      // Environment filter
      if (envFilter !== 'all' && config?.environment !== envFilter) return false;

      // Health filter
      if (healthFilter !== 'all' && config?.health !== healthFilter) return false;

      return true;
    });
  }, [providers, configurations, searchQuery, selectedCategory, statusFilter, envFilter, healthFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    onSelectCategory('ALL');
    setStatusFilter('all');
    setEnvFilter('all');
    setHealthFilter('all');
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('admin.providerCatalogTable.rechercherParNomCapaciteEx')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent bg-stone-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div>
            <select
              value={selectedCategory || 'ALL'}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50/50 text-stone-700"
            >
              <option value="ALL">{t('admin.providerCatalogTable.toutesLesCategories')}</option>
              {Object.values(PROVIDER_CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.shortLabel} ({cat.name})
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50/50 text-stone-700"
            >
              <option value="all">{t('admin.providerCatalogTable.tousLesStatuts')}</option>
              <option value="active">Actif uniquement</option>
              <option value="disabled">{t('admin.providerCatalogTable.desactive')}</option>
              <option value="requires_action">Action requise</option>
            </select>
          </div>

          {/* Health Dropdown */}
          <div>
            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value as any)}
              className="w-full py-2 px-2.5 text-xs rounded-lg border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50/50 text-stone-700"
            >
              <option value="all">{t('admin.providerCatalogTable.toutesLesSantes')}</option>
              <option value="healthy">{t('admin.providerCatalogTable.operationnel')}</option>
              <option value="degraded">{t('admin.providerCatalogTable.degrade')}</option>
              <option value="unavailable">Indisponible</option>
            </select>
          </div>
        </div>

        {/* Active filter counter & reset */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs text-stone-500">
          <span>{t('admin.providerCatalogTable.affichageDe')}<strong>{filteredProviders.length}</strong> intégration(s) sur {providers.length}
          </span>
          {(searchQuery || selectedCategory !== 'ALL' || statusFilter !== 'all' || envFilter !== 'all' || healthFilter !== 'all') && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-primary hover:underline font-medium text-xs"
            >
              <RotateCcw className="w-3 h-3" />{t('admin.providerCatalogTable.reinitialiserLesFiltres')}</button>
          )}
        </div>
      </div>

      {/* Provider List Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider font-semibold border-b border-stone-200">
              <tr>
                <th scope="col" className="py-3 px-4">Fournisseur & Code</th>
                <th scope="col" className="py-3 px-3">Domaine</th>
                <th scope="col" className="py-3 px-3">{t('admin.providerCatalogTable.capacitesPrisesEnCharge')}</th>
                <th scope="col" className="py-3 px-3">{t('admin.providerCatalogTable.statutSante')}</th>
                <th scope="col" className="py-3 px-3">{t('admin.providerCatalogTable.marchesSupportes')}</th>
                <th scope="col" className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-500">{t('admin.providerCatalogTable.aucunFournisseurNeCorrespondAux')}</td>
                </tr>
              ) : (
                filteredProviders.map((p) => {
                  const cfg = configurations[p.id];
                  const isEnabled = cfg?.enabled ?? false;
                  const health = cfg?.health || 'unknown';
                  const catMeta = getCategoryMetadata(p.category);
                  const overridesCount = Object.keys(cfg?.marketOverrides || {}).length;

                  return (
                    <tr key={p.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            to={`/admin/fournisseurs/${p.id}`}
                            className="font-bold text-stone-900 hover:text-primary transition-colors flex items-center gap-1.5"
                          >
                            {p.name}
                          </Link>
                          <span className="text-micro text-stone-500 font-mono">
                            {p.code}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-micro font-bold border ${catMeta.badgeClass}`}>
                          {catMeta.shortLabel}
                        </span>
                      </td>

                      {/* Capabilities */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {p.capabilities.slice(0, 3).map((cap) => (
                            <span
                              key={cap}
                              className="text-micro bg-stone-100 text-stone-700 font-mono px-1.5 py-0.5 rounded border border-stone-200"
                            >
                              {cap}
                            </span>
                          ))}
                          {p.capabilities.length > 3 && (
                            <span className="text-micro text-stone-500 font-medium self-center">
                              +{p.capabilities.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status & Health */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          {isEnabled ? (
                            <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface border border-success-border px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Actif (P{cfg?.priority || 1})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-micro font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full">
                              <X className="w-3 h-3" />{t('admin.providerCatalogTable.desactive2')}</span>
                          )}

                          {isEnabled && health === 'healthy' && (
                            <span className="w-2 h-2 rounded-full bg-success" title={t('admin.providerCatalogTable.operationnel')} />
                          )}
                          {isEnabled && health === 'degraded' && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title={t('admin.providerCatalogTable.degrade')} />
                          )}
                          {isEnabled && health === 'unavailable' && (
                            <span className="w-2 h-2 rounded-full bg-danger animate-pulse" title="Indisponible" />
                          )}
                        </div>
                      </td>

                      {/* Markets */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1">
                          {p.supportedMarkets.includes('*') ? (
                            <span className="text-micro font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">{t('admin.providerCatalogTable.tous')}</span>
                          ) : (
                            p.supportedMarkets.map((m) => (
                              <span
                                key={m}
                                className={`text-micro font-mono px-1.5 py-0.5 rounded border ${
                                  cfg?.marketOverrides?.[m]
                                    ? 'bg-info-surface text-info border-info-border font-bold'
                                    : 'bg-stone-100 text-stone-600 border-stone-200'
                                }`}
                                title={cfg?.marketOverrides?.[m] ? `Surchargé pour ${m}` : `Hérite pour ${m}`}
                              >
                                {m}
                              </span>
                            ))
                          )}
                          {overridesCount > 0 && (
                            <span className="text-micro text-info font-semibold ml-1">
                              ({overridesCount} surcharge{overridesCount > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenTestModal(p.id)}
                            leftIcon={<Play className="w-3 h-3" />}
                            className="h-control-sm text-xs px-2 text-stone-600 hover:text-stone-900"
                          >
                            Tester
                          </Button>
                          <Button
                            to={`/admin/fournisseurs/${p.id}`} variant="outline"
                                                          size="sm"
                                                          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                                                          className="h-control-sm text-xs px-2.5 font-bold"
                          >{t('admin.providerCatalogTable.gerer')}</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
