import { Download, Eye, LoaderCircle, Search } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { services } from "../../api/client/service-registry";
import type { AdminAuditLogEntry } from "../../api/contracts/admin.contract";
import { Select } from "../../design-system";
import { Button } from "../../design-system/primitives/Button";
import { Modal } from "../../design-system/primitives/Modal";
import { StatePanel } from "../../design-system/primitives/StatePanel";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { formatLogTimestamp } from "../../utilities/formatters";
import { adminCatalogueFr } from "../../i18n/admin.catalogue.fr";

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export const AdminAuditLogsPage: React.FC = () => {
  const { t, locale } = useTranslation(adminCatalogueFr);
  usePageMeta({
    title: t("meta.adminAuditLogs.title"),
    description: t("meta.adminAuditLogs.description"),
    canonicalPath: "/admin/audit",
    noIndex: true,
  });

  const [logs, setLogs] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AdminAuditLogEntry | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    services.admin
      .getAuditLogs()
      .then((entries) => {
        if (!active) return;
        setLogs(entries);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Le registre d’audit est indisponible.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action))).sort(),
    [logs],
  );
  const filteredLogs = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    return logs.filter((log) => {
      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }
      if (!query) return true;
      return [log.actor, log.action, log.target].some((value) =>
        value.toLocaleLowerCase(locale).includes(query),
      );
    });
  }, [locale, logs, searchQuery, selectedAction]);

  const exportCsv = () => {
    const rows = [
      ["timestamp", "actor", "action", "target"],
      ...filteredLogs.map((log) => [
        log.timestamp,
        log.actor,
        log.action,
        log.target,
      ]),
    ];
    const blob = new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shongre-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-card border border-border-base bg-bg-surface p-6 shadow-xs md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("admin.adminAuditLogsPage.tracabiliteConformite")}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-main">
            {t("admin.adminAuditLogsPage.registreDAuditSecurite")}
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            {t(
              "admin.adminAuditLogsPage.enregistrementImmuableDesModificationsDe",
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={filteredLogs.length === 0}
          onClick={exportCsv}
          leftIcon={<Download className="h-icon-sm w-icon-sm" />}
        >
          Exporter CSV
        </Button>
      </header>

      <section className="flex flex-col gap-3 rounded-card border border-border-base bg-bg-surface p-4 shadow-xs sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">
            {t("admin.adminAuditLogsPage.rechercherDansLeRegistreD")}
          </span>
          <Search className="absolute left-3 top-1/2 h-icon-md w-icon-md -translate-y-1/2 text-text-disabled" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t(
              "admin.adminAuditLogsPage.rechercherParActeurActionCible",
            )}
            className="h-control-touch w-full rounded-control border border-border-base py-2 pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <Select
          className="w-auto"
          aria-label={t("admin.adminAuditLogsPage.filtrerLeJournalParType")}
          value={selectedAction}
          onChange={(event) => setSelectedAction(event.target.value)}
        >
          <option value="all">
            {t("admin.adminAuditLogsPage.toutesLesActionsDAudit")} (
            {logs.length})
          </option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>
      </section>

      {loading ? (
        <div
          className="flex min-h-48 items-center justify-center"
          role="status"
        >
          <LoaderCircle className="h-icon-lg w-icon-lg animate-spin text-primary" />
          <span className="ml-2 text-xs text-text-secondary">Chargement…</span>
        </div>
      ) : error ? (
        <StatePanel
          variant="error"
          title="Registre indisponible"
          description={error}
        />
      ) : (
        <div className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border-base bg-surface-muted font-bold text-text-emphasis">
                <tr>
                  <th scope="col" className="p-3">
                    Date et heure
                  </th>
                  <th scope="col" className="p-3">
                    Acteur
                  </th>
                  <th scope="col" className="p-3">
                    Action
                  </th>
                  <th scope="col" className="p-3">
                    Cible
                  </th>
                  <th scope="col" className="p-3 text-right">
                    Détail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-text-tertiary"
                    >
                      {t(
                        "admin.adminAuditLogsPage.aucunEvenementDAuditEnregistre",
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-soft">
                      <td className="whitespace-nowrap p-3 text-text-tertiary">
                        <time dateTime={log.timestamp} title={log.timestamp}>
                          {formatLogTimestamp(log.timestamp)}
                        </time>
                      </td>
                      <td className="p-3 font-semibold text-text-main">
                        {log.actor}
                      </td>
                      <td className="p-3 text-text-strong">{log.action}</td>
                      <td className="p-3 text-text-secondary">{log.target}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="rounded-sm p-1 text-text-tertiary hover:text-text-main"
                          aria-label={`Voir le détail de ${log.action}`}
                        >
                          <Eye className="h-icon-md w-icon-md" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title={t("admin.adminAuditLogsPage.detailDeLEvenementDAudit")}
        maxWidth="lg"
      >
        {selectedLog ? (
          <dl className="grid gap-3 text-xs sm:grid-cols-audit-row">
            <dt className="font-semibold text-text-secondary">Identifiant</dt>
            <dd className="break-all font-mono text-text-main">
              {selectedLog.id}
            </dd>
            <dt className="font-semibold text-text-secondary">Date</dt>
            <dd className="text-text-main">{selectedLog.timestamp}</dd>
            <dt className="font-semibold text-text-secondary">Acteur</dt>
            <dd className="text-text-main">{selectedLog.actor}</dd>
            <dt className="font-semibold text-text-secondary">Action</dt>
            <dd className="text-text-main">{selectedLog.action}</dd>
            <dt className="font-semibold text-text-secondary">Cible</dt>
            <dd className="text-text-main">{selectedLog.target}</dd>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
};
