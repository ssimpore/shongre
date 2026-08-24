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

interface ProviderHealthSimulatorProps {
  provider: Provider;
  configuration: ProviderConfiguration;
  onUpdated: () => void;
}

/** Operational health is evidence-based and cannot be changed by hand. */
export const ProviderHealthSimulator: React.FC<
  ProviderHealthSimulatorProps
> = ({ provider, configuration }) => {
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
      <section className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Santé fondée sur des preuves
            </h4>
            <p className="text-xs text-stone-500 mt-1 max-w-2xl">
              La santé vient d’un probe live ou d’un signal runtime. Elle ne
              peut pas être modifiée manuellement.
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border shrink-0 ${
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
              <AlertTriangle className="w-3.5 h-3.5" />
            ) : configuration.health === "healthy" ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
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
            <dt className="text-stone-500">Implémentation</dt>
            <dd className="font-bold text-stone-900 mt-1">
              {implementationLabel}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">Cycle de vie</dt>
            <dd className="font-bold text-stone-900 mt-1">
              {operational.lifecycle}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">Capacités implémentées</dt>
            <dd className="font-bold text-stone-900 mt-1">
              {operational.implementedCapabilities.length} /{" "}
              {operational.capabilities.length}
            </dd>
          </div>
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3">
            <dt className="text-stone-500">Dernière preuve</dt>
            <dd className="font-bold text-stone-900 mt-1">
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

      <section className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-stone-700" />
              Test d’intégration sûr
            </h4>
            <p className="text-xs text-stone-500 mt-1">
              Exécute uniquement un probe non destructif enregistré côté
              backend. Aucun paiement, email ou webhook fictif n’est créé.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRunTest}
            isLoading={isRunningTest}
            leftIcon={<Play className="w-3.5 h-3.5" />}
          >
            Lancer le diagnostic
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
                <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900">
                  {lastTestResult.success
                    ? "Preuve enregistrée"
                    : "Aucune preuve de santé enregistrée"}
                </p>
                <p className="text-xs text-stone-600 mt-1">
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
