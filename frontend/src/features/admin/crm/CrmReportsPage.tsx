import React, { useEffect, useState } from "react";
import {
  BarChart3,
  CircleDollarSign,
  Gauge,
  Target,
  TrendingUp,
} from "lucide-react";
import type { CrmDashboard } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { ProgressBar, Skeleton } from "../../../design-system";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";
import { useTranslation } from "../../../i18n/I18nProvider";

export const CrmReportsPage: React.FC = () => {
  const { t } = useTranslation();
  const crmPaths = useCrmSurface();
  usePageMeta({
    title: "Rapports CRM | Shongre",
    description: "Analytique commerciale CRM.",
    canonicalPath: crmPaths.analytics,
    noIndex: true,
  });
  const { currentLocale } = useMarketLocation();
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  useEffect(() => {
    void services.crm.getDashboard().then(setDashboard);
  }, []);
  if (!dashboard)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  const format = (value: number) =>
    new Intl.NumberFormat(currentLocale, {
      style: "currency",
      currency: dashboard.currency,
      maximumFractionDigits: 0,
    }).format(value / 100);
  const totalStageValue = Math.max(
    ...dashboard.stages.map((stage) => stage.amountMinor),
    1,
  );
  const coverage = dashboard.forecastMinor
    ? dashboard.openPipelineMinor / dashboard.forecastMinor
    : 0;
  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse sm:p-6">
        <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
          CRM · Analytique
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          Rapports commerciaux
        </h1>
        <p className="mt-1 text-xs text-text-disabled">
          {t("admin.crmReportsPage.indicateursCalculesDepuisLesOpportunitesEtTachesDuTenant")}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            [
              "Pipeline ouvert",
              format(dashboard.openPipelineMinor),
              CircleDollarSign,
            ],
            [
              "Pipeline pondéré",
              format(dashboard.weightedPipelineMinor),
              Gauge,
            ],
            ["Prévision", format(dashboard.forecastMinor), TrendingUp],
            ["Couverture", `${coverage.toFixed(1)}×`, Target],
          ].map(([label, value, Icon]) => {
            const MetricIcon = Icon as React.ComponentType<{
              className?: string;
            }>;
            return (
              <article
                key={label as string}
                className="rounded-control bg-stone-900 p-3"
              >
                <MetricIcon className="h-4 w-4 text-violet-300" />
                <span className="mt-2 block text-micro text-text-disabled">
                  {label as string}
                </span>
                <strong className="block text-xl font-black">
                  {value as string}
                </strong>
              </article>
            );
          })}
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-icon-md w-icon-md text-primary" />
            <h2 className="text-sm font-black">{t("admin.crmReportsPage.entonnoirParEtape")}</h2>
          </div>
          <div className="mt-5 space-y-4">
            {dashboard.stages.map((stage) => (
              <div key={stage.stageId}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold">
                    {stage.stageName}{" "}
                    <span className="text-text-muted">
                      ({stage.opportunityCount})
                    </span>
                  </span>
                  <strong>{format(stage.amountMinor)}</strong>
                </div>
                <ProgressBar
                  value={Math.max(
                    (stage.amountMinor / totalStageValue) * 100,
                    stage.opportunityCount ? 4 : 0,
                  )}
                  label={`${stage.stageName} dans l’entonnoir CRM`}
                  className="mt-1.5"
                />
                <p className="mt-1 text-micro text-text-muted">
                  {t("admin.crmReportsPage.pondere")} {format(stage.weightedAmountMinor)}
                </p>
              </div>
            ))}
          </div>
        </section>
        <aside className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-black">{t("admin.crmReportsPage.execution")}</h2>
            <dl className="mt-3 divide-y divide-border-subtle text-xs">
              {[
                ["Tâches aujourd’hui", dashboard.tasksDueToday],
                ["Tâches en retard", dashboard.overdueTasks],
                ["Opportunités ouvertes", dashboard.openOpportunities],
                ["Prospects actifs", dashboard.activeProspects],
              ].map(([label, value]) => (
                <div
                  key={label as string}
                  className="flex justify-between py-3"
                >
                  <dt className="text-stone-500">{label as string}</dt>
                  <dd className="font-black">{value as number}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-2xl border border-border-base bg-bg-surface p-5 shadow-xs">
            <h2 className="text-sm font-black">{t("admin.crmReportsPage.resultats")}</h2>
            <p className="mt-3 text-micro font-bold uppercase tracking-wider text-stone-500">
              {t("admin.crmOverviewPage.revenuGagne")}
            </p>
            <strong className="mt-1 block text-2xl font-black text-success">
              {format(dashboard.wonRevenueMinor)}
            </strong>
            <p className="mt-3 text-micro font-bold uppercase tracking-wider text-stone-500">
              Valeur perdue
            </p>
            <strong className="mt-1 block text-2xl font-black text-danger">
              {format(dashboard.lostValueMinor)}
            </strong>
          </section>
        </aside>
      </div>
    </div>
  );
};
