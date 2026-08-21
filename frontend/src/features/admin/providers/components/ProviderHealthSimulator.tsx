import React, { useState } from "react";
import {
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
} from "lucide-react";
import {
  Provider,
  ProviderConfiguration,
  ProviderHealthStatus,
  ProviderTestResult,
} from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { Button } from "../../../../design-system/primitives/Button";
import { useToast } from "../../../../app/providers/ToastProvider";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface ProviderHealthSimulatorProps {
  provider: Provider;
  configuration: ProviderConfiguration;
  onUpdated: () => void;
}

export const ProviderHealthSimulator: React.FC<
  ProviderHealthSimulatorProps
> = ({ provider, configuration, onUpdated }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<
    "healthy" | "missing_credentials" | "timeout" | "invalid_config"
  >("healthy");
  const [lastTestResult, setLastTestResult] =
    useState<ProviderTestResult | null>(null);

  const handleRunTest = async () => {
    setIsRunningTest(true);
    try {
      const result = await providerService.testProvider(
        provider.id,
        selectedScenario,
      );
      setLastTestResult(result);
      if (result.success) {
        toast.success(
          `Test réussi pour ${provider.name} (${result.latencyMs} ms).`,
        );
      } else {
        toast.error(`Échec du test : ${result.message}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur inattendue.");
    } finally {
      setIsRunningTest(false);
    }
  };

  const handleSetHealth = async (health: ProviderHealthStatus) => {
    try {
      await providerService.setProviderHealth(
        provider.id,
        health,
        `Simulation d'état de santé par l'administrateur (${health})`,
      );
      toast.success(`État de santé mis à jour : ${health}.`);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Simulated Health State Switcher */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-success" />
              {t("admin.providerHealthSimulator.etatDeSanteDisponibiliteEn")}
            </h4>
            <p className="text-xs text-stone-500">
              {t("admin.providerHealthSimulator.controlezLEtatDeSante")}
            </p>
          </div>

          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              configuration.health === "healthy"
                ? "bg-success-surface text-success border-success-border"
                : configuration.health === "degraded"
                  ? "bg-warning-surface text-warning border-warning-border"
                  : "bg-danger-surface text-danger border-danger-border"
            }`}
          >
            {configuration.health === "healthy" && "● Opérationnel"}
            {configuration.health === "degraded" && "▲ Dégradé"}
            {configuration.health === "unavailable" && "■ Indisponible"}
            {configuration.health === "unknown" && "Inconnu"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => handleSetHealth("healthy")}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
              configuration.health === "healthy"
                ? "bg-success-surface/80 border-success-border ring-2 ring-emerald-500/20"
                : "bg-stone-50 hover:bg-stone-100 border-stone-200"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div>
              <span className="font-bold text-xs text-stone-900 block">
                {t("admin.providerHealthSimulator.operationnelHealthy")}
              </span>
              <span className="text-micro text-stone-500">
                {t(
                  "admin.providerHealthSimulator.toutesLesRequetesAboutissent",
                )}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSetHealth("degraded")}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
              configuration.health === "degraded"
                ? "bg-warning-surface/80 border-warning-border ring-2 ring-amber-500/20"
                : "bg-stone-50 hover:bg-stone-100 border-stone-200"
            }`}
          >
            <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
            <div>
              <span className="font-bold text-xs text-stone-900 block">
                {t("admin.providerHealthSimulator.degradeDegraded")}
              </span>
              <span className="text-micro text-stone-500">
                {t(
                  "admin.providerHealthSimulator.ralentissementsOuEchecsPartiels",
                )}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSetHealth("unavailable")}
            className={`p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
              configuration.health === "unavailable"
                ? "bg-danger-surface/80 border-danger-border ring-2 ring-rose-500/20"
                : "bg-stone-50 hover:bg-stone-100 border-stone-200"
            }`}
          >
            <XCircle className="w-5 h-5 text-danger shrink-0" />
            <div>
              <span className="font-bold text-xs text-stone-900 block">
                Indisponible (Unavailable)
              </span>
              <span className="text-micro text-stone-500">
                {t(
                  "admin.providerHealthSimulator.basculeImmediateSurLeSecours",
                )}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Deterministic Testing Tool */}
      <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-2 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-stone-700" />
          {t(
            "admin.providerHealthSimulator.simulateurDeTestsDeterministesDiagnostic",
          )}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {t("admin.providerHealthSimulator.scenarioDeTestAExecuter")}
            </label>
            <select
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-control border border-stone-200 bg-stone-50 text-stone-800 font-medium h-control-touch"
            >
              <option value="healthy">
                {t(
                  "admin.providerHealthSimulator.succesNominalReponseValideHttps",
                )}
              </option>
              <option value="missing_credentials">
                {t("admin.providerHealthSimulator.identifiantsOuCleSecreteNon")}
              </option>
              <option value="timeout">
                {t(
                  "admin.providerHealthSimulator.depassementDeDelaiTimeoutHttp",
                )}
              </option>
              <option value="invalid_config">
                {t(
                  "admin.providerHealthSimulator.parametresRejetesParLePartenaire",
                )}
              </option>
            </select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="primary"
              size="md"
              isLoading={isRunningTest}
              onClick={handleRunTest}
              leftIcon={<Play className="w-3.5 h-3.5" />}
              className="w-full text-xs font-bold"
            >
              {t("admin.providerHealthSimulator.executerLeTestDeDiagnostic")}
            </Button>
          </div>
        </div>

        {/* Test results console */}
        {lastTestResult && (
          <div
            className={`p-4 rounded-xl border font-mono text-xs space-y-2 ${
              lastTestResult.success
                ? "bg-emerald-950 text-emerald-200 border-emerald-800"
                : "bg-stone-900 text-rose-300 border-stone-800"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-bold flex items-center gap-2">
                {lastTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                {lastTestResult.success
                  ? "RÉSULTAT : SUCCÈS"
                  : "RÉSULTAT : ÉCHEC"}
              </span>
              <span className="text-micro text-stone-500">
                Latence : {lastTestResult.latencyMs} ms
              </span>
            </div>

            <p className="text-xs">{lastTestResult.message}</p>

            <div className="pt-2 border-t border-white/10 text-micro text-stone-500">
              <pre className="overflow-x-auto text-micro">
                {JSON.stringify(lastTestResult.diagnostics, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
