import React, { useEffect, useMemo, useState } from "react";
import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import {
  Cpu,
  LayoutDashboard,
  Layers,
  Globe,
  Sliders,
  RefreshCw,
  Clock,
} from "lucide-react";
import { providerService } from "../../../domains/providers/provider.service";
import { ProviderOverviewDashboard } from "./components/ProviderOverviewDashboard";
import { ProviderCatalogTable } from "./components/ProviderCatalogTable";
import { ProviderMarketMatrix } from "./components/ProviderMarketMatrix";
import { ProviderRoutingManager } from "./components/ProviderRoutingManager";
import { ProviderAuditLogsTab } from "./components/ProviderAuditLogsTab";
import { Modal } from "../../../design-system/primitives/Modal";
import { Button } from "../../../design-system/primitives/Button";
import { useToast } from "../../../app/providers/ToastProvider";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { services } from "../../../api/client/service-registry";
import type {
  ProviderConfiguration,
  ProviderHealthStatus,
} from "../../../domains/providers/provider.types";
import { PROVIDER_CONFIGURATION_CONSTRAINTS } from "../../../domains/providers/provider.types";
import { ProviderCapabilityLabel } from "./components/ProviderCapabilityLabel";

type MainTab = "overview" | "catalog" | "matrix" | "routing" | "audit";

