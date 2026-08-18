import { Modal } from '../../design-system/primitives/Modal';
import { ConfirmModal } from '../../design-system/primitives/ConfirmModal';
import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Shield,
  Download,
  Trash2,
  Calendar,
  User,
  KeyRound,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../app/providers/AuthProvider';
import { useToast } from '../../app/providers/ToastProvider';
import { auditService } from '../../security/audit.service';
import { SecurityAuditLog, auditActionLabel } from '../../types';
import { roleLabel } from '../../security/roles.config';
import { Button } from '../../design-system/primitives/Button';

export const AdminAuditLogsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [logs, setLogs] = useState<SecurityAuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
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
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shongre_audit_log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Le fichier CSV a été téléchargé avec succès.');
  };

  const handleConfirmClear = () => {
    auditService.clearLogs();
    loadLogs();
    setIsClearModalOpen(false);
    toast.info('Le registre d\'audit a été réinitialisé.');
  };

  const filteredLogs = logs.filter((log) => {
    if (selectedAction !== 'all' && log.action !== selectedAction) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        log.action.toLowerCase().includes(q) ||
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
              Traçabilité & Conformité
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-xs text-stone-500 font-medium">Conformité RGPD & Sécurité plateforme</span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight">
            Registre d'Audit Sécurité
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Enregistrement immuable des modifications de permissions, suspensions, modérations et opérations privilégiées.
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
            Réinitialiser
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
            placeholder="Rechercher par acteur, action, cible, détails..."
            aria-label="Rechercher dans le registre d'audit"
            className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          aria-label="Filtrer le journal par type d'action"
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="py-2 px-3 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white"
        >
          <option value="all">Toutes les actions d'audit ({logs.length})</option>
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
                <th className="p-3">Horodatage (UTC)</th>
                <th className="p-3">Acteur (Initiateur)</th>
                <th className="p-3">Action Système</th>
                <th className="p-3">Cible / Ressource</th>
                <th className="p-3">Détails & Motif</th>
                <th className="p-3 text-right">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500">
                    Aucun événement d'audit enregistré correspondant.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 font-mono text-xs text-stone-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-stone-900">{log.actorName}</div>
                      <div className="text-micro text-stone-500">{roleLabel(log.actorRole)}</div>
                    </td>
                    {/* Human label leads; the raw key stays underneath because this
                        is a forensic table and operators filter and grep by it. */}
                    <td className="p-3">
                      <div className="font-semibold text-stone-900">{auditActionLabel(log.action)}</div>
                      <div className="text-micro text-stone-500 font-mono">{log.action}</div>
                    </td>
                    <td className="p-3 text-stone-800">
                      {log.targetName || log.targetId || '-'}
                    </td>
                    <td className="p-3 text-stone-600 max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-stone-500 hover:text-stone-900 p-1 rounded-sm"
                        title="Voir le payload complet"
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
        title={`Enregistrement d'Audit #${selectedLog?.id}`}
        
      >
        {selectedLog && (
            <div className="space-y-4">
            <div className="space-y-2 text-xs">
              <div>
                <strong className="text-stone-700">Horodatage :</strong> {selectedLog.timestamp}
              </div>
              <div>
                <strong className="text-stone-700">Acteur :</strong> {selectedLog.actorName} (ID: {selectedLog.actorId})
              </div>
              <div>
                <strong className="text-stone-700">Rôle :</strong> {roleLabel(selectedLog.actorRole)}
              </div>
              <div>
                <strong className="text-stone-700">Action :</strong> {selectedLog.action}
              </div>
              <div>
                <strong className="text-stone-700">Détails :</strong> {selectedLog.details}
              </div>

              {selectedLog.previousValue && (
                <div>
                  <strong className="text-stone-700">État précédent :</strong>
                  <pre className="mt-1 p-2 bg-stone-100 rounded-sm font-mono text-micro overflow-x-auto">
                    {JSON.stringify(selectedLog.previousValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <strong className="text-stone-700">Nouvel état :</strong>
                  <pre className="mt-1 p-2 bg-stone-100 rounded-sm font-mono text-micro overflow-x-auto">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-200 text-right">
              <Button size="sm" onClick={() => setSelectedLog(null)} className="text-xs">
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
        title="Réinitialiser le registre d'audit ?"
        message="Cette action effacera l'historique des journaux d'audit enregistrés pour cette session démo."
        confirmText="Réinitialiser les logs"
        variant="warning"
      />
    </div>
  );
};
