import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck,
  Globe,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  Provider,
  ProviderConfiguration,
} from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { PROVIDER_CATEGORIES } from "../../../../domains/providers/provider-capabilities";
import { Button } from "../../../../design-system/primitives/Button";
import { useTranslation } from "../../../../i18n/I18nProvider";

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
  // Key Metrics
  const metrics = useMemo(() => {
    let activeCount = 0;
    let disabledCount = 0;
    let requiresActionCount = 0;
    let degradedCount = 0;
    let totalOverrides = 0;

    providers.forEach((p) => {
      const cfg = configurations[p.id];
      if (cfg) {
        if (cfg.enabled) {
          activeCount++;
          if (cfg.health === "degraded" || cfg.health === "unavailable") {
            degradedCount++;
          }
          if (cfg.credentialStatus === "not_configured") {
            requiresActionCount++;
          }
        } else {
          disabledCount++;
        }
        totalOverrides += Object.keys(cfg.marketOverrides || {}).length;
      } else {
        requiresActionCount++;
      }
    });

    return {
      total: providers.length,
      active: activeCount,
      disabled: disabledCount,
      requiresAction: requiresActionCount,
      degraded: degradedCount,
      overrides: totalOverrides,
    };
  }, [providers, configurations]);

  // Core Platform Capabilities to monitor in overview
  const criticalCapabilities: Array<{
    capability: any;
    label: string;
    description: string;
  }> = [
    {
      capability: "payment.card",
      label: "Paiement en Ligne (Séquestre)",
      description: "Achat direct & acomptes sécurisés",
    },
    {
      capability: "delivery.relay_point",
      label: "Livraison Point Relais",
      description: "Mondial Relay & casiers Lockers",
    },
    {
      capability: "delivery.home_delivery",
      label: "Livraison Domicile",
      description: "La Poste Colissimo standard",
    },
    {
      capability: "auth.oauth_google",
      label: "Connexion Google SSO",
      description: "OAuth 2.0 Identity Services",
    },
    {
      capability: "email.transactional",
      label: "Emails Transactionnels",
      description: "Notifications & confirmations d'achat",
    },
    {
      capability: "ai.listing_assistance",
      label: "Assistant IA Vendeurs",
      description: "Google Gemini 2.5 Flash",
    },
    {
      capability: "verification.business",
      label: "Contrôle SIRET Entreprises",
      description: "INSEE & Pappers KYB",
    },
    {
      capability: "maps.display",
      label: "Cartographie & BAN",
      description: "OpenStreetMap & Base Adresse Nationale",
    },
  ];

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
              <Cpu className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.total}
            </span>
            <span className="ml-2 text-xs font-medium text-success">
              {metrics.active} actives
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
                metrics.degraded === 0
                  ? "bg-success-surface text-success"
                  : "bg-warning-surface text-warning"
              }`}
            >
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.degraded === 0
                ? "100%"
                : `${metrics.total - metrics.degraded}/${metrics.total}`}
            </span>
            <span
              className={`ml-2 text-xs font-medium ${
                metrics.degraded === 0 ? "text-success" : "text-warning"
              }`}
            >
              {metrics.degraded === 0
                ? "Tous opérationnels"
                : `${metrics.degraded} dégradé(s)`}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider min-w-0">
              Surcharges Territoires
            </span>
            <span className="p-2 rounded-lg bg-info-surface text-info">
              <Globe className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-stone-900">
              {metrics.overrides}
            </span>
            <span className="ml-2 text-xs font-medium text-stone-500">
              {t("admin.providerOverviewDashboard.heritageFranceActif")}
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
              <AlertTriangle className="w-4 h-4" />
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
                : "Identifiants en attente"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Critical Platform Capabilities Matrix (France Baseline) */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-success" />
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
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs h-control-sm"
            >
              {t("admin.providerOverviewDashboard.matriceMultiMarches")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {criticalCapabilities.map((item) => {
            const health = providerService.resolveCapabilityHealth(
              item.capability,
              "FR",
            );
            const isOperational = health.status === "operational";
            const isDegraded = health.status === "degraded";
            const isUnavailable = health.status === "unavailable";

            return (
              <div
                key={item.capability}
                className="p-3 rounded-lg border border-stone-200 bg-stone-50/60 hover:bg-stone-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-900 truncate">
                      {item.label}
                    </span>
                    {isOperational && (
                      <span className="flex items-center gap-1 text-micro font-bold text-success bg-success-surface px-1.5 py-0.5 rounded-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        Actif
                      </span>
                    )}
                    {isDegraded && (
                      <span className="flex items-center gap-1 text-micro font-bold text-warning bg-warning-surface px-1.5 py-0.5 rounded-sm">
                        <AlertTriangle className="w-3 h-3" />
                        {t("admin.providerOverviewDashboard.degrade")}
                      </span>
                    )}
                    {isUnavailable && (
                      <span className="flex items-center gap-1 text-micro font-bold text-danger bg-danger-surface px-1.5 py-0.5 rounded-sm">
                        <XCircle className="w-3 h-3" />
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-micro text-stone-500 mb-2">
                    {item.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-micro">
                  <span className="text-stone-500">Prestataire :</span>
                  <Link
                    to={`/admin/fournisseurs/${health.activeProviderId}`}
                    className="font-semibold text-primary hover:underline truncate max-w-[140px]"
                  >
                    {health.activeProviderName}
                  </Link>
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
              <Layers className="w-4 h-4 text-primary" />
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
              <Clock className="w-4 h-4 text-stone-600" />
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
                      {new Date(evt.timestamp).toLocaleDateString("fr-FR", {
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
