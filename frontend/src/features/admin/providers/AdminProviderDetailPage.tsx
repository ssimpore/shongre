import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Sliders,
  Globe,
  Activity,
  Layers,
  Clock,
  ExternalLink,
  CheckCircle2,
  Building,
} from "lucide-react";
import { providerService } from "../../../domains/providers/provider.service";
import {
  getCategoryMetadata,
  getCapabilityMetadata,
} from "../../../domains/providers/provider-capabilities";
import { ProviderConfigurationForm } from "./components/ProviderConfigurationForm";
import { ProviderMarketOverridesTab } from "./components/ProviderMarketOverridesTab";
import { ProviderHealthSimulator } from "./components/ProviderHealthSimulator";
import { ProviderAuditLogsTab } from "./components/ProviderAuditLogsTab";
import { ProviderImpactModal } from "./components/ProviderImpactModal";
import { ProviderCapabilityLabel } from "./components/ProviderCapabilityLabel";
import { Button } from "../../../design-system/primitives/Button";
import { StatePanel } from "../../../design-system/primitives/StatePanel";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { labelIdentifier } from "../../../utilities/identifier-label";
import { useRegionalFormatters } from "../../../hooks/useRegionalFormatters";

type DetailTab =
  "configuration" | "markets" | "health" | "dependencies" | "audit";

