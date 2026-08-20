import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sliders,
  ShieldCheck
  
  
  
  
  
  
  
} from 'lucide-react';
import { Provider,  ProviderConfiguration } from '../../../../domains/providers/provider.types';
import { providerService } from '../../../../domains/providers/provider.service';
import {
  getAllCapabilities,
  
  getCategoryMetadata
} from '../../../../domains/providers/provider-capabilities';
import { useTranslation } from '../../../../i18n/I18nProvider';

interface ProviderRoutingManagerProps {
  providers: Provider[];
  configurations: Record<string, ProviderConfiguration>;
  onRefresh: () => void;
}

export const ProviderRoutingManager: React.FC<ProviderRoutingManagerProps> = ({
  providers,
  configurations,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [selectedMarket, setSelectedMarket] = useState<string>('FR');

  const capabilitiesWithMultipleProviders = useMemo(() => {
    return getAllCapabilities().map((cap) => {
      const candidates = providers.filter((p) => p.capabilities.includes(cap.id));
      const resolution = providerService.resolveEffectiveProviders(cap.id, selectedMarket);

      return {
        capability: cap,
        candidates,
        resolution,
        hasRedundancy: candidates.length > 1,
      };
    });
  }, [providers, configurations, selectedMarket]);

  return (
    <div className="space-y-4">
      {/* Header bar with market selector */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />{t('admin.providerRoutingManager.gestionnaireDeRoutagePrioritesSecours')}</h3>
          <p className="text-xs text-stone-500 mt-0.5">{t('admin.providerRoutingManager.configurezLesPrestatairesPrimairesEt')}</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-stone-600">{t('admin.providerRoutingManager.marcheCible')}</label>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="py-1 px-2.5 text-xs rounded-control border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-primary bg-stone-50 text-stone-800 font-bold h-control-touch"
          >
            <option value="FR">{t('admin.providerRoutingManager.franceReference')}</option>
            <option value="BE">🇧🇪 Belgique</option>
            <option value="CH">🇨🇭 Suisse</option>
            <option value="ES">🇪🇸 Espagne</option>
            <option value="LU">🇱🇺 Luxembourg</option>
            <option value="DE">🇩🇪 Allemagne</option>
          </select>
        </div>
      </div>

      {/* Capabilities Routing List */}
      <div className="space-y-3">
        {capabilitiesWithMultipleProviders.map(({ capability, candidates, resolution, hasRedundancy }) => {
          const catMeta = getCategoryMetadata(capability.category);
          const primary = resolution.primaryProvider;
          const fallback = resolution.fallbackProvider;

          return (
            <div
              key={capability.id}
              className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Capability description */}
              <div className="max-w-md">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-micro font-bold px-1.5 py-0.2 rounded border ${catMeta.badgeClass}`}>
                    {catMeta.shortLabel}
                  </span>
                  <span className="font-bold text-xs text-stone-900">{capability.name}</span>
                </div>
                <p className="text-xs text-stone-500">{capability.description}</p>
                <div className="text-micro text-stone-500 font-mono mt-1">{capability.id}</div>
              </div>

              {/* Routing Chain (Primary -> Fallback) */}
              <div className="flex flex-1 items-center gap-3">
                {/* Primary Provider Box */}
                <div className="flex-1 p-2.5 rounded-lg border border-success-border bg-success-surface/50">
                  <div className="text-micro font-bold uppercase tracking-wider text-success mb-1 flex items-center justify-between">
                    <span>1. Prestataire Primaire</span>
                    <span className="bg-emerald-200/70 text-success px-1 rounded text-micro">P1</span>
                  </div>
                  {primary ? (
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/admin/fournisseurs/${primary.id}`}
                        className="font-bold text-xs text-stone-900 hover:text-primary transition-colors"
                      >
                        {primary.name}
                      </Link>
                      <span className="w-2 h-2 rounded-full bg-success" title={t('admin.providerRoutingManager.operationnel')} />
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-stone-500 italic">Aucun</span>
                  )}
                </div>

                <span className="text-stone-300 font-black">→</span>

                {/* Fallback Provider Box */}
                <div
                  className={`flex-1 p-2.5 rounded-lg border ${
                    fallback
                      ? 'border-info-border bg-info-surface/50'
                      : 'border-stone-200 bg-stone-50/50 border-dashed'
                  }`}
                >
                  <div className="text-micro font-bold uppercase tracking-wider text-stone-600 mb-1 flex items-center justify-between">
                    <span>2. Secours (Fallback)</span>
                    {fallback && <span className="bg-blue-200/70 text-info px-1 rounded text-micro">P2</span>}
                  </div>
                  {fallback ? (
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/admin/fournisseurs/${fallback.id}`}
                        className="font-bold text-xs text-stone-900 hover:text-primary transition-colors"
                      >
                        {fallback.name}
                      </Link>
                      <span className="w-2 h-2 rounded-full bg-info" title={t('admin.providerRoutingManager.pretPourBascule')} />
                    </div>
                  ) : (
                    <span className="text-xs text-stone-500 italic">{t('admin.providerRoutingManager.aucunSecoursDefini')}</span>
                  )}
                </div>
              </div>

              {/* Status Pill */}
              <div className="shrink-0 flex items-center gap-2">
                {hasRedundancy ? (
                  <span className="inline-flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-2 py-1 rounded-full">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Redondance active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-micro font-semibold text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
                    Prestataire unique
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
