import React, { useState } from 'react';
import { taxonomyAdminRepository } from '../../../../repositories/taxonomy.repository';
import { Search, History, Clock, User } from 'lucide-react';
import { roleLabel } from '../../../../security/roles.config';
import { useTranslation } from '../../../../i18n/I18nProvider';

export const TaxonomyAuditTab: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const logs = taxonomyAdminRepository.getAuditHistory();

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      log.nodeLabel.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actor.name.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>{t('admin.taxonomyAuditTab.journalDAuditTracabiliteDes')}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">{t('admin.taxonomyAuditTab.historiqueChronologiqueDeToutesLes')}</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('admin.taxonomyAuditTab.filtrerLesLogsDAudit')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-control-md pl-9 pr-3 bg-bg-base border border-border-base rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-border-base shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-bg-subtle/60 border-b border-border-subtle text-stone-500 uppercase tracking-wider text-micro">
                <th scope="col" className="py-3 px-4">Date & Heure</th>
                <th scope="col" className="py-3 px-4">Rubrique Cible</th>
                <th scope="col" className="py-3 px-4">Action</th>
                <th scope="col" className="py-3 px-4">{t('admin.taxonomyAuditTab.operateur')}</th>
                <th scope="col" className="py-3 px-4">{t('admin.taxonomyAuditTab.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-stone-500">{t('admin.taxonomyAuditTab.aucunEvenementDAuditTrouve')}</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-subtle/40 transition-colors">
                    <td className="py-3 px-4 text-stone-500 font-mono flex items-center gap-1.5 whitespace-nowrap">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-900">{log.nodeLabel}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-stone-700 font-medium">
                        <User className="w-3.5 h-3.5 text-stone-400" />
                        <span>{log.actor.name}</span>
                        <span className="text-micro text-stone-500 font-mono">({roleLabel(log.actor.role)})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-500 max-w-sm truncate">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