export const AdminProviderDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useRegionalFormatters();
  usePageMeta({
    title: t("meta.adminProviderDetail.title"),
    description: t("meta.adminProviderDetail.description"),
    noIndex: true,
  });

  const { providerId } = useParams<{ providerId: string }>();
  const [activeTab, setActiveTab] = useState<DetailTab>("configuration");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Impact modal state
  const [impactAction, setImpactAction] = useState<
    (() => Promise<void>) | null
  >(null);
  const [impactMessage, setImpactMessage] = useState<string>("");

  const provider = useMemo(() => {
    return providerId ? providerService.getProvider(providerId) : undefined;
  }, [providerId]);

  const configuration = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return providerId ? providerService.getConfiguration(providerId) : null;
  }, [providerId, refreshTrigger]);

  if (!provider || !configuration) {
    return (
      <StatePanel
        variant="notFound"
        title="Fournisseur introuvable"
        description={t(
          "admin.adminProviderDetailPage.cetIdentifiantDePrestataireN",
        )}
        technicalDetail={`providerId: ${providerId}`}
        action={
          <Button
            to="/admin/fournisseurs"
            variant="primary"
            size="sm"
            leftIcon={<ArrowLeft className="w-icon-sm h-icon-sm" />}
          >
            {t("admin.adminProviderDetailPage.retourAuxIntegrations")}
          </Button>
        }
      />
    );
  }

  const catMeta = getCategoryMetadata(provider.category);
  const health = configuration.health;
  const isActive = Boolean(
    configuration.enabled &&
    configuration.environment !== "demo" &&
    health === "healthy" &&
    configuration.healthLastCheckedAt &&
    provider.operational.lifecycle === "ACTIVE",
  );

  return (
    <div className="space-y-6">
      {/* Back button & Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Link
          to="/admin/fournisseurs"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-main transition-colors"
        >
          <ArrowLeft className="w-icon-sm h-icon-sm" />
          <span>
            {t(
              "admin.adminProviderDetailPage.retourAuCatalogueDesFournisseurs",
            )}
          </span>
        </Link>

        {provider.metadata.documentationUrl && (
          <a
            href={provider.metadata.documentationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <span>
              {provider.metadata.documentationLabel ||
                "Documentation technique"}
            </span>
            <ExternalLink className="w-icon-xs h-icon-xs" />
          </a>
        )}
      </div>

      {/* Provider Header Card */}
      <div className="bg-bg-surface p-6 rounded-control border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="w-12 h-12 rounded-control bg-stone-100 border border-stone-200 flex items-center justify-center font-black text-lg text-stone-800 shrink-0">
              {provider.name.charAt(0)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl font-black text-text-main">
                  {provider.name}
                </h1>
                <span className="max-w-full break-all rounded border border-stone-200 bg-stone-100 px-2 py-0.5 font-mono text-xs font-bold text-text-secondary">
                  {provider.code}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded border ${catMeta.badgeClass}`}
                >
                  {catMeta.shortLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                {provider.metadata.companyName && (
                  <span className="flex items-center gap-1">
                    <Building className="w-icon-sm h-icon-sm text-text-disabled" />
                    {provider.metadata.companyName}
                    {provider.metadata.headquartersCountry &&
                      ` (${provider.metadata.headquartersCountry})`}
                  </span>
                )}
                <span>•</span>
                <span>
                  Version config : <strong>v{configuration.version}</strong>
                </span>
                <span>•</span>
                <span>
                  {t("admin.adminProviderDetailPage.modifieLe")}{" "}
                  {formatDate(configuration.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Status & Health Indicators */}
          <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
            {isActive ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-surface border border-success-border px-2.5 py-1 rounded-pill">
                <CheckCircle2 className="w-icon-sm h-icon-sm" />
                {t("admin.adminProviderDetailPage.actifPriorite")}{" "}
                {configuration.priority})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning-surface border border-warning-border px-2.5 py-1 rounded-pill">
                {provider.operational.adapterStatus === "IMPLEMENTED"
                  ? "Implémenté · non actif"
                  : provider.operational.adapterStatus === "DEMO_ONLY"
                    ? "Démo uniquement"
                    : "Non implémenté"}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-pill border ${
                configuration.environment === "demo" || health === "unknown"
                  ? "bg-stone-100 text-stone-700 border-stone-200"
                  : health === "healthy"
                    ? "bg-success-surface text-success border-success-border"
                    : health === "degraded"
                      ? "bg-warning-surface text-warning border-warning-border"
                      : "bg-danger-surface text-danger border-danger-border"
              }`}
            >
              {configuration.environment === "demo"
                ? "Démo — santé non vérifiée"
                : health === "healthy"
                  ? "● Opérationnel"
                  : health === "degraded"
                    ? "▲ Dégradé"
                    : health === "unavailable"
                      ? "■ Indisponible"
                      : "Santé inconnue"}
            </span>

            <span className="max-w-full break-all rounded-pill bg-stone-800 px-2.5 py-1 font-mono text-xs font-bold uppercase text-stone-200">
              {labelIdentifier(configuration.environment)}
            </span>
          </div>
        </div>

        {/* Capabilities badges bar */}
        <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-stone-500 mr-1">
            {t("admin.adminProviderDetailPage.capacitesCataloguees")}
          </span>
          {provider.capabilities.map((cap) => {
            const implemented =
              provider.operational.implementedCapabilities.includes(cap);
            const demoOnly =
              provider.operational.demoOnlyCapabilities?.includes(cap);
            return (
              <div
                key={cap}
                title={`${cap} — ${implemented ? "implémentée" : demoOnly ? "démo uniquement" : "non implémentée"}`}
                className={`max-w-72 rounded border px-2 py-1 ${
                  implemented
                    ? "bg-success-surface text-success border-success-border"
                    : demoOnly
                      ? "bg-info-surface text-info border-info-border"
                      : "bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <ProviderCapabilityLabel capability={cap} compact />
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Tab Navigation */}
      <div className="bg-bg-surface rounded-control border border-stone-200 shadow-xs p-1.5 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("configuration")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "configuration"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Sliders className="w-icon-sm h-icon-sm" />
          <span>{t("admin.adminProviderDetailPage.configurationCles")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("markets")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "markets"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Globe className="w-icon-sm h-icon-sm" />
          <span>{t("admin.adminProviderDetailPage.marchesSurcharges")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("health")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "health"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Activity className="w-icon-sm h-icon-sm" />
          <span>{t("admin.adminProviderDetailPage.santeTestsDemo")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dependencies")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "dependencies"
              ? "bg-primary text-text-inverse shadow-xs"
              : "text-text-secondary hover:text-text-main hover:bg-stone-100"
          }`}
        >
          <Layers className="w-icon-sm h-icon-sm" />
          <span>
            {t("admin.adminProviderDetailPage.utilisationDependances")}
          </span>
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

      {/* Tab Panels */}
      {activeTab === "configuration" && (
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

      {activeTab === "markets" && (
        <ProviderMarketOverridesTab
          provider={provider}
          configuration={configuration}
          onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === "health" && (
        <ProviderHealthSimulator
          provider={provider}
          configuration={configuration}
          onUpdated={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {activeTab === "dependencies" && (
        <div className="bg-bg-surface p-5 rounded-control border border-stone-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-text-main border-b border-stone-100 pb-2">
            {t(
              "admin.adminProviderDetailPage.fonctionnalitesShongreDependantesDeCe",
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {provider.capabilities.map((cap) => {
              const meta = getCapabilityMetadata(cap);
              return (
                <div
                  key={cap}
                  className="p-3.5 rounded-lg border border-stone-200 bg-stone-50/60 space-y-2"
                >
                  <ProviderCapabilityLabel
                    capability={cap}
                    showCategory
                    className="text-text-main"
                  />
                  <p className="text-xs text-stone-500">{meta.description}</p>
                  <div className="pt-2 border-t border-stone-200/60">
                    <span className="text-micro font-semibold text-text-secondary block mb-1">
                      {t(
                        "admin.adminProviderDetailPage.fonctionnalitesDirectes",
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {meta.usedByFeatures.map((f) => (
                        <span
                          key={f}
                          className="text-micro bg-stone-200/70 text-stone-800 px-1.5 py-0.5 rounded font-medium"
                        >
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

      {activeTab === "audit" && (
        <ProviderAuditLogsTab providerId={provider.id} />
      )}

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
