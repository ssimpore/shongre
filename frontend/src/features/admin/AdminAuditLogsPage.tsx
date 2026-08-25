import { Modal } from "../../design-system/primitives/Modal";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import React, { useState, useEffect } from "react";
import { Search, Download, Trash2, Eye } from "lucide-react";
import { useToast } from "../../app/providers/ToastProvider";
import { auditService } from "../../security/audit.service";
import { SecurityAuditLog, auditActionLabel } from "../../types";
import { roleLabel } from "../../security/roles.config";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatLogTimestamp } from "../../utilities/formatters";
import {
  auditFieldLabel,
  formatAuditDateTime,
  formatAuditValue,
  isAuditRecord,
  isSensitiveAuditField,
} from "../../security/audit-presentation";

interface AuditValueViewProps {
  value: unknown;
  field?: string;
}

const AuditValueView: React.FC<AuditValueViewProps> = ({ value, field }) => {
  if (field && isSensitiveAuditField(field)) {
    return <span className="text-stone-600">Valeur masquée</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0)
      return <span className="text-stone-500">Aucune donnée</span>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <span
            key={`${String(item)}-${index}`}
            className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-micro text-stone-700"
          >
            {formatAuditValue(item, field)}
          </span>
        ))}
      </div>
    );
  }

  if (isAuditRecord(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <span className="text-stone-500">Aucune donnée</span>;
    }
    return (
      <dl className="space-y-2">
        {entries.map(([key, item]) => (
          <div
            key={key}
            className="grid gap-1 rounded-control border border-stone-200 bg-white p-2 sm:grid-cols-audit-row sm:gap-3"
          >
            <dt className="font-semibold text-stone-600">
              {auditFieldLabel(key)}
            </dt>
            <dd className="min-w-0 text-stone-900">
              <AuditValueView value={item} field={key} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <span className="text-stone-900">{formatAuditValue(value, field)}</span>
  );
};

export const AdminAuditLogsPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminAuditLogs.title"),
    description: t("meta.adminAuditLogs.description"),
    canonicalPath: "/admin/audit",
    noIndex: true,
  });

  const toast = useToast();
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const loadLogs = () => {
    setLogs(auditService.getLogs());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportCsv = () => {
    const csv = auditService.exportLogsAsCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `shongre_audit_log_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Le fichier CSV a été téléchargé avec succès.");
  };

  const handleConfirmClear = () => {
    auditService.clearLogs();
    loadLogs();
    setIsClearModalOpen(false);
    toast.info("Le registre d'audit a été réinitialisé.");
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== "all" && log.action !== selectedAction) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        log.action.toLowerCase().includes(q) ||
        auditActionLabel(log.action).toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.targetName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("admin.adminAuditLogsPage.tracabiliteConformite")}
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">
              {t("admin.adminAuditLogsPage.conformiteRgpdSecuritePlateforme")}
            </span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            {t("admin.adminAuditLogsPage.registreDAuditSecurite")}
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            {t(
              "admin.adminAuditLogsPage.enregistrementImmuableDesModificationsDe",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsClearModalOpen(true)}
            className="text-xs text-danger hover:bg-danger-surface"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t("admin.adminAuditLogsPage.reinitialiser")}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(
              "admin.adminAuditLogsPage.rechercherParActeurActionCible",
            )}
            aria-label={t("admin.adminAuditLogsPage.rechercherDansLeRegistreD")}
            className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-control focus:outline-none focus:ring-1 focus:ring-primary h-control-touch"
          />
        </div>

        <select
          aria-label={t("admin.adminAuditLogsPage.filtrerLeJournalParType")}
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="py-2 px-3 text-xs border border-stone-200 rounded-control focus:outline-none focus:ring-1 focus:ring-primary bg-white h-control-touch"
        >
          <option value="all">
            Toutes les actions d'audit ({logs.length})
          </option>
          {uniqueActions.map((act) => (
            <option key={act} value={act}>
              {auditActionLabel(act)}
            </option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-100 text-stone-700 font-bold border-b border-stone-200">
              <tr>
                <th scope="col" className="p-3">
                  Date et heure
                </th>
                <th scope="col" className="p-3">
                  Acteur (Initiateur)
                </th>
                <th scope="col" className="p-3">
                  {t("admin.adminAuditLogsPage.actionSysteme")}
                </th>
                <th scope="col" className="p-3">
                  Cible / Ressource
                </th>
                <th scope="col" className="p-3">
                  {t("admin.adminAuditLogsPage.detailsMotif")}
                </th>
                <th scope="col" className="p-3 text-right">
                  {t("admin.adminAuditLogsPage.detail")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    {t(
                      "admin.adminAuditLogsPage.aucunEvenementDAuditEnregistre",
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-stone-50 transition-colors"
                  >
                    <td
                      className="p-3 text-xs text-stone-500 whitespace-nowrap"
                      title={`Horodatage ISO : ${log.timestamp}`}
                    >
                      {formatLogTimestamp(log.timestamp)}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-stone-900">
                        {log.actorName}
                      </div>
                      <div className="text-micro text-stone-500">
                        {roleLabel(log.actorRole)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div
                        className="font-semibold text-stone-900"
                        title={`Code action : ${log.action}`}
                      >
                        {auditActionLabel(log.action)}
                      </div>
                    </td>
                    <td
                      className="p-3 text-stone-800"
                      title={
                        log.targetId
                          ? `Identifiant cible : ${log.targetId}`
                          : undefined
                      }
                    >
                      {log.targetName || "Ressource technique"}
                    </td>
                    <td
                      className="p-3 text-stone-600 max-w-xs truncate"
                      title={log.details}
                    >
                      {log.details}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="text-stone-500 hover:text-stone-900 p-1 rounded-sm"
                        aria-label={t(
                          "admin.adminAuditLogsPage.voirLePayloadDe",
                          { action: auditActionLabel(log.action) },
                        )}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Détail de l’événement d’audit"
        maxWidth="lg"
      >
        {selectedLog && (
          <div className="space-y-5">
            <dl className="grid gap-x-4 gap-y-3 text-xs sm:grid-cols-audit-row">
              <dt className="font-semibold text-stone-600">Date et heure</dt>
              <dd className="text-stone-900">
                <time
                  dateTime={selectedLog.timestamp}
                  title={`Horodatage ISO : ${selectedLog.timestamp}`}
                >
                  {formatAuditDateTime(selectedLog.timestamp)}
                </time>
              </dd>

              <dt className="font-semibold text-stone-600">Acteur</dt>
              <dd className="text-stone-900">{selectedLog.actorName}</dd>

              <dt className="font-semibold text-stone-600">
                {t("admin.adminAuditLogsPage.role")}
              </dt>
              <dd className="text-stone-900">
                {roleLabel(selectedLog.actorRole)}
              </dd>

              <dt className="font-semibold text-stone-600">Action</dt>
              <dd className="text-stone-900">
                {auditActionLabel(selectedLog.action)}
              </dd>

              {(selectedLog.targetName || selectedLog.targetId) && (
                <>
                  <dt className="font-semibold text-stone-600">Cible</dt>
                  <dd className="text-stone-900">
                    {selectedLog.targetName || "Ressource technique"}
                  </dd>
                </>
              )}

              {selectedLog.market && (
                <>
                  <dt className="font-semibold text-stone-600">Marché</dt>
                  <dd className="text-stone-900">
                    {formatAuditValue(selectedLog.market, "marketCode")}
                  </dd>
                </>
              )}
            </dl>

            <section className="space-y-1.5 text-xs">
              <h3 className="font-semibold text-stone-700">
                {t("admin.adminAuditLogsPage.details")}
              </h3>
              <p className="rounded-control bg-stone-50 p-3 leading-relaxed text-stone-700">
                {selectedLog.details}
              </p>
            </section>

            {selectedLog.previousValue !== undefined && (
              <section className="space-y-1.5 text-xs">
                <h3 className="font-semibold text-stone-700">
                  {t("admin.adminAuditLogsPage.etatPrecedent")}
                </h3>
                <div className="rounded-control bg-stone-50 p-2">
                  <AuditValueView value={selectedLog.previousValue} />
                </div>
              </section>
            )}

            {selectedLog.newValue !== undefined && (
              <section className="space-y-1.5 text-xs">
                <h3 className="font-semibold text-stone-700">
                  {t("admin.adminAuditLogsPage.nouvelEtat")}
                </h3>
                <div className="rounded-control bg-stone-50 p-2">
                  <AuditValueView value={selectedLog.newValue} />
                </div>
              </section>
            )}

            <details className="rounded-control border border-stone-200 bg-white text-xs">
              <summary className="cursor-pointer px-3 py-2 font-semibold text-stone-600">
                Données techniques
              </summary>
              <dl className="grid gap-2 border-t border-stone-200 p-3 sm:grid-cols-audit-row">
                <dt className="text-stone-500">Événement</dt>
                <dd className="break-all font-mono text-micro text-stone-700">
                  {selectedLog.id}
                </dd>
                <dt className="text-stone-500">Identifiant acteur</dt>
                <dd className="break-all font-mono text-micro text-stone-700">
                  {selectedLog.actorId}
                </dd>
                {selectedLog.targetId && (
                  <>
                    <dt className="text-stone-500">Identifiant cible</dt>
                    <dd className="break-all font-mono text-micro text-stone-700">
                      {selectedLog.targetId}
                    </dd>
                  </>
                )}
                <dt className="text-stone-500">Code action</dt>
                <dd className="break-all font-mono text-micro text-stone-700">
                  {selectedLog.action}
                </dd>
                {selectedLog.ipAddress && (
                  <>
                    <dt className="text-stone-500">Adresse IP</dt>
                    <dd className="break-all font-mono text-micro text-stone-700">
                      {selectedLog.ipAddress}
                    </dd>
                  </>
                )}
              </dl>
            </details>

            <div className="pt-3 border-t border-stone-200 text-right">
              <Button
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
        title={t("admin.adminAuditLogsPage.reinitialiserLeRegistreDAudit")}
        message="Cette action effacera l'historique des journaux d'audit enregistrés pour cette session démo."
        confirmText="Réinitialiser les logs"
        variant="warning"
      />
    </div>
  );
};
