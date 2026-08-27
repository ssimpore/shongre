import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  CircleHelp,
} from "lucide-react";
import {
  getProviderOperationalDefinition,
  SHONGRE_CAPABILITY_REQUIREMENTS,
} from "@shongre/contracts/provider-platform";
import {
  Provider,
  ProviderCapability,
  ProviderConfiguration,
} from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { PROVIDER_CATEGORIES } from "../../../../domains/providers/provider-capabilities";
import { Button } from "../../../../design-system/primitives/Button";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { useRegionalFormatters } from "../../../../hooks/useRegionalFormatters";
import { ProviderCapabilityLabel } from "./ProviderCapabilityLabel";

const CRITICAL_CAPABILITIES: ReadonlyArray<{
  capability: ProviderCapability;
  description: string;
}> = [
  {
    capability: "payment.card",
    description: "Checkout Stripe ; hors flux marketplace/payout",
  },
  {
    capability: "delivery.relay_point",
    description: "Adaptateur transporteur requis",
  },
  {
    capability: "delivery.home_delivery",
    description: "Adaptateur transporteur requis",
  },
  {
    capability: "auth.oauth_google",
    description: "Adaptateur présent, preuve E2E requise",
  },
  {
    capability: "email.transactional",
    description: "Point de livraison générique à configurer",
  },
  {
    capability: "ai.listing_assistance",
    description: "Simulation uniquement ; mode manuel disponible",
  },
  {
    capability: "verification.business",
    description: "Simulation uniquement ; revue manuelle requise",
  },
  {
    capability: "maps.display",
    description: "Tuiles présentes ; géocodage non implémenté",
  },
];

interface ProviderOverviewDashboardProps {
  providers: Provider[];
  configurations: Record<string, ProviderConfiguration>;
  onSelectCategory: (category: string) => void;
  onNavigateToTab: (tab: "catalog" | "matrix" | "routing") => void;
}

export const ProviderOverviewDashboard: React.FC<
  ProviderOverviewDashboardProps