export const AdminProvidersPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminProviders.title"),
    description: t("meta.adminProviders.description"),
    canonicalPath: "/admin/fournisseurs",
    noIndex: true,
  });

  const toast = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>("overview");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick Test Modal state
  const [testModalProviderId, setTestModalProviderId] = useState<string | null>(
    null,
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProviderDiagnosticResult | null>(
    null,
  );
  const [controlPlane, setControlPlane] =
    useState<ProviderControlPlaneSnapshot | null>(null);
  const [controlPlaneError, setControlPlaneError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;
    setControlPlaneError(null);
    services.providerControlPlane
      .getSnapshot()
      .then((snapshot) => {
        if (mounted) setControlPlane(snapshot);
      })
      .catch((error) => {
        if (!mounted) return;
        setControlPlaneError(
          error instanceof Error
            ? error.message
            : "Control plane indisponible.",
        );
      });
    return () => {
      mounted = false;
    };
  }, [refreshTrigger]);

  const providers = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const definitions = new Map(
      controlPlane?.providers.map(({ definition }) => [
        definition.id,
        definition,
      ]) || [],
    );
    return providerService.getProviders().map((provider) => ({
      ...provider,
      operational: definitions.get(provider.id) || provider.operational,
    }));
  }, [controlPlane, refreshTrigger]);

  const configurations = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const merged = { ...providerService.getConfigurations() };
    const healthMap: Record<string, ProviderHealthStatus> = {
      HEALTHY: "healthy",
      DEGRADED: "degraded",
      PARTIAL_OUTAGE: "degraded",
      OUTAGE: "unavailable",
      MISCONFIGURED: "unavailable",
      DISABLED: "unavailable",
      UNKNOWN: "unknown",
    };
    for (const entry of controlPlane?.providers || []) {
      const current = merged[entry.definition.id];
      const runtime = entry.runtime;
      const projected: ProviderConfiguration = {
        providerId: entry.definition.id,
        enabled: runtime.enabled,
        environment: runtime.environment,
        priority:
          current?.priority || PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min,
        credentialStatus: runtime.configured
          ? "configured"
          : entry.definition.requiredEnvironmentVariables.length === 0
            ? "not_required"
            : "not_configured",
        health: healthMap[runtime.health] || "unknown",
        healthLastCheckedAt: runtime.lastCheckedAt,
        healthMessage: runtime.message,
        settings: {},
        marketOverrides: current?.marketOverrides || {},
        updatedAt: runtime.lastCheckedAt || controlPlane!.generatedAt,
        version: current?.version || 1,
      };
      merged[entry.definition.id] = projected;
    }
    return merged;
  }, [controlPlane, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    toast.info("Données des intégrations actualisées.");
  };

  const handleOpenTestModal = (providerId: string) => {
    setTestModalProviderId(providerId);
    setTestResult(null);
  };

  const handleExecuteQuickTest = async () => {
    if (!testModalProviderId) return;
    setIsTesting(true);
    try {
      const res =
        await services.providerControlPlane.testProvider(testModalProviderId);
      setTestResult(res);
      if (res.success) {
        toast.success(
          `Diagnostic réussi pour ${testModalProviderId} (${res.latencyMs} ms).`,
        );
      } else {
        toast.info(res.message);
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
      <div className="bg-bg-surface p-5 rounded-control border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("admin.adminProvidersPage.administrationSystemeIntegrations")}
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-medium text-stone-500">
              Control plane v3
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-text-main tracking-tight flex items-center gap-2.5">
            <Cpu className="w-icon-xl h-icon-xl text-primary" />
            {t("admin.adminProvidersPage.fournisseursIntegrationsExternes")}
          </h1>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl">
            {t(
              "admin.adminProvidersPage.inventaireDeCodeConfigurationRuntimeEtPreuvesDeSanteSans",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            leftIcon={<RefreshCw className="w-icon-sm h-icon-sm" />}
            className="text-xs h-control-md font-semibold"
          >
            Actualiser
          </Button>
        </div>
      </div>

      {controlPlaneError && (
        <div
          role="alert"
          className="rounded-lg border border-danger-border bg-danger-surface px-4 py-3 text-xs text-danger"
        >
          {t("admin.adminProvidersPage.leControlPlaneBackendNEstPasJoignable")}{" "}
          {controlPlaneError}
        </div>
      )}

      {/* Main Tab Navigation Bar */}
      <div className="bg-bg-surface rounded-control border border-stone-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <LayoutDashboard className="w-icon-sm h-icon-sm" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "catalog"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Layers className="w-icon-sm h-icon-sm" />
          <span>
            {t("admin.adminProvidersPage.catalogueDesIntegrations")}
            {providers.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "matrix"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Globe className="w-icon-sm h-icon-sm" />
          <span>{t("admin.adminProvidersPage.matriceMultiMarches")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("routing")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "routing"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Sliders className="w-icon-sm h-icon-sm" />
          <span>Routage & Secours</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "audit"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Clock className="w-icon-sm h-icon-sm" />
          <span>Journal d'Audit</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <ProviderOverviewDashboard
          providers={providers}
          configurations={configurations}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onNavigateToTab={(t) => setActiveTab(t)}
        />
      )}

      {activeTab === "catalog" && (
        <ProviderCatalogTable
          providers={providers}
          configurations={configurations}
          selectedCategory={selectedCategory}
          onSelectCategory={(cat) => setSelectedCategory(cat)}
          onOpenTestModal={handleOpenTestModal}
        />
      )}

      {activeTab === "matrix" && <ProviderMarketMatrix />}

      {activeTab === "routing" && <ProviderRoutingManager />}

      {activeTab === "audit" && <ProviderAuditLogsTab />}

      {/* Quick Test Diagnostic Modal */}
      {testModalProviderId && activeTestProvider && (
        <Modal
          isOpen={Boolean(testModalProviderId)}
          onClose={() => setTestModalProviderId(null)}
          title={`Diagnostic Rapide : ${activeTestProvider.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 p-1">
            <p className="text-xs text-text-secondary">
              {t(
                "admin.adminProvidersPage.leBackendExecuteUniquementUnProbeNonDestructifEnregistreEn",
              )}
            </p>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs space-y-1">
              <div>
                <span className="text-stone-500">Code : </span>
                <strong className="font-mono text-stone-800">
                  {activeTestProvider.code}
                </strong>
              </div>
              <div>
                <span className="text-stone-500">
                  {t("admin.adminProvidersPage.capacitesAnnoncees")}
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {activeTestProvider.capabilities.map((capability) => (
                    <ProviderCapabilityLabel
                      key={capability}
                      capability={capability}
                      compact
                      className="max-w-64 rounded border border-stone-200 bg-bg-surface px-2 py-1 text-stone-800"
                    />
                  ))}
                </div>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono ${
                  testResult.success
                    ? "bg-emerald-900 text-emerald-100 border-emerald-700"
                    : "bg-rose-900 text-rose-100 border-rose-700"
                }`}
              >
                <div className="font-bold mb-1">
                  {testResult.success
                    ? "✓ PREUVE LIVE ENREGISTRÉE"
                    : "ℹ AUCUNE PREUVE LIVE"}{" "}
                  ({testResult.latencyMs} ms)
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
              >
                {t("admin.adminProvidersPage.lancerLeTest")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
