import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import { providerService } from "../../../../domains/providers/provider.service";
import { roleLabel } from "../../../../security/roles.config";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { PROVIDER_AUDIT_ACTION_LABELS } from "../../../../domains/providers/provider-capabilities";
import { useRegionalFormatters } from "../../../../hooks/useRegionalFormatters";

interface ProviderAuditLogsTabProps {
  providerId?: string;
}

export const ProviderAuditLogsTab: React.FC<ProviderAuditLogsTabProps> = ({
  providerId,
}) => {
  const { t } = useTranslation();
  const { formatDateTime } = useRegionalFormatters();
  const auditLogs = useMemo(() => {
    return providerService.getAuditHistory(providerId);
  }, [providerId]);

  return (
    <div className="bg-bg-surface rounded-control border border-stone-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <h4 className="text-sm font-bold text-text-main flex items-center gap-2">
          <Clock className="w-icon-md h-icon-md text-text-secondary" />
          {t("admin.providerAuditLogsTab.journalDAuditTracabiliteDes")}
        </h4>
        <span className="text-xs text-stone-500 font-mono">
          {auditLogs.length} {t("admin.providerAuditLogsTab.evenementS")}
        </span>
      </div>

      {auditLogs.length === 0 ? (
        <p className="text-xs text-stone-500 italic py-4 text-center">
          {t("admin.providerAuditLogsTab.aucunEvenementDAuditEnregistre")}
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-text-main">
                    {PROVIDER_AUDIT_ACTION_LABELS[log.action]}
                  </span>
                  {log.marketCode && (
                    <span className="text-micro font-bold bg-info-surface text-info px-1.5 py-0.5 rounded">
                      {t("invoicing.product.previewMarket")} {log.marketCode}
                    </span>
                  )}
                </div>
                <p className="text-text-secondary text-micro">{log.details}</p>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end text-micro text-stone-500 shrink-0">
                <span className="font-medium text-text-secondary">
                  {log.actorName} ({roleLabel(log.actorRole)})
                </span>
                <span>{formatDateTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