> = ({ providers, configurations, onSelectCategory, onNavigateToTab }) => {
  const { t } = useTranslation();
  const { formatDate } = useRegionalFormatters();
  // Key Metrics
  const metrics = useMemo(() => {
    let implementedCount = 0;
    let productionReadyCount = 0;
    let requiresActionCount = 0;
    let totalOverrides = 0;
    let verifiedHealthCount = 0;
    let verifiedHealthyCount = 0;

    providers.forEach((p) => {
      const cfg = configurations[p.id];
      if (p.operational.adapterStatus === "IMPLEMENTED") implementedCount++;
      if (
        p.operational.lifecycle === "PRODUCTION_READY" ||
        p.operational.lifecycle === "ACTIVE"
      ) {
        productionReadyCount++;
      }
      if (
        p.operational.criticality === "P0" &&
        p.operational.lifecycle !== "NOT_NEEDED" &&
        p.operational.adapterStatus !== "IMPLEMENTED"
      ) {
        requiresActionCount++;
      }
      if (
        cfg?.environment !== "demo" &&
        cfg?.healthLastCheckedAt &&
        cfg.health !== "unknown"
      ) {
        verifiedHealthCount++;
        if (cfg.health === "healthy") verifiedHealthyCount++;
      }
      totalOverrides += Object.keys(cfg?.marketOverrides || {}).length;
    });

    return {
      total: providers.length,
      implemented: implementedCount,
      productionReady: productionReadyCount,
      requiresAction: requiresActionCount,
      overrides: totalOverrides,
      verifiedHealthCount,
      healthScore:
        verifiedHealthCount > 0
          ? Math.round((verifiedHealthyCount / verifiedHealthCount) * 100)
          : null,
    };
  }, [providers, configurations]);

  // Audit history
  const recentAudit = useMemo(() => {
    return providerService.getAuditHistory().slice(0, 5);
  }, [configurations]);

  return (
    <div className="space-y-6">
      {/* 1. Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-0">
              {t("admin.providerOverviewDashboard.integrationsRepertoriees")}
            </span>
            <span className="p-2 rounded-lg bg-stone-100 text-stone-700 shrink-0">
              <Cpu className="w-icon-md h-icon-md" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.total}
            </span>
            <span className="ml-2 text-xs font-medium text-stone-500">
              {metrics.implemented} avec adaptateur
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-0">
              {t("admin.providerOverviewDashboard.santeOperationnelle")}
            </span>
            <span
              className={`p-2 rounded-lg shrink-0 ${
                metrics.healthScore === null
                  ? "bg-stone-100 text-stone-600"
                  : metrics.healthScore === 100
                    ? "bg-success-surface text-success"
                    : "bg-warning-surface text-warning"
              }`}
            >
              <Activity className="w-icon-md h-icon-md" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.healthScore === null ? "—" : `${metrics.healthScore}%`}
            </span>
            <span
              className={`ml-2 text-xs font-medium ${
                metrics.healthScore === null
                  ? "text-stone-500"
                  : metrics.healthScore === 100
                    ? "text-success"
                    : "text-warning"
              }`}
            >
              {metrics.healthScore === null
                ? "Aucune preuve live"
                : `${metrics.verifiedHealthCount} vérifiée(s)`}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-0">
              Prêts pour production
            </span>
            <span className="p-2 rounded-lg bg-info-surface text-info">
              <ShieldCheck className="w-icon-md h-icon-md" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.productionReady}
            </span>
            <span className="ml-2 text-xs font-medium text-stone-500">
              sur {metrics.total}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-0">
              Actions Requises
            </span>
            <span
              className={`p-2 rounded-lg shrink-0 ${
                metrics.requiresAction === 0
                  ? "bg-success-surface text-success"
                  : "bg-danger-surface text-danger"
              }`}
            >
              <AlertTriangle className="w-icon-md h-icon-md" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.requiresAction}
            </span>
            <span
              className={`ml-2 text-xs font-medium ${
                metrics.requiresAction === 0 ? "text-success" : "text-danger"
              }`}
            >
              {metrics.requiresAction === 0
                ? "Aucun blocage"
                : "Capacités P0 manquantes"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Critical platform capabilities matrix */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-icon-md h-icon-md text-success" />
              {t("admin.providerOverviewDashboard.etatDesFonctionsCritiquesDe")}
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {t(
                "admin.providerOverviewDashboard.resolutionEnDirectDuPrestataire",
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToTab("matrix")}
              rightIcon={<ArrowRight className="w-icon-sm h-icon-sm" />}
              className="text-xs h-control-sm"
            >
              {t("admin.providerOverviewDashboard.matriceMultiMarches")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {CRITICAL_CAPABILITIES.map((item) => {
            const requirement = SHONGRE_CAPABILITY_REQUIREMENTS.find(
              ({ capability }) => capability === item.capability,
            );
            const owner = requirement
              ? getProviderOperationalDefinition(requirement.primaryProviderId)
              : undefined;
            const cfg = owner ? configurations[owner.id] : undefined;
            const implemented = Boolean(
              owner?.implementedCapabilities.includes(item.capability),
            );
            const demoOnly = Boolean(
              owner?.demoOnlyCapabilities?.includes(item.capability),
            );
            const hasVerifiedHealth = Boolean(
              cfg?.environment !== "demo" && cfg?.healthLastCheckedAt,
            );
            const status =
              !owner || (!implemented && !demoOnly)
                ? "unavailable"
                : demoOnly
                  ? "demo"
                  : !hasVerifiedHealth
                    ? "unknown"
                    : cfg?.health === "healthy"
                      ? "operational"
                      : cfg?.health === "degraded"
                        ? "degraded"
                        : "unavailable";
            const catalogOwner = owner
              ? providers.find(({ id }) => id === owner.id)
              : undefined;

            return (
              <div
                key={item.capability}
                className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <ProviderCapabilityLabel
                      capability={item.capability}
                      compact
                      className="text-stone-900"
                    />
                    {status === "operational" && (
                      <span className="flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-1.5 py-0.5 rounded-sm">
                        <CheckCircle2 className="w-icon-xs h-icon-xs" />
                        Actif
                      </span>
                    )}
                    {status === "degraded" && (
                      <span className="flex items-center gap-1 text-micro font-bold text-warning bg-warning-surface px-1.5 py-0.5 rounded-sm">
                        <AlertTriangle className="w-icon-xs h-icon-xs" />
                        {t("admin.providerOverviewDashboard.degrade")}
                      </span>
                    )}
                    {status === "unavailable" && (
                      <span className="flex items-center gap-1 text-micro font-bold text-danger bg-danger-surface px-1.5 py-0.5 rounded-sm">
                        <XCircle className="w-icon-xs h-icon-xs" />
                        Inactif
                      </span>
                    )}
                    {status === "demo" && (
                      <span className="flex items-center gap-1 text-micro font-bold text-info bg-info-surface px-1.5 py-0.5 rounded-sm">
                        <CircleHelp className="w-icon-xs h-icon-xs" />
                        Démo
                      </span>
                    )}
                    {status === "unknown" && (
                      <span className="flex items-center gap-1 text-micro font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-sm">
                        <CircleHelp className="w-icon-xs h-icon-xs" />
                        Non vérifié
                      </span>
                    )}
                  </div>
                  <p className="text-micro text-stone-500 mb-2">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-micro">
                  <span className="text-stone-500">Prestataire :</span>
                  {catalogOwner ? (
                    <Link
                      to={`/admin/fournisseurs/${catalogOwner.id}`}
                      className="font-semibold text-primary hover:underline truncate max-w-35"
                    >
                      {owner?.displayName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-stone-700 truncate max-w-35">
                      {owner?.displayName || "Aucun propriétaire"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Category Quick Filters & Recent Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-stone-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Layers className="w-icon-md h-icon-md text-primary" />
              {t(
                "admin.providerOverviewDashboard.repartitionParDomaineCategorie",
              )}
            </h2>
            <span className="text-xs text-stone-500 font-mono">
              {Object.keys(PROVIDER_CATEGORIES).length} catégories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.values(PROVIDER_CATEGORIES)
              .filter(
                (c) => c.isCore || providers.some((p) => p.category === c.id),
              )
              .map((cat) => {
                const count = providers.filter(
                  (p) => p.category === cat.id,
                ).length;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onNavigateToTab("catalog");
                    }}
                    className="p-3 rounded-lg border border-stone-200 hover:border-primary hover:bg-primary-light/10 text-left transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold border shrink-0 ${cat.badgeClass}`}
                      >
                        {cat.shortLabel}
                      </span>
                      <span className="text-xs font-medium text-stone-700 group-hover:text-stone-900 truncate">
                        {cat.name}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-stone-500 group-hover:text-primary font-mono ml-2 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Recent Audit events */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Clock className="w-icon-md h-icon-md text-stone-600" />
              {t("admin.providerOverviewDashboard.changementsRecents")}
            </h2>
          </div>

          {recentAudit.length === 0 ? (
            <p className="text-xs text-stone-500 italic">
              {t(
                "admin.providerOverviewDashboard.aucuneModificationRecenteEnregistree",
              )}
            </p>
          ) : (
            <div className="space-y-3">
              {recentAudit.map((evt) => (
                <div
                  key={evt.id}
                  className="text-xs border-b border-stone-100 pb-2.5 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between text-micro text-stone-500 mb-0.5">
                    <span className="font-semibold text-stone-700">
                      {evt.providerName}
                    </span>
                    <span>
                      {formatDate(evt.timestamp, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-stone-600 text-micro leading-relaxed">
                    {evt.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
