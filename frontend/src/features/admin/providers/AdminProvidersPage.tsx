import React, { useState, useMemo } from 'react';
import {
  Cpu,
  LayoutDashboard,
  Layers,
  Globe,
  Sliders,
  RefreshCw,
  Clock
  
  
} from 'lucide-react';
import { providerService } from '../../../domains/providers/provider.service';
import { ProviderOverviewDashboard } from './components/ProviderOverviewDashboard';
import { ProviderCatalogTable } from './components/ProviderCatalogTable';
import { ProviderMarketMatrix } from './components/ProviderMarketMatrix';
import { ProviderRoutingManager } from './components/ProviderRoutingManager';
import { ProviderAuditLogsTab } from './components/ProviderAuditLogsTab';
import { Modal } from '../../../design-system/primitives/Modal';
import { Button } from '../../../design-system/primitives/Button';
import { useToast } from '../../../app/providers/ToastProvider';
import { useTranslation } from '../../../i18n/I18nProvider';
import { usePageMeta } from '../../../hooks/usePageMeta';

type MainTab = 'overview' | 'catalog' | 'matrix' | 'routing' | 'audit';

export const AdminProvidersPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.adminProviders.title'),
    description: t('meta.adminProviders.description'),
    canonicalPath: '/admin/fournisseurs',
    noIndex: true,
  });

  const toast = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick Test Modal state
  const [testModalProviderId, setTestModalProviderId] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  const providers = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return providerService.getProviders();
  }, [refreshTrigger]);

  const configurations = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return providerService.getConfigurations();
  }, [refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.info('Données des intégrations actualisées.');
  };

  const handleOpenTestModal = (providerId: string) => {
    setTestModalProviderId(providerId);
    setTestResult(null);
  };

  const handleExecuteQuickTest = async () => {
    if (!testModalProviderId) return;
    setIsTesting(true);
    try {
      const res = await providerService.testProvider(testModalProviderId, 'healthy');
      setTestResult(res);
      if (res.success) {
        toast.success(`Diagnostic réussi pour ${testModalProviderId} (${res.latencyMs} ms).`);
      } else {
        toast.error(`Échec : ${res.message}`);
      }
    } finally {
      setIsTesting(false);
    }
  };

  const activeTestProvider = testModalProviderId
    ? providerService.getProvider(testModalProviderId)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">{t('admin.adminProvidersPage.administrationSystemeIntegrations')}</span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-medium text-stone-500">Architecture v2.4</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-primary" />{t('admin.adminProvidersPage.fournisseursIntegrationsExternes')}</h1>
          <p className="text-xs text-stone-600 mt-1 max-w-2xl">{t('admin.adminProvidersPage.gestionCentraliseeDeToutesLes')}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs h-control-md font-semibold"
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* Main Tab Navigation Bar */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catalogue des intégrations ({providers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'matrix'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t('admin.adminProvidersPage.matriceMultiMarches')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routing')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'routing'
              ? 'bg-primary text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Routage & Secours</span>
        </button>

        <button
          type="button"
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

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ProviderOverviewDashboard
          providers={providers}
          configurations={configurations}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onNavigateToTab={(t) => setActiveTab(t)}
        />
      )}

      {activeTab === 'catalog' && (
        <ProviderCatalogTable
          providers={providers}
          configurations={configurations}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onOpenTestModal={handleOpenTestModal}
        />
      )}

      {activeTab === 'matrix' && <ProviderMarketMatrix />}

      {activeTab === 'routing' && (
        <ProviderRoutingManager
          providers={providers}
          configurations={configurations}
          onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === 'audit' && <ProviderAuditLogsTab />}

      {/* Quick Test Diagnostic Modal */}
      {testModalProviderId && activeTestProvider && (
        <Modal
          isOpen={Boolean(testModalProviderId)}
          onClose={() => setTestModalProviderId(null)}
          title={`Diagnostic Rapide : ${activeTestProvider.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 p-1">
            <p className="text-xs text-stone-600">{t('admin.adminProvidersPage.executezUnTestDeConnectivite')}</p>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
              <div>
                <span className="text-stone-500">Code : </span>
                <strong className="font-mono text-stone-800">{activeTestProvider.code}</strong>
              </div>
              <div>
                <span className="text-stone-500">{t('admin.adminProvidersPage.capacitesTestees')} </span>
                <strong className="text-stone-800">{activeTestProvider.capabilities.join(', ')}</strong>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  testResult.success
                    ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                    : 'bg-rose-900 text-rose-100 border-rose-700'
                }`}
              >
                <div className="font-bold mb-1">
                  {testResult.success ? '✓ TEST RÉUSSI' : '✗ ÉCHEC DU TEST'} ({testResult.latencyMs} ms)
                </div>
                <p className="text-micro">{testResult.message}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTestModalProviderId(null)}
              >
                Fermer
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isTesting}
                onClick={handleExecuteQuickTest}
                className="font-bold"
              >{t('admin.adminProvidersPage.lancerLeTest')}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
