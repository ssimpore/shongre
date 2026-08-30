import React, { useState } from "react";
import type { ProviderDiagnosticResult } from "@shongre/contracts/provider-platform";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Play,
  Terminal,
  XCircle,
} from "lucide-react";
import {
  Provider,
  ProviderConfiguration,
} from "../../../../domains/providers/provider.types";
import { services } from "../../../../api/client/service-registry";
import { Button } from "../../../../design-system/primitives/Button";
import { useToast } from "../../../../app/providers/ToastProvider";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface ProviderHealthSimulatorProps {
  provider: Provider;
  configuration: ProviderConfiguration;
  onUpdated: () => void;
}

/** Operational health is evidence-based and cannot be changed by hand. */
export const ProviderHealthSimulator: React.FC<
  ProviderHealthSimulatorProps
> = ({ provider, configuration }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [lastTestResult, setLastTestResult] =
    useState<ProviderDiagnosticResult | null>(null);

  const handleRunTest = async () => {
    setIsRunningTest(true);
    try {
      const result = await services.providerControlPlane.testProvider(
        provider.id,
      );
      setLastTestResult(result);
      result.success
        ? toast.success(`Diagnostic vérifié pour ${provider.name}.`)
        : toast.info(result.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Diagnostic indisponible.",
      );
    } finally {
      setIsRunningTest(false);
    }
  };

  const isDemo = configuration.environment === "demo";
  const operational = provider.operational;
  const implementationLabel =
    operational.adapterStatus === "IMPLEMENTED"
      ? "Adaptateur implémenté"
      : operational.adapterStatus === "DEMO_ONLY"
        ? "Adaptateur de démonstration uniquement"
        : "Aucun adaptateur de production";

  return (
    <div className="space-y-5">
      <section className="bg-bg-surface p-5 rounded-control border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Activity className="w-icon-md h-icon-md text-primary" />
              {t("admin.providerHealthSimulator.santeFondeeSurDesPreuves")}
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl">
              {t("admin.providerHealthSimulator.laSanteVientDUnProbeLiveOuDUn")}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-pill border shrink-0 ${
              isDemo || configuration.health === "unknown"
                ? "bg-stone-100 text-stone-700 border-stone-200"
                : configuration.health === "healthy"
                  ? "bg-success-surface text-success border-success-border"
                  : configuration.health === "degraded"
                    ? "bg-warning-surface text-warning border-warning-border"
                    : "bg-danger-surface text-danger border-danger-border"
            }`}
          >
            {isDemo || configuration.health === "unknown" ? (
              <AlertTriangle className="w-icon-sm h-icon-sm" />
            ) : configuration.health === "healthy" ? (
              <CheckCircle2 className="w-icon-sm h-icon-sm" />
            ) : (
              <XCircle className="w-icon-sm h-icon-sm" />
            )}
            {isDemo
              ? "Démo — non vérifié"
              : configuration.health === "unknown"
                ? "Santé inconnue"
                : configuration.health}
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">{t("admin.providerHealthSimulator.implementation")}</dt>
            <dd className="font-bold text-text-main mt-1">
              {implementationLabel}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">{t("admin.adminFeatureFlagsPage.cycleDeVie")}</dt>
            <dd className="font-bold text-text-main mt-1">
              {operational.lifecycle}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">{t("admin.providerHealthSimulator.capacitesImplementees")}</dt>
            <dd className="font-bold text-text-main mt-1">
              {operational.implementedCapabilities.length} /{" "}
              {operational.capabilities.length}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">{t("admin.providerHealthSimulator.dernierePreuve")}</dt>
            <dd className="font-bold text-text-main mt-1">
              {configuration.healthLastCheckedAt || "Aucune"}
            </dd>
          </div>
        </dl>

        {operational.blockers.length > 0 && (
          <div className="rounded-lg border border-warning-border bg-warning-surface p-3">
            <p className="text-xs font-bold text-warning">Blocages connus</p>
            <ul className="mt-2 space-y-1 text-xs text-stone-700 list-disc pl-4">
              {operational.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="bg-bg-surface p-5 rounded-control border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
              <Terminal className="w-icon-md h-icon-md text-stone-700" />
              {t("admin.providerHealthSimulator.testDIntegrationSur")}
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              {t("admin.providerHealthSimulator.executeUniquementUnProbeNonDestructifEnregistreCoteBackendAucun")}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRunTest}
            isLoading={isRunningTest}
            leftIcon={<Play className="w-icon-sm h-icon-sm" />}
          >
            {t("admin.providerHealthSimulator.lancerLeDiagnostic")}
          </Button>
        </div>

        {lastTestResult && (
          <div
            className={`rounded-lg border p-4 ${
              lastTestResult.success
                ? "border-success-border bg-success-surface"
                : "border-stone-200 bg-stone-50"
            }`}
            role="status"
          >
            <div className="flex items-start gap-2">
              {lastTestResult.success ? (
                <CheckCircle2 className="w-icon-md h-icon-md text-success mt-0.5" />
              ) : (
                <AlertTriangle className="w-icon-md h-icon-md text-warning mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-text-main">
                  {lastTestResult.success
                    ? "Preuve enregistrée"
                    : "Aucune preuve de santé enregistrée"}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  {lastTestResult.message}
                </p>
                <p className="text-micro text-stone-500 mt-2 font-mono">
                  {lastTestResult.evidence} · {lastTestResult.latencyMs} ms
                </p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
