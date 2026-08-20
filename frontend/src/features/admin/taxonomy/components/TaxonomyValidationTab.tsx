import React, { useState } from 'react';
import { TaxonomyNode  } from '../../../../domains/taxonomy/taxonomy.types';
import { taxonomyAdminRepository } from '../../../../repositories/taxonomy.repository';
import { Button } from '../../../../design-system/primitives/Button';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../../i18n/I18nProvider';

export interface TaxonomyValidationTabProps {
  onNavigateToNode: (node: TaxonomyNode) => void;
}

export const TaxonomyValidationTab: React.FC<TaxonomyValidationTabProps> = ({
  onNavigateToNode,
}) => {
  const { t } = useTranslation();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [lastCheckTime, setLastCheckTime] = useState<string>(new Date().toLocaleTimeString());

  const issues = taxonomyAdminRepository.validateTaxonomy();
  const allNodes = taxonomyAdminRepository.getAllNodes();

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos = issues.filter((i) => i.severity === 'info');

  const filteredIssues = issues.filter((i) => {
    if (severityFilter === 'all') return true;
    return i.severity === severityFilter;
  });

  const handleRefresh = () => {
    setLastCheckTime(new Date().toLocaleTimeString());
  };

  return (
    <div className="space-y-6">
      {/* Header & Quality Gate Summary */}
      <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span>{t('admin.taxonomyValidationTab.moteurDAuditValidationD')}</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">{t('admin.taxonomyValidationTab.controleAutomatiqueDeStructureUnicite')}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Réanalyser ({lastCheckTime})
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{t('admin.taxonomyValidationTab.etatGlobal')}</span>
            {errors.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-success" />
            ) : (
              <AlertOctagon className="w-4 h-4 text-danger" />
            )}
          </div>
          <p className={`text-xl font-black ${errors.length === 0 ? 'text-success' : 'text-danger'}`}>
            {errors.length === 0 ? 'Conforme' : `${errors.length} Bloquants`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Erreurs bloquantes</span>
            <AlertOctagon className="w-4 h-4 text-danger" />
          </div>
          <p className="text-xl font-black text-danger">{errors.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Avertissements</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <p className="text-xl font-black text-warning">{warnings.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>Recommandations</span>
            <Info className="w-4 h-4 text-info" />
          </div>
          <p className="text-xl font-black text-info">{infos.length}</p>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSeverityFilter('all')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            severityFilter === 'all'
              ? 'bg-stone-900 text-white'
              : 'bg-bg-base text-stone-600 hover:bg-bg-subtle border border-border-base'
          }`}
        >
          Tous ({issues.length})
        </button>
        <button
          type="button"
          onClick={() => setSeverityFilter('error')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            severityFilter === 'error'
              ? 'bg-danger text-white'
              : 'bg-danger-surface text-danger hover:bg-danger-surface border border-danger-border'
          }`}
        >
          Erreurs ({errors.length})
        </button>
        <button
          type="button"
          onClick={() => setSeverityFilter('warning')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            severityFilter === 'warning'
              ? 'bg-amber-500 text-white'
              : 'bg-warning-surface text-warning hover:bg-warning-surface border border-warning-border'
          }`}
        >
          Avertissements ({warnings.length})
        </button>
        <button
          type="button"
          onClick={() => setSeverityFilter('info')}
          className={`px-3 py-1.5 rounded-xl transition-all ${
            severityFilter === 'info'
              ? 'bg-info text-white'
              : 'bg-info-surface text-info hover:bg-info-surface border border-info-border'
          }`}
        >
          Recommandations ({infos.length})
        </button>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-border-base text-xs text-stone-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto" />
            <p className="font-bold text-stone-900 text-sm">{t('admin.taxonomyValidationTab.aucuneAnomalieDetecteeDansCe')}</p>
            <p className="text-stone-500">{t('admin.taxonomyValidationTab.laTaxonomieRespecteToutesLes')}</p>
          </div>
        ) : (
          filteredIssues.map((issue) => {
            const targetNode = issue.nodeId ? allNodes.find((n) => n.id === issue.nodeId) : undefined;

            return (
              <div
                key={issue.id}
                className={`p-4 rounded-2xl border bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  issue.severity === 'error'
                    ? 'border-danger-border hover:border-danger'
                    : issue.severity === 'warning'
                    ? 'border-warning-border hover:border-amber-400'
                    : 'border-info-border hover:border-blue-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {issue.severity === 'error' ? (
                      <AlertOctagon className="w-5 h-5 text-danger" />
                    ) : issue.severity === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Info className="w-5 h-5 text-info" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-micro px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                          issue.severity === 'error'
                            ? 'bg-danger-surface text-danger'
                            : issue.severity === 'warning'
                            ? 'bg-warning-surface text-warning'
                            : 'bg-info-surface text-info'
                        }`}
                      >
                        {issue.code}
                      </span>
                      {issue.nodeLabel && (
                        <span className="font-bold text-xs text-stone-900">
                          {issue.nodeLabel}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-stone-700 font-medium">{issue.message}</p>

                    {issue.remediation && (
                      <p className="text-micro text-stone-500 italic">
                        Action suggérée : {issue.remediation}
                      </p>
                    )}
                  </div>
                </div>

                {targetNode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToNode(targetNode)}
                    leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="shrink-0"
                  >
                    Inspecter
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
