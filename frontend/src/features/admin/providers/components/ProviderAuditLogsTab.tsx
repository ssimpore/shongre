import React, { useMemo } from 'react';
import { Clock, Shield, User, FileText } from 'lucide-react';
import { providerService } from '../../../../domains/providers/provider.service';

interface ProviderAuditLogsTabProps {
  providerId?: string;
}

export const ProviderAuditLogsTab: React.FC<ProviderAuditLogsTabProps> = ({ providerId }) => {
  const auditLogs = useMemo(() => {
    return providerService.getAuditHistory(providerId);
  }, [providerId]);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
        <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-600" />
          Journal d'Audit & Traçabilité des Modifications
        </h4>
        <span className="text-xs text-stone-500 font-mono">
          {auditLogs.length} événement(s)
        </span>
      </div>

      {auditLogs.length === 0 ? (
        <p className="text-xs text-stone-500 italic py-4 text-center">
          Aucun événement d'audit enregistré pour cette intégration.
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {auditLogs.map((log) => (
            <div key={log.id} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-stone-900">{log.action.toUpperCase()}</span>
                  {log.marketCode && (
                    <span className="text-micro font-bold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded">
                      Marché {log.marketCode}
                    </span>
                  )}
                </div>
                <p className="text-stone-600 text-micro">{log.details}</p>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end text-micro text-stone-500 shrink-0">
                <span className="font-medium text-stone-600">{log.actorName} ({log.actorRole})</span>
                <span>{new Date(log.timestamp).toLocaleString('fr-FR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
