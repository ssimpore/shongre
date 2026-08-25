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
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Skeleton } from "../../../design-system";
import { useTranslation } from "../../../i18n/I18nProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

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

const stageTone = [
  "bg-sky-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-stone-400",
];

export const CrmOverviewPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentLocale } = useMarketLocation();
  const [dashboard, setDashboard] = useState<CrmDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePageMeta({
    title: t("meta.crmOverview.title"),
    description: t("meta.crmOverview.description"),
    canonicalPath: "/admin/crm",
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
    () => Math.max(...(dashboard?.stages.map((stage) => stage.amountMinor) ?? [1])),
    [dashboard],
  );

  if (loading) {
    return (
      <div className="space-y-4" aria-label="Chargement du tableau de bord CRM">
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
      <div className="rounded-2xl border border-danger-border bg-white p-8 text-center shadow-xs">
        <CircleAlert className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
        <h1 className="mt-3 text-lg font-black text-stone-900">
          Tableau de bord indisponible
        </h1>
        <p className="mx-auto mt-1 max-w-lg text-sm text-stone-600">{error}</p>
        <Button className="mt-5" size="sm" onClick={() => void loadDashboard()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Réessayer
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
      tone: "text-sky-700 bg-sky-50 border-sky-100",
    },
    {
      label: "Opportunités",
      value: dashboard.openOpportunities.toLocaleString(currentLocale),
      detail: "En cours dans tous les pipelines",
      icon: Target,
      tone: "text-amber-700 bg-amber-50 border-amber-100",
    },
    {
      label: "Pipeline ouvert",
      value: money(dashboard.openPipelineMinor, dashboard.currency, currentLocale),
      detail: "Valeur commerciale brute",
      icon: BriefcaseBusiness,
      tone: "text-primary bg-primary-light border-primary/15",
    },
    {
      label: "Pipeline pondéré",
      value: money(dashboard.weightedPipelineMinor, dashboard.currency, currentLocale),
      detail: "Valeur × probabilité",
      icon: BarChart3,
      tone: "text-violet-700 bg-violet-50 border-violet-100",
    },
    {
      label: "À traiter",
      value: String(dashboard.tasksDueToday + dashboard.overdueTasks),
      detail: `${dashboard.overdueTasks} en retard`,
      icon: CalendarClock,
      tone: dashboard.overdueTasks
        ? "text-danger bg-danger-surface border-danger-border"
        : "text-emerald-700 bg-emerald-50 border-emerald-100",
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 text-white shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-micro font-bold uppercase tracking-[0.14em] text-stone-400">
              <span className="text-primary">CRM commercial</span>
              <span aria-hidden="true">/</span>
              <span>France · EUR</span>
              <span className="rounded-full border border-emerald-700/60 bg-emerald-950 px-2 py-0.5 text-emerald-300">
                Données synchronisées
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Pilotez chaque relation commerciale
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stone-400">
              Pipeline, prévisions, tâches et comptes clés réunis dans un espace tenant-isolé.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              to="/admin/crm/prospection"
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
            >
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Prospection assistée
            </Button>
            <Button to="/admin/crm/pipeline" variant="primary" size="sm">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nouvelle opportunité
            </Button>
          </div>
        </div>
        <nav
          aria-label="Navigation CRM rapide"
          className="flex overflow-x-auto border-t border-stone-800 px-3 sm:px-4"
        >
          {[
            ["Vue d’ensemble", "/admin/crm"],
            ["Contacts", "/admin/crm/contacts"],
            ["Entreprises", "/admin/crm/entreprises"],
            ["Pipeline", "/admin/crm/pipeline"],
            ["Tâches", "/admin/crm/taches"],
            ["Rapports", "/admin/crm/rapports"],
          ].map(([label, to], index) => (
            <Link
              key={to}
              to={to}
              aria-current={index === 0 ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-xs font-bold transition-colors ${
                index === 0
                  ? "border-primary text-white"
                  : "border-transparent text-stone-400 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      <section aria-label="Indicateurs commerciaux" className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {kpis.map(({ label, value, detail, icon: Icon, tone }) => (
          <article key={label} className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
                {label}
              </span>
              <span className={`rounded-lg border p-1.5 ${tone}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <strong className="mt-2 block truncate text-xl font-black tabular-nums text-stone-950 sm:text-2xl">
              {value}
            </strong>
            <span className="mt-1 block truncate text-micro text-stone-500">{detail}</span>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
        <section className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5 sm:px-5">
            <div>
              <h2 className="text-sm font-black text-stone-950">Pipeline commercial</h2>
              <p className="text-micro text-stone-500">Répartition pondérée par étape</p>
            </div>
            <Link to="/admin/crm/pipeline" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Ouvrir le pipeline <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="space-y-3 p-4 sm:p-5">
            {dashboard.stages.filter((stage) => stage.position < 5).map((stage, index) => (
              <div key={stage.stageId} className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 text-xs">
                <span className="truncate font-bold text-stone-700">{stage.stageName}</span>
                <div className="h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
                  <div
                    className={`h-full rounded-full ${stageTone[index]}`}
                    style={{ width: `${Math.max((stage.amountMinor / pipelineMaximum) * 100, stage.opportunityCount ? 8 : 0)}%` }}
                  />
                </div>
                <div className="min-w-24 text-right">
                  <strong className="block font-black tabular-nums text-stone-900">
                    {money(stage.amountMinor, dashboard.currency, currentLocale)}
                  </strong>
                  <span className="text-micro text-stone-500">{stage.opportunityCount} dossier{stage.opportunityCount > 1 ? "s" : ""}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 border-t border-border-subtle bg-stone-50/70">
            <div className="border-r border-border-subtle p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500">Prévision commit</span>
              <strong className="mt-1 block text-lg font-black tabular-nums text-stone-950">
                {money(dashboard.forecastMinor, dashboard.currency, currentLocale)}
              </strong>
            </div>
            <div className="p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-stone-500">Revenu gagné</span>
              <strong className="mt-1 block text-lg font-black tabular-nums text-emerald-700">
                {money(dashboard.wonRevenueMinor, dashboard.currency, currentLocale)}
              </strong>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border-base bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
            <div>
              <h2 className="text-sm font-black text-stone-950">Priorités</h2>
              <p className="text-micro text-stone-500">Prochaines actions commerciales</p>
            </div>
            <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="divide-y divide-border-subtle px-4">
            {dashboard.priorityTasks.slice(0, 5).map((task) => (
              <article key={task.id} className="flex gap-3 py-3">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.priority === "urgent" ? "bg-danger" : task.priority === "high" ? "bg-primary" : "bg-stone-400"}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-stone-900">{task.title}</p>
                  <p className="mt-0.5 text-micro text-stone-500">
                    {new Intl.DateTimeFormat(currentLocale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(task.dueAt))}
                    {task.ownerName ? ` · ${task.ownerName}` : ""}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="border-t border-border-subtle p-3">
            <Link to="/admin/crm/taches" className="flex items-center justify-center gap-1 text-xs font-bold text-primary hover:underline">
              Voir toutes les tâches <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border-base bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-black text-stone-950">Opportunités à suivre</h2>
            <p className="text-micro text-stone-500">Dossiers ouverts, triés par dernière activité</p>
          </div>
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
            <span className="sr-only">Rechercher dans les opportunités</span>
            <input
              type="search"
              placeholder="Rechercher…"
              className="h-9 w-full rounded-lg border border-stone-200 bg-stone-50 pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-stone-50 text-micro font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-5 py-2.5">Opportunité</th>
                <th className="px-4 py-2.5">Étape</th>
                <th className="px-4 py-2.5">Clôture</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-5 py-2.5 text-right">Probabilité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {dashboard.opportunities.slice(0, 6).map((opportunity) => (
                <tr key={opportunity.id} className="transition-colors hover:bg-stone-50/80">
                  <td className="px-5 py-3">
                    <Link to={`/admin/crm/opportunites/${opportunity.id}`} className="font-bold text-stone-950 hover:text-primary">
                      {opportunity.name}
                    </Link>
                    <span className="mt-0.5 block text-micro text-stone-500">{opportunity.accountName ?? "Sans entreprise"} · {opportunity.ownerName ?? "Non assignée"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-primary-light px-2 py-1 text-micro font-bold text-primary">{opportunity.stageName}</span>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{shortDate(opportunity.expectedCloseDate, currentLocale)}</td>
                  <td className="px-4 py-3 text-right font-black tabular-nums text-stone-950">{money(opportunity.amount.amountMinor, opportunity.amount.currency, currentLocale)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-bold tabular-nums text-stone-700">{opportunity.probability}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-stone-50/60 px-5 py-3 text-micro text-stone-500">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            Prévision déterministe · aucune donnée envoyée à un fournisseur IA
          </span>
          <Link to="/admin/crm/pipeline" className="font-bold text-primary hover:underline">Afficher le pipeline complet</Link>
        </div>
      </section>
    </div>
  );
};
