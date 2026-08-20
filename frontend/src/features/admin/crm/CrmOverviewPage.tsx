import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  
  
  TrendingUp,
  Sparkles,
  
  
  Clock,
  ArrowRight,
  
  Briefcase
  
} from 'lucide-react';
import { Button } from '../../../design-system/primitives/Button';
import { crmRepository, CrmOverviewStats } from '../../../repositories/crm.repository';
import { CrmOpportunity, CrmTask } from '../../../domains/crm/crm.types';
import { crmService } from '../../../domains/crm/crm.service';
import { CrmUniversalSearch } from './components/CrmUniversalSearch';
import { useTranslation } from '../../../i18n/I18nProvider';
import { usePageMeta } from '../../../hooks/usePageMeta';

export const CrmOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t('meta.crmOverview.title'),
    description: t('meta.crmOverview.description'),
    canonicalPath: '/admin/crm',
    noIndex: true,
  });

  const [stats, setStats] = useState<CrmOverviewStats | null>(null);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewStats, opps, taskList] = await Promise.all([
          crmRepository.getOverviewStats(),
          crmRepository.listOpportunities(),
          crmRepository.listTasks(),
        ]);
        setStats(overviewStats);
        setOpportunities(opps.slice(0, 5));
        setTasks(taskList.filter((t) => t.status === 'pending').slice(0, 4));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* 1. Top Header & Universal Search */}
      <div className="bg-white border border-border-base rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Espace Commercial & Relation Client
              </span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-500 font-medium">Shongre CRM Intelligence</span>
            </div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight">{t('admin.crmOverviewPage.tableauDeBordCrmPipeline')}</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              to="/admin/crm/prospection"
              variant="primary"
              size="sm"
              className="font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Prospection IA</span>
            </Button>
            <Button
              to="/admin/crm/pipeline"
              variant="outline"
              size="sm"
              className="font-bold"
            >
              <TrendingUp className="w-4 h-4" />
              <span>{t('admin.crmOverviewPage.voirLePipeline')}</span>
            </Button>
          </div>
        </div>

        {/* Global Search Bar */}
        <CrmUniversalSearch className="pt-2" />
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Prospects Actifs</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {stats ? stats.activeProspects : '...'}
          </div>
          <span className="text-micro text-success font-bold">{t('admin.crmOverviewPage.issusDeLaProspectionIa')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">{t('admin.crmOverviewPage.opportunites')}</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-warning">
            {stats ? stats.openOpportunities : '...'}
          </div>
          <span className="text-micro text-stone-500">{t('admin.crmOverviewPage.enCoursDeNegociation')}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">{t('admin.crmOverviewPage.valeurDuPipeline')}</span>
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-primary">
            {stats ? crmService.formatCrmMoney({ amountMinor: stats.pipelineValueMinor, currency: 'EUR' }) : '...'}
          </div>
          <span className="text-micro text-stone-500">
            Objectif annuel Forfaits Pro
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-border-base shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">{t('admin.crmOverviewPage.tachesATraiter')}</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {stats ? stats.tasksDueToday : '...'}
          </div>
          <span className="text-micro text-stone-500">{t('admin.crmOverviewPage.rappelsDemosPlanifiees')}</span>
        </div>
      </div>

      {/* 3. Main Workspace Split: Pipeline Stream & Pending Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Opportunities */}
        <div className="lg:col-span-7 bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-base font-black text-stone-900">{t('admin.crmOverviewPage.opportunitesCommercialesRecentes')}</h2>
            </div>
            <Link
              to="/admin/crm/pipeline"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Pipeline complet</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border-subtle">
            {opportunities.map((opp) => {
              const stage = crmService.getStage(opp.stage);
              return (
                <div key={opp.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 space-y-0.5">
                    <span className="font-bold text-xs text-stone-900 block truncate">
                      {opp.title}
                    </span>
                    <span className="text-micro text-stone-500 block truncate">
                      {opp.companyName} • Contact : {opp.primaryContactName || 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-xs text-stone-900 font-mono">
                      {crmService.formatCrmMoney(opp.estimatedValue)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-micro font-bold ${stage.color}`}>
                      {stage.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Pending Tasks & Quick AI Shortcut */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Banner Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">{t('admin.crmOverviewPage.prospectionAssisteeParIa')}</span>
            </div>
            <h3 className="text-base font-black leading-snug">{t('admin.crmOverviewPage.trouvezDeNouveauxVendeursProfessionnels')}</h3>
            <p className="text-xs text-stone-300 leading-relaxed">{t('admin.crmOverviewPage.decrivezEnLangageNaturelLes')}</p>
            <div className="pt-1">
              <Button
                to="/admin/crm/prospection"
                variant="primary"
                size="sm"
                className="font-bold"
              >{t('admin.crmOverviewPage.lancerUneRechercheIa')}</Button>
            </div>
          </div>

          {/* Pending Tasks Card */}
          <div className="bg-white border border-border-base rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <h2 className="text-base font-black text-stone-900">{t('admin.crmOverviewPage.tachesAFaire')}</h2>
              </div>
              <Link to="/admin/crm/taches" className="text-xs font-bold text-primary hover:underline">
                Toutes ({tasks.length})
              </Link>
            </div>

            <div className="space-y-2.5">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-start gap-2.5 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-stone-900 block truncate">{task.title}</span>
                    <span className="text-micro text-stone-500">{t('admin.crmOverviewPage.echeance')}<strong>{task.dueDate}</strong> • Lié à : {task.relatedTitle}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
