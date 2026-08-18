import React, { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sliders,
  Globe,
  Activity,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Cpu,
  Building,
  Key,
} from 'lucide-react';
import { providerService } from '../../../domains/providers/provider.service';
import { getCategoryMetadata, getCapabilityMetadata } from '../../../domains/providers/provider-capabilities';
import { ProviderConfigurationForm } from './components/ProviderConfigurationForm';
import { ProviderMarketOverridesTab } from './components/ProviderMarketOverridesTab';
import { ProviderHealthSimulator } from './components/ProviderHealthSimulator';
import { ProviderAuditLogsTab } from './components/ProviderAuditLogsTab';
import { ProviderImpactModal } from './components/ProviderImpactModal';
import { Button } from '../../../design-system/primitives/Button';
import { StatePanel } from '../../../design-system/primitives/StatePanel';
import { Badge } from '../../../design-system/primitives/Badge';
import { useToast } from '../../../app/providers/ToastProvider';

type DetailTab = 'configuration' | 'markets' | 'health' | 'dependencies' | 'audit';

export const AdminProviderDetailPage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<DetailTab>('configuration');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Impact modal state
  const [impactAction, setImpactAction] = useState<(() => Promise<void>) | null>(null);
  const [impactMessage, setImpactMessage] = useState<string>('');

  const provider = useMemo(() => {
    return providerId ? providerService.getProvider(providerId) : undefined;
  }, [providerId]);

  const configuration = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _ = refreshTrigger;
    return providerId ? providerService.getConfiguration(providerId) : null;
  }, [providerId, refreshTrigger]);

  if (!provider || !configuration) {
    return (
      <StatePanel
        variant="notFound"
        title="Fournisseur introuvable"
        description="Cet identifiant de prestataire n'est pas répertorié dans le registre canonique Shongre. Il a peut-être été retiré ou renommé."
        technicalDetail={`providerId: ${providerId}`}
        action={
          <Button
            to="/admin/fournisseurs"
            variant="primary"
            size="sm"
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Retour aux intégrations
          </Button>
        }
      />
    );
  }

  const catMeta = getCategoryMetadata(provider.category);
  const isEnabled = configuration.enabled;
  const health = configuration.health;

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/fournisseurs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour au catalogue des fournisseurs</span>
        </Link>

        {provider.metadata.documentationUrl && (
          <a
            href={provider.metadata.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>{provider.metadata.documentationLabel || 'Documentation technique'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Provider Header Card */}
      <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-lg text-stone-800 shrink-0">
              {provider.name.charAt(0)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-stone-900">{provider.name}</h1>
                <span className="text-xs font-mono font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                  {provider.code}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${catMeta.badgeClass}`}>
                  {catMeta.shortLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                {provider.metadata.companyName && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-stone-400" />
                    {provider.metadata.companyName}
                    {provider.metadata.headquartersCountry && ` (${provider.metadata.headquartersCountry})`}
                  </span>
                )}
                <span>•</span>
                <span>
                  Version config : <strong>v{configuration.version}</strong>
                </span>
                <span>•</span>
                <span>
                  Modifié le : {new Date(configuration.updatedAt).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Health Indicators */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isEnabled ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-surface border border-success-border px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Actif (Priorité {configuration.priority})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 bg-stone-100 border border-stone-200 px-2.5 py-1 rounded-full">
                Désactivé
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                health === 'healthy'
                  ? 'bg-success-surface text-success border-success-border'
                  : health === 'degraded'
                  ? 'bg-warning-surface text-warning border-warning-border'
                  : 'bg-danger-surface text-danger border-danger-border'
              }`}
            >
              {health === 'healthy' && '● Opérationnel'}
              {health === 'degraded' && '▲ Dégradé'}
              {health === 'unavailable' && '■ Indisponible'}
              {health === 'unknown' && 'Santé inconnue'}
            </span>

            <span className="text-xs font-mono font-bold bg-stone-800 text-stone-200 px-2.5 py-1 rounded-full uppercase">
              {configuration.environment}
            </span>
          </div>
        </div>

        {/* Capabilities badges bar */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 mr-1">Capacités fournies :</span>
          {provider.capabilities.map((cap) => (
            <span
              key={cap}
              className="text-xs font-mono bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200 font-medium"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Detail Tab Navigation */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('configuration')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'configuration'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Configuration & Clés</span>
        </button>

        <button
          onClick={() => setActiveTab('markets')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'markets'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Marchés & Surcharges</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'health'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Santé & Tests Démo</span>
        </button>

        <button
          onClick={() => setActiveTab('dependencies')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'dependencies'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Utilisation & Dépendances</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'audit'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Journal d'Audit</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'configuration' && (
        <ProviderConfigurationForm
          provider={provider}
          configuration={configuration}
          onSaved={() => setRefreshTrigger((prev) => prev + 1)}
          onRequestImpactReview={(action, msg) => {
            setImpactAction(() => action);
            setImpactMessage(msg);
          }}
        />
      )}

      {activeTab === 'markets' && (
        <ProviderMarketOverridesTab
          provider={provider}
          configuration={configuration}
          onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'health' && (
        <ProviderHealthSimulator
          provider={provider}
          configuration={configuration}
          onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'dependencies' && (
        <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2">
            Fonctionnalités Shongre Dépendantes de ce Prestataire
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {provider.capabilities.map((cap) => {
              const meta = getCapabilityMetadata(cap);
              return (
                <div key={cap} className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">{meta.name}</span>
                    <span className="text-micro font-mono text-stone-500">{cap}</span>
                  </div>
                  <p className="text-xs text-stone-500">{meta.description}</p>
                  <div className="pt-2 border-t border-stone-200/60">
                    <span className="text-micro font-semibold text-stone-600 block mb-1">
                      Fonctionnalités directes :
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {meta.usedByFeatures.map((f) => (
                        <span key={f} className="text-micro bg-stone-200/70 text-stone-800 px-1.5 py-0.5 rounded font-medium">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'audit' && <ProviderAuditLogsTab providerId={provider.id} />}

      {/* Impact Modal */}
      {impactAction && (
        <ProviderImpactModal
          isOpen={Boolean(impactAction)}
          onClose={() => setImpactAction(null)}
          onConfirm={async () => {
            if (impactAction) {
              await impactAction();
              setImpactAction(null);
            }
          }}
          provider={provider}
          customMessage={impactMessage}
        />
      )}
    </div>
  );
};
