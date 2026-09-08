import type {
  ProviderControlPlaneSnapshot,
  ProviderDiagnosticResult,
} from "@shongre/contracts/provider-platform";
import { Activity, Cpu, ExternalLink, RefreshCw } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { services } from "../../../api/client/service-registry";
import { useToast } from "../../../app/providers/ToastProvider";
import { Badge } from "../../../design-system/primitives/Badge";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import { StatePanel } from "../../../design-system/primitives/StatePanel";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useTranslation } from "../../../i18n/I18nProvider";

export const AdminProvidersPage: React.FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [snapshot, setSnapshot] = useState<ProviderControlPlaneSnapshot | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [testingProviderId, setTestingProviderId] = useState<string | null>(
    null,
  );
  const [diagnostic, setDiagnostic] = useState<ProviderDiagnosticResult | null>(
    null,
  );
  usePageMeta({
    title: t("meta.adminProviders.title"),
    description: t("meta.adminProviders.description"),
    canonicalPath: "/admin/fournisseurs",
    noIndex: true,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      setSnapshot(await services.providerControlPlane.getSnapshot());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Le control plane est indisponible.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runDiagnostic = async (providerId: string) => {
    setTestingProviderId(providerId);
    setDiagnostic(null);
    try {
      const result =
        await services.providerControlPlane.testProvider(providerId);
      setDiagnostic(result);
      toast.info(result.message);
    } catch (caught) {
      toast.error(
        caught instanceof Error ? caught.message : "Diagnostic indisponible.",
      );
    } finally {
      setTestingProviderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-card border border-border-base bg-bg-surface p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Intégrations serveur
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-text-main">
            <Cpu className="h-icon-xl w-icon-xl text-primary" />
            {t("admin.adminProvidersPage.fournisseursIntegrationsExternes")}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Inventaire, configuration effective et santé rapportés par le
            backend.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          leftIcon={<RefreshCw className="h-icon-sm w-icon-sm" />}
        >
          Actualiser
        </Button>
      </header>

      {error ? (
        <StatePanel
          variant="error"
          title="Control plane indisponible"
          description={error}
          action={<Button onClick={() => void load()}>Réessayer</Button>}
        />
      ) : !snapshot ? (
        <div
          className="min-h-48 animate-pulse rounded-card bg-bg-subtle"
          role="status"
        />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Découverts", snapshot.summary.discovered],
              ["Implémentés", snapshot.summary.implemented],
              ["Actifs", snapshot.summary.active],
              ["Prêts production", snapshot.summary.productionReady],
              [
                "Capacités critiques manquantes",
                snapshot.summary.missingCriticalCapabilities,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
              >
                <p className="text-micro font-bold uppercase text-text-tertiary">
                  {label}
                </p>
                <p className="mt-1 text-xl font-bold text-text-main">{value}</p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border-base bg-surface-muted font-bold text-text-emphasis">
                  <tr>
                    <th scope="col" className="p-3">
                      Fournisseur
                    </th>
                    <th scope="col" className="p-3">
                      Catégorie
                    </th>
                    <th scope="col" className="p-3">
                      Cycle de vie
                    </th>
                    <th scope="col" className="p-3">
                      Santé
                    </th>
                    <th scope="col" className="p-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {snapshot.providers.map((entry) => (
                    <tr key={entry.definition.id}>
                      <td className="p-3">
                        <p className="font-bold text-text-main">
                          {entry.definition.displayName}
                        </p>
                        <p className="font-mono text-micro text-text-tertiary">
                          {entry.definition.id}
                        </p>
                      </td>
                      <td className="p-3 text-text-secondary">
                        {entry.definition.category}
                      </td>
                      <td className="p-3">
                        <Badge variant="neutral">
                          {entry.definition.lifecycle}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            entry.runtime.health === "HEALTHY"
                              ? "success"
                              : "warning"
                          }
                        >
                          {entry.runtime.health}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={
                              testingProviderId === entry.definition.id
                            }
                            onClick={() =>
                              void runDiagnostic(entry.definition.id)
                            }
                            leftIcon={
                              <Activity className="h-icon-sm w-icon-sm" />
                            }
                          >
                            Tester
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            to={`/admin/fournisseurs/${entry.definition.id}`}
                            rightIcon={
                              <ExternalLink className="h-icon-sm w-icon-sm" />
                            }
                          >
                            Détail
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <Modal
        isOpen={diagnostic !== null}
        onClose={() => setDiagnostic(null)}
        title="Résultat du diagnostic"
        maxWidth="lg"
      >
        {diagnostic ? (
          <div className="space-y-4 text-xs">
            <Badge variant={diagnostic.success ? "success" : "warning"}>
              {diagnostic.health}
            </Badge>
            <p className="text-text-secondary">{diagnostic.message}</p>
            <ul className="space-y-2">
              {diagnostic.checks.map((check) => (
                <li
                  key={check.name}
                  className="rounded-control border border-border-base p-3"
                >
                  <strong>
                    {check.status} · {check.name}
                  </strong>
                  <p className="mt-1 text-text-secondary">{check.message}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
