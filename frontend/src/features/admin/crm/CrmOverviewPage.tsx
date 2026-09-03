import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import type { CrmDashboard } from "@shongre/contracts/crm";
import { getCountryConfig } from "@shongre/contracts";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { ProgressBar, Skeleton } from "../../../design-system";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { CrmUniversalSearch } from "./components/CrmUniversalSearch";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";

function money(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function shortDate(value: string | undefined, locale: string) {
  if (!value) return "Non définie";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

const stageProgressVariant = [
  "info",
  "primary",
  "warning",
  "primary",
  "danger",
  "success",
  "primary",
] as const;

export const CrmOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentLocale } = useMarketLocation();
  const crmPaths = useCrmSurface();
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opportunityQuery, setOpportunityQuery] = useState("");

  usePageMeta({
    title: t("meta.crmOverview.title"),
    description: t("meta.crmOverview.description"),
    canonicalPath: crmPaths.overview,
    noIndex: true,
  });

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      setDashboard(await services.crm.getDashboard());
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Le tableau de bord CRM n’a pas pu être chargé.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const pipelineMaximum = useMemo(
    () =>
      Math.max(...(dashboard?.stages.map((stage) => stage.amountMinor) ?? [1])),
    [dashboard],
  );

  const visibleOpportunities = useMemo(() => {
    const query = opportunityQuery.trim().toLocaleLowerCase(currentLocale);
    if (!query) return dashboard?.opportunities ?? [];

    return (dashboard?.opportunities ?? []).filter((opportunity) =>
      [
        opportunity.name,
        opportunity.accountName,
        opportunity.ownerName,
        opportunity.stageName,
      ].some((value) =>
        value?.toLocaleLowerCase(currentLocale).includes(query),
      ),
    );
  }, [currentLocale, dashboard, opportunityQuery]);

  if (loading) {
    return (
      <div
        className="space-y-4"
        aria-label={t("admin.crmOverviewPage.chargementDuTableauDeBordCrm")}
      >
        <Skeleton className="h-28 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!dashboard || error) {
    return (
      <div className="rounded-2xl border border-danger-border bg-bg-surface p-8 text-center shadow-xs">
        <CircleAlert
          className="mx-auto h-8 w-8 text-danger"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-lg font-bold text-text-main">
          {t("admin.crmOverviewPage.tableauDeBordIndisponible")}
        </h1>
        <p className="mx-auto mt-1 max-w-lg text-sm text-text-secondary">
          {error}
        </p>
        <Button className="mt-5" size="sm" onClick={() => void loadDashboard()}>
          <RefreshCw className="h-icon-md w-icon-md" aria-hidden="true" />
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const kpis = [
    {
      label: "Prospects actifs",
      value: dashboard.activeProspects.toLocaleString(currentLocale),
      detail: "Comptes avec opportunité ouverte",
      icon: UsersRound,
      tone: "text-info bg-info-surface border-info-border",
    },
    {
      label: t("admin.crmOverviewPage.opportunites"),
      value: dashboard.openOpportunities.toLocaleString(currentLocale),
      detail: "En cours dans tous les pipelines",
      icon: Target,
      tone: "text-warning bg-warning-surface border-warning-border",
    },
    {
      label: t("admin.crmContactDetailPage.pipelineOuvert"),
      value: money(
        dashboard.openPipelineMinor,
        dashboard.currency,
        currentLocale,
      ),
      detail: "Valeur commerciale brute",
      icon: BriefcaseBusiness,
      tone: "text-primary bg-primary-light border-primary/15",
    },
    {
      label: t("admin.crmOverviewPage.pipelinePondere"),
      value: money(
        dashboard.weightedPipelineMinor,
        dashboard.currency,
        currentLocale,
      ),
      detail: "Valeur × probabilité",
      icon: BarChart3,
      tone: "text-violet-700 bg-violet-50 border-violet-100",
    },
    {
      label: t("admin.crmOverviewPage.aTraiter"),
      value: String(dashboard.tasksDueToday + dashboard.overdueTasks),
      detail: `${dashboard.overdueTasks} en retard`,
      icon: CalendarClock,
      tone: dashboard.overdueTasks
        ? "text-danger bg-danger-surface border-danger-border"
        : "text-success bg-success-surface border-success-border",
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      <CrmUniversalSearch />
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 text-text-inverse shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-micro font-bold uppercase tracking-wide text-text-disabled">
              <span className="text-primary-on-dark">CRM commercial</span>
              <span aria-hidden="true">/</span>
              <span>
                {getCountryConfig(dashboard.marketCode)?.name ??
                  dashboard.marketCode}{" "}
                · {dashboard.currency}
              </span>
              <span className="rounded-pill border border-emerald-700/60 bg-emerald-950 px-2 py-0.5 text-emerald-300">
                {t("admin.crmOverviewPage.donneesSynchronisees")}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pilotez chaque relation commerciale
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-text-disabled">
              {t(
                "admin.crmOverviewPage.pipelinePrevisionsTachesEtComptesClesReunisDansUnEspace",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              to={crmPaths.discover}
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-text-inverse hover:bg-stone-800"
            >
              <Sparkles
                className="h-icon-md w-icon-md text-primary"
                aria-hidden="true"
              />
              {t("admin.crmOverviewPage.prospectionAssistee")}
            </Button>
            <Button to={crmPaths.pipeline} variant="primary" size="sm">
              <Plus className="h-icon-md w-icon-md" aria-hidden="true" />
              {t("admin.crmPipelinePage.nouvelleOpportunite")}
            </Button>
          </div>
        </div>
        {crmPaths.kind === "admin" && (
          <nav
            aria-label="Navigation CRM rapide"
            className="flex overflow-x-auto border-t border-stone-800 px-3 sm:px-4"
          >
            {[
              ["Vue d’ensemble", crmPaths.overview],
              ["Contacts", crmPaths.contacts],
              ["Entreprises", crmPaths.companies],
              ["Pipeline", crmPaths.pipeline],
              ["Tâches", crmPaths.tasks],
              ["Rapports", crmPaths.analytics],
            ].map(([label, to], index) => (
              <Link
                key={to}
                to={to}
                aria-current={index === 0 ? "page" : undefined}
                className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
                  index === 0
                    ? "border-primary text-text-inverse"
                    : "border-transparent text-text-disabled hover:text-text-inverse"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </section>

      <section
        aria-label="Indicateurs commerciaux"
        className="grid grid-cols-2 gap-3 xl:grid-cols-5"
      >
        {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border border-border-base bg-bg-surface p-4 shadow-xs"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <span className="min-w-0 break-words text-micro font-bold uppercase tracking-wider text-stone-500">
                {label}
              </span>
              <span className={`shrink-0 rounded-lg border p-1.5 ${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <strong className="mt-2 block truncate text-xl font-bold tabular-nums text-stone-950 sm:text-2xl">
              {value}
            </strong>
            <span className="mt-1 block truncate text-micro text-stone-500">
              {detail}
            </span>
          </article>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-bold text-stone-950">
                {t("admin.crmOverviewPage.pipelineCommercial")}
              </h2>
              <p className="text-micro text-stone-500">
                {t("admin.crmOverviewPage.repartitionPondereeParEtape")}
              </p>
            </div>
            <Link
              to={crmPaths.pipeline}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {t("admin.crmOverviewPage.ouvrirLePipeline")}{" "}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {dashboard.stages
              .filter((stage) => stage.position < 5)
              .map((stage, index) => (
                <div
                  key={stage.stageId}
                  className="flex items-center gap-3 text-xs"
                >
                  <span className="w-24 shrink-0 truncate font-bold text-stone-700">
                    {stage.stageName}
                  </span>
                  <ProgressBar
                    value={Math.max(
                      (stage.amountMinor / pipelineMaximum) * 100,
                      stage.opportunityCount ? 8 : 0,
                    )}
                    label={`${stage.stageName} dans le pipeline`}
                    variant={stageProgressVariant[index] ?? "primary"}
                    className="min-w-0 flex-1"
                  />
                  <div className="min-w-24 text-right">
                    <strong className="block font-bold tabular-nums text-text-main">
                      {money(
                        stage.amountMinor,
                        dashboard.currency,
                        currentLocale,
                      )}
                    </strong>
                    <span className="text-micro text-stone-500">
                      {stage.opportunityCount} dossier
                      {stage.opportunityCount > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
          </div>
          <div className="grid grid-cols-2 border-t border-border-subtle bg-stone-50/70">
            <div className="border-r border-border-subtle p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
                {t("admin.crmOverviewPage.previsionCommit")}
              </span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-stone-950">
                {money(
                  dashboard.forecastMinor,
                  dashboard.currency,
                  currentLocale,
                )}
              </strong>
            </div>
            <div className="p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
                {t("admin.crmOverviewPage.revenuGagne")}
              </span>
              <strong className="mt-1 block text-lg font-bold tabular-nums text-success">
                {money(
                  dashboard.wonRevenueMinor,
                  dashboard.currency,
                  currentLocale,
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border-base bg-bg-surface shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
            <div>
              <h2 className="text-sm font-bold text-stone-950">
                {t("admin.crmOverviewPage.priorites")}
              </h2>
              <p className="text-micro text-stone-500">
                Prochaines actions commerciales
              </p>
            </div>
            <Clock3
              className="h-icon-md w-icon-md text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="divide-y divide-border-subtle px-4">
            {dashboard.priorityTasks.slice(0, 5).map((task) => (
              <article key={task.id} className="flex gap-3 py-3">
                <span
                  className={`mt-1 h-2 w-2 shrink-0 rounded-pill ${task.priority === "urgent" ? "bg-danger" : task.priority === "high" ? "bg-primary" : "bg-stone-400"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-text-main">
                    {task.title}
                  </p>
                  <p className="mt-0.5 text-micro text-stone-500">
                    {new Intl.DateTimeFormat(currentLocale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(task.dueAt))}
                    {task.ownerName ? ` · ${task.ownerName}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-border-subtle p-3">
            <Link
              to={crmPaths.tasks}
              className="flex items-center justify-center gap-1 text-xs font-bold text-primary hover:underline"
            >
              {t("admin.crmTasksPage.voirToutesLesTaches")}{" "}
              <ArrowRight className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-bold text-stone-950">
              {t("admin.crmOverviewPage.opportunitesASuivre")}
            </h2>
            <p className="text-micro text-stone-500">
              {t(
                "admin.crmOverviewPage.dossiersOuvertsTriesParDerniereActivite",
              )}
            </p>
          </div>
          <label className="relative block sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-disabled"
              aria-hidden="true"
            />
            <span className="sr-only">
              {t("admin.crmOverviewPage.rechercherDansLesOpportunites")}
            </span>
            <input
              type="search"
              placeholder="Rechercher…"
              value={opportunityQuery}
              onChange={(event) => setOpportunityQuery(event.target.value)}
              className="h-control-md w-full rounded-control border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left text-xs">
            <thead className="bg-stone-50 text-micro font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-2.5">
                  {t("admin.crmOverviewPage.opportunite")}
                </th>
                <th className="px-4 py-2.5">
                  {t("admin.crmOverviewPage.etape")}
                </th>
                <th className="px-4 py-2.5">
                  {t("admin.crmOpportunityDetailPage.cloture")}
                </th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-5 py-2.5 text-right">
                  {t("admin.crmOverviewPage.probabilite")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {visibleOpportunities.slice(0, 6).map((opportunity) => (
                <tr
                  key={opportunity.id}
                  className="transition-colors hover:bg-stone-50/80"
                >
                  <td className="px-5 py-3">
                    <Link
                      to={crmPaths.opportunity(opportunity.id)}
                      className="font-bold text-stone-950 hover:text-primary"
                    >
                      {opportunity.name}
                    </Link>
                    <span className="mt-0.5 block text-micro text-stone-500">
                      {opportunity.accountName ?? "Sans entreprise"} ·{" "}
                      {opportunity.ownerName ?? "Non assignée"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-pill bg-primary-light px-2 py-1 text-micro font-bold text-primary">
                      {opportunity.stageName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {shortDate(opportunity.expectedCloseDate, currentLocale)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-stone-950">
                    {money(
                      opportunity.amount.amountMinor,
                      opportunity.amount.currency,
                      currentLocale,
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-bold tabular-nums text-stone-700">
                      {opportunity.probability}%
                    </span>
                  </td>
                </tr>
              ))}
              {visibleOpportunities.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-stone-500"
                  >
                    {t(
                      "admin.crmOverviewPage.aucuneOpportuniteNeCorrespondACetteRecherche",
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-stone-50/60 px-5 py-3 text-micro text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2
              className="h-icon-sm w-icon-sm text-success"
              aria-hidden="true"
            />
            {t(
              "admin.crmOverviewPage.previsionDeterministeAucuneDonneeEnvoyeeAUnFournisseurIa",
            )}
          </span>
          <Link
            to={crmPaths.pipeline}
            className="font-bold text-primary hover:underline"
          >
            {t("admin.crmOverviewPage.afficherLePipelineComplet")}
          </Link>
        </div>
      </section>
    </div>
  );
};
