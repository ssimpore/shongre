import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  MailCheck,
  MoveRight,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";
import type {
  CrmAccount,
  CrmActivity,
  CrmOpportunity,
  CrmPipeline,
  CrmTask,
  MarketingCampaign,
  MarketingPreflight,
} from "@shongre/contracts";
import { Badge, Button, EmptyState, Spinner } from "../../../design-system";
import type { ProspectingUsage } from "@shongre/contracts/prospecting";
import type { ProspectingWorkspaceView } from "../useProspectingWorkspaceController";

const DEMO_NOW = new Date("2026-08-27T12:00:00.000Z").getTime();

const lifecycleLabels: Record<CrmAccount["lifecycle"], string> = {
  lead: "Lead",
  prospect: "Prospect",
  qualified: "Qualifié",
  customer: "Client",
  partner: "Partenaire",
  do_not_contact: "Ne pas contacter",
  archived: "Archivé",
};

const campaignStatusLabels: Record<MarketingCampaign["status"], string> = {
  DRAFT: "Brouillon",
  REVIEW: "En revue",
  APPROVED: "Approuvée",
  SCHEDULED: "Planifiée",
  QUEUED: "En file",
  SENDING: "En cours",
  PAUSED: "En pause",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
  FAILED: "Échec",
};

const activityIcons: Partial<
  Record<CrmActivity["activityType"], typeof Target>
> = {
  ACCOUNT_CREATED: UsersRound,
  AI_ENRICHMENT: UsersRound,
  OPPORTUNITY_CREATED: CircleDollarSign,
  STAGE_CHANGED: MoveRight,
  OPPORTUNITY_WON: CheckCircle2,
  TASK_CREATED: CalendarClock,
  TASK_COMPLETED: CheckCircle2,
  EMAIL_SENT: MailCheck,
};

function money(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function shortDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function activityDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function opportunityValue(opportunity: CrmOpportunity, locale: string) {
  if (!opportunity.amount.amountMinor) return "Valeur à qualifier";
  return money(
    opportunity.amount.amountMinor,
    opportunity.amount.currency,
    locale,
  );
}

interface PipelineBoardProps {
  pipeline: CrmPipeline | undefined;
  opportunities: CrmOpportunity[];
  locale: string;
  pendingActionId: string | null;
  onMove: (opportunityId: string, stageId: string) => Promise<void>;
  expanded?: boolean;
}

function OpportunityCard({
  opportunity,
  nextStage,
  locale,
  pending,
  onMove,
}: {
  opportunity: CrmOpportunity;
  nextStage: CrmPipeline["stages"][number] | undefined;
  locale: string;
  pending: boolean;
  onMove: () => void;
}) {
  return (
    <article className="rounded-control border border-border-base bg-bg-surface p-3 shadow-xs">
      <div className="min-w-0">
        <h4 className="truncate text-xs font-black text-text-main">
          {opportunity.accountName ?? opportunity.name}
        </h4>
        <p className="mt-0.5 truncate text-micro text-text-muted">
          {opportunity.name}
        </p>
        <p className="mt-2 text-micro font-black tabular-nums text-text-main">
          {opportunityValue(opportunity, locale)}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-subtle pt-2">
        <span className="min-w-0 truncate text-micro text-text-muted">
          {opportunity.nextStep ?? "Prochaine action à définir"}
        </span>
        {nextStage && (
          <button
            type="button"
            onClick={onMove}
            disabled={pending}
            aria-label={`Passer ${opportunity.name} à l’étape ${nextStage.name}`}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-control px-2 text-micro font-bold text-primary hover:bg-primary-light focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
          >
            {pending ? (
              <Spinner size="sm" />
            ) : (
              <ArrowRight className="h-icon-xs w-icon-xs" aria-hidden="true" />
            )}
            <span className="hidden xl:inline">Avancer</span>
          </button>
        )}
      </div>
    </article>
  );
}

export function PipelineBoard({
  pipeline,
  opportunities,
  locale,
  pendingActionId,
  onMove,
  expanded = false,
}: PipelineBoardProps) {
  const openStages = useMemo(
    () => pipeline?.stages.filter((stage) => stage.isOpen) ?? [],
    [pipeline],
  );
  const [selectedStageId, setSelectedStageId] = useState("");

  useEffect(() => {
    if (!openStages.some((stage) => stage.id === selectedStageId)) {
      setSelectedStageId(openStages[0]?.id ?? "");
    }
  }, [openStages, selectedStageId]);

  if (!pipeline || !openStages.length) {
    return (
      <EmptyState
        icon={<Target className="h-8 w-8 text-text-muted" aria-hidden="true" />}
        title="Aucun pipeline actif"
        description="Créez un pipeline CRM avant de qualifier les opportunités."
        action={null}
        className="border-0 shadow-none"
      />
    );
  }

  const opportunitiesForStage = (stageId: string) =>
    opportunities.filter(
      (opportunity) =>
        opportunity.pipelineId === pipeline.id &&
        opportunity.stageId === stageId &&
        opportunity.status === "open",
    );
  const selectedStage =
    openStages.find((stage) => stage.id === selectedStageId) ?? openStages[0];

  return (
    <div>
      <div className="border-b border-border-subtle lg:hidden">
        <div
          className="flex gap-1 overflow-x-auto px-3 py-2"
          role="tablist"
          aria-label="Étapes du pipeline"
        >
          {openStages.map((stage) => {
            const count = opportunitiesForStage(stage.id).length;
            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={selectedStage.id === stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={`inline-flex h-control-sm shrink-0 items-center gap-1.5 rounded-control border px-3 text-micro font-black ${
                  selectedStage.id === stage.id
                    ? "border-primary bg-primary-light text-primary"
                    : "border-transparent text-text-secondary hover:bg-bg-muted"
                }`}
              >
                {stage.name}
                <span className="rounded-full bg-bg-muted px-1.5 py-0.5 tabular-nums text-text-muted">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2 p-3 lg:hidden">
        {opportunitiesForStage(selectedStage.id).length ? (
          opportunitiesForStage(selectedStage.id).map((opportunity) => {
            const nextStage = openStages.find(
              (stage) => stage.position > selectedStage.position,
            );
            return (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                nextStage={nextStage}
                locale={locale}
                pending={pendingActionId === opportunity.id}
                onMove={() => {
                  if (nextStage) void onMove(opportunity.id, nextStage.id);
                }}
              />
            );
          })
        ) : (
          <p className="rounded-control bg-bg-subtle p-4 text-center text-xs text-text-muted">
            Aucune opportunité à cette étape.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <div
          className={`grid grid-cols-5 divide-x divide-border-subtle ${
            expanded ? "min-w-225" : "min-w-190"
          }`}
        >
          {openStages.map((stage, stageIndex) => {
            const stageOpportunities = opportunitiesForStage(stage.id);
            const stageTotal = stageOpportunities.reduce(
              (sum, item) => sum + item.amount.amountMinor,
              0,
            );
            const nextStage = openStages[stageIndex + 1];
            return (
              <section key={stage.id} className="min-w-0 bg-bg-subtle/40 p-2.5">
                <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
                  <h3 className="truncate text-xs font-black text-text-main">
                    {stage.name}
                    <span className="ml-1.5 rounded-full bg-bg-muted px-1.5 py-0.5 text-micro tabular-nums text-text-muted">
                      {stageOpportunities.length}
                    </span>
                  </h3>
                  <span className="text-micro font-bold tabular-nums text-text-muted">
                    {money(
                      stageTotal,
                      opportunities[0]?.amount.currency ?? "EUR",
                      locale,
                    )}
                  </span>
                </div>
                <div className="space-y-2">
                  {stageOpportunities.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      nextStage={nextStage}
                      locale={locale}
                      pending={pendingActionId === opportunity.id}
                      onMove={() => {
                        if (nextStage)
                          void onMove(opportunity.id, nextStage.id);
                      }}
                    />
                  ))}
                  {!stageOpportunities.length && (
                    <p className="rounded-control border border-dashed border-border-base p-3 text-center text-micro text-text-muted">
                      Aucun dossier
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TaskQueueProps {
  tasks: CrmTask[];
  accounts: CrmAccount[];
  opportunities: CrmOpportunity[];
  locale: string;
  pendingActionId: string | null;
  onComplete: (taskId: string) => Promise<void>;
  limit?: number;
}

export function TaskQueue({
  tasks,
  accounts,
  opportunities,
  locale,
  pendingActionId,
  onComplete,
  limit,
}: TaskQueueProps) {
  const entityNames = useMemo(() => {
    const values = new Map<string, string>();
    accounts.forEach((account) => values.set(account.id, account.name));
    opportunities.forEach((opportunity) =>
      values.set(opportunity.id, opportunity.accountName ?? opportunity.name),
    );
    return values;
  }, [accounts, opportunities]);
  const visibleTasks = tasks
    .filter((task) => task.status !== "completed")
    .sort(
      (left, right) =>
        new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime(),
    )
    .slice(0, limit ?? tasks.length);

  if (!visibleTasks.length) {
    return (
      <EmptyState
        icon={<CheckCircle2 className="h-8 w-8 text-success" />}
        title="Aucune action en attente"
        description="Les prochaines relances apparaîtront ici."
        action={null}
        className="border-0 shadow-none"
      />
    );
  }

  return (
    <div className="divide-y divide-border-subtle">
      {visibleTasks.map((task) => {
        const overdue = new Date(task.dueAt).getTime() < DEMO_NOW;
        const relationId = task.opportunityId ?? task.accountId ?? "";
        return (
          <article key={task.id} className="flex items-start gap-3 px-4 py-3.5">
            <button
              type="button"
              onClick={() => void onComplete(task.id)}
              disabled={pendingActionId === task.id}
              aria-label={`Marquer ${task.title} comme terminée`}
              className="mt-0.5 inline-flex h-control-sm w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-success-surface hover:text-success focus-visible:outline-2 focus-visible:outline-success disabled:opacity-50"
            >
              {pendingActionId === task.id ? (
                <Spinner size="sm" />
              ) : (
                <Circle className="h-icon-lg w-icon-lg" aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black leading-snug text-text-main">
                {task.title}
              </h4>
              <p className="mt-0.5 truncate text-micro text-text-muted">
                {entityNames.get(relationId) ?? "Sans relation"} ·{" "}
                {task.ownerName ?? "Équipe commerciale"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <time className="block text-micro font-bold text-text-secondary">
                {shortDate(task.dueAt, locale)}
              </time>
              <Badge variant={overdue ? "warning" : "neutral"}>
                {overdue ? "En retard" : "À faire"}
              </Badge>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ActivityTimeline({
  activities,
  locale,
  limit,
}: {
  activities: CrmActivity[];
  locale: string;
  limit?: number;
}) {
  const visible = activities.slice(0, limit ?? activities.length);
  if (!visible.length) {
    return (
      <EmptyState
        icon={<Clock3 className="h-8 w-8 text-text-muted" />}
        title="Aucune activité récente"
        description="Les validations, changements d’étape et tâches seront enregistrés ici."
        action={null}
        className="border-0 shadow-none"
      />
    );
  }
  return (
    <div className="divide-y divide-border-subtle">
      {visible.map((activity) => {
        const Icon = activityIcons[activity.activityType] ?? Clock3;
        return (
          <article
            key={activity.id}
            className="flex items-start gap-3 px-4 py-3"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary-light text-primary">
              <Icon className="h-icon-sm w-icon-sm" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-text-main">
                {activity.title}
              </h4>
              <p className="mt-0.5 truncate text-micro text-text-muted">
                {activity.description ?? "Événement CRM enregistré"}
              </p>
            </div>
            <time className="hidden shrink-0 text-micro text-text-muted sm:block">
              {activityDate(activity.occurredAt, locale)}
            </time>
          </article>
        );
      })}
    </div>
  );
}

interface CampaignCardProps {
  campaign: MarketingCampaign;
  preflight: MarketingPreflight | undefined;
  pending: boolean;
  onCheck: () => void;
  compact?: boolean;
}

function CampaignCard({
  campaign,
  preflight,
  pending,
  onCheck,
  compact = false,
}: CampaignCardProps) {
  const canSend = preflight?.canSend === true;
  return (
    <article className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-base bg-bg-subtle text-text-main">
          <MailCheck className="h-icon-md w-icon-md" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-black text-text-main">
              {campaign.name}
            </h3>
            <Badge
              variant={campaign.status === "COMPLETED" ? "success" : "neutral"}
            >
              {campaignStatusLabels[campaign.status]}
            </Badge>
          </div>
          <p className="mt-1 truncate text-micro text-text-muted">
            {campaign.subject}
          </p>
        </div>
      </div>
      <div className="mt-4 rounded-control border border-border-subtle bg-bg-subtle p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-micro font-bold text-text-secondary">
            <ShieldCheck className="h-icon-sm w-icon-sm" aria-hidden="true" />
            Pré-vol conformité
          </span>
          {preflight ? (
            <span
              className={`inline-flex items-center gap-1 text-micro font-black ${canSend ? "text-success" : "text-warning"}`}
            >
              {canSend ? (
                <CheckCircle2 className="h-icon-sm w-icon-sm" />
              ) : (
                <CircleAlert className="h-icon-sm w-icon-sm" />
              )}
              {canSend
                ? `${preflight.audience.eligible} éligibles`
                : `${preflight.blockers.length} blocage(s)`}
            </span>
          ) : (
            <span className="text-micro font-semibold text-text-secondary">
              À vérifier
            </span>
          )}
        </div>
        {preflight && (
          <p className="mt-1 text-micro leading-relaxed text-text-muted">
            {preflight.audience.excluded} exclusion(s) appliquée(s) avant tout
            envoi.
          </p>
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
        onClick={onCheck}
        disabled={pending}
      >
        {pending && <Spinner size="sm" />}
        {preflight ? "Revérifier le pré-vol" : "Vérifier le pré-vol"}
      </Button>
      {!compact && (
        <p className="mt-2 text-center text-micro text-text-muted">
          La démonstration ne contacte aucun fournisseur externe.
        </p>
      )}
    </article>
  );
}

interface SharedPanelProps {
  accounts: CrmAccount[];
  pipelines: CrmPipeline[];
  opportunities: CrmOpportunity[];
  tasks: CrmTask[];
  activities: CrmActivity[];
  campaigns: MarketingCampaign[];
  campaignPreflights: Record<string, MarketingPreflight>;
  usage: ProspectingUsage | null;
  locale: string;
  currency: string;
  weightedPipelineMinor: number;
  pendingActionId: string | null;
  onMoveOpportunity: (opportunityId: string, stageId: string) => Promise<void>;
  onCompleteTask: (taskId: string) => Promise<void>;
  onCheckCampaign: (campaignId: string) => Promise<MarketingPreflight>;
  onNavigate: (view: ProspectingWorkspaceView) => void;
}

export function UnifiedOverviewPanel(props: SharedPanelProps) {
  const {
    accounts,
    pipelines,
    opportunities,
    tasks,
    activities,
    campaigns,
    campaignPreflights,
    usage,
    locale,
    currency,
    weightedPipelineMinor,
    pendingActionId,
    onMoveOpportunity,
    onCompleteTask,
    onCheckCampaign,
    onNavigate,
  } = props;
  const openOpportunities = opportunities.filter(
    (opportunity) => opportunity.status === "open",
  );
  const pendingTasks = tasks.filter((task) => task.status !== "completed");
  const metrics = [
    {
      label: "Prospects actifs",
      value: usage?.prospectRecords ?? accounts.length,
      detail: "Voir les entreprises",
      view: "companies" as const,
      icon: UsersRound,
      tone: "bg-primary-light text-primary",
    },
    {
      label: "Opportunités ouvertes",
      value: openOpportunities.length,
      detail: "Voir le pipeline",
      view: "pipeline" as const,
      icon: Target,
      tone: "bg-warning-surface text-warning",
    },
    {
      label: "Pipeline pondéré",
      value: money(weightedPipelineMinor, currency, locale),
      detail: "Voir le pipeline",
      view: "pipeline" as const,
      icon: CircleDollarSign,
      tone: "bg-info-surface text-info",
    },
    {
      label: "Actions à traiter",
      value: pendingTasks.length,
      detail: "Voir les tâches",
      view: "tasks" as const,
      icon: CalendarClock,
      tone: "bg-bg-muted text-text-main",
    },
  ];
  const campaign =
    campaigns.find((item) => item.status === "DRAFT") ?? campaigns[0];

  return (
    <div className="space-y-4">
      <section
        aria-label="Indicateurs commerciaux"
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, detail, view, icon: Icon, tone }) => (
          <article
            key={label}
            className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <span className={`rounded-control p-2 ${tone}`}>
                <Icon className="h-icon-lg w-icon-lg" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-micro font-bold text-text-secondary">
                  {label}
                </p>
                <strong className="mt-0.5 block truncate text-xl font-black tabular-nums text-text-main sm:text-2xl">
                  {typeof value === "number"
                    ? value.toLocaleString(locale)
                    : value}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(view)}
              className="mt-3 inline-flex items-center gap-1 text-micro font-black text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {detail} <ArrowRight className="h-icon-xs w-icon-xs" />
            </button>
          </article>
        ))}
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-content-aside-lg">
        <section className="order-2 min-w-0 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs xl:order-1">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5">
            <div>
              <h2 className="text-sm font-black text-text-main">
                Pipeline commercial
              </h2>
              <p className="mt-0.5 text-micro text-text-muted">
                Faites avancer les opportunités sans changer d’espace.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate("pipeline")}
            >
              Gérer le pipeline
            </Button>
          </div>
          <PipelineBoard
            pipeline={pipelines.find((item) => item.isDefault) ?? pipelines[0]}
            opportunities={opportunities}
            locale={locale}
            pendingActionId={pendingActionId}
            onMove={onMoveOpportunity}
          />
        </section>

        <section className="order-1 min-w-0 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs xl:order-2">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5">
            <div>
              <h2 className="text-sm font-black text-text-main">
                Priorités du jour
              </h2>
              <p className="mt-0.5 text-micro text-text-muted">
                {pendingTasks.length} action(s) en attente
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("tasks")}
              className="text-micro font-black text-primary hover:underline"
            >
              Voir tout
            </button>
          </div>
          <TaskQueue
            tasks={tasks}
            accounts={accounts}
            opportunities={opportunities}
            locale={locale}
            pendingActionId={pendingActionId}
            onComplete={onCompleteTask}
            limit={3}
          />
        </section>
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-content-aside-lg">
        <section className="min-w-0 overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3.5">
            <div>
              <h2 className="text-sm font-black text-text-main">
                Activité récente
              </h2>
              <p className="mt-0.5 text-micro text-text-muted">
                Journal partagé et traçable du CRM.
              </p>
            </div>
          </div>
          <ActivityTimeline activities={activities} locale={locale} limit={5} />
        </section>
        <section className="min-w-0" aria-labelledby="overview-campaigns-title">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <h2
              id="overview-campaigns-title"
              className="text-sm font-black text-text-main"
            >
              Campagnes
            </h2>
            <button
              type="button"
              onClick={() => onNavigate("campaigns")}
              className="text-micro font-black text-primary hover:underline"
            >
              Voir toutes
            </button>
          </div>
          {campaign ? (
            <CampaignCard
              campaign={campaign}
              preflight={campaignPreflights[campaign.id]}
              pending={pendingActionId === campaign.id}
              onCheck={() => void onCheckCampaign(campaign.id)}
              compact
            />
          ) : (
            <EmptyState
              icon={<MailCheck className="h-8 w-8 text-text-muted" />}
              title="Aucune campagne"
              description="Les brouillons conformes apparaîtront ici."
              action={null}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export function CompaniesPanel({
  accounts,
  opportunities,
  locale,
  onNavigate,
}: Pick<
  SharedPanelProps,
  "accounts" | "opportunities" | "locale" | "onNavigate"
>) {
  if (!accounts.length) {
    return (
      <EmptyState
        icon={<Building2 className="h-8 w-8 text-text-muted" />}
        title="Aucune entreprise sur ce marché"
        description="Découvrez puis validez une entreprise pour créer sa fiche CRM."
        action={
          <Button onClick={() => onNavigate("discover")}>
            Découvrir des entreprises
          </Button>
        }
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-black text-text-main">Entreprises</h2>
          <p className="mt-0.5 text-micro text-text-muted">
            {accounts.length} fiche(s) CRM · comptes, prospects et clients
          </p>
        </div>
        <Button size="sm" onClick={() => onNavigate("discover")}>
          Découvrir
        </Button>
      </div>
      <div className="divide-y divide-border-subtle">
        {accounts.map((account) => {
          const accountOpportunities = opportunities.filter(
            (opportunity) => opportunity.accountId === account.id,
          );
          return (
            <article
              key={account.id}
              className="grid gap-3 px-4 py-4 hover:bg-bg-subtle sm:grid-cols-5 sm:items-center sm:px-5"
            >
              <div className="min-w-0 sm:col-span-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-black text-text-main">
                    {account.name}
                  </h3>
                  <Badge
                    variant={
                      account.lifecycle === "customer" ? "success" : "neutral"
                    }
                  >
                    {lifecycleLabels[account.lifecycle]}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-micro text-text-muted">
                  {account.domain ?? "Domaine à qualifier"} ·{" "}
                  {account.city ?? account.country}
                </p>
              </div>
              <div>
                <span className="block text-micro text-text-muted">
                  Secteur
                </span>
                <strong className="text-xs text-text-main">
                  {account.industry ?? "À qualifier"}
                </strong>
              </div>
              <div>
                <span className="block text-micro text-text-muted">Score</span>
                <strong className="text-xs tabular-nums text-text-main">
                  {account.fitScore ?? "—"}/100
                </strong>
              </div>
              <button
                type="button"
                onClick={() => onNavigate("pipeline")}
                className="inline-flex h-control-sm items-center justify-center gap-1 rounded-control border border-border-base px-3 text-micro font-black text-text-secondary hover:border-primary hover:text-primary"
              >
                {accountOpportunities.length} opportunité(s)
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function FullPipelinePanel(props: SharedPanelProps) {
  const pipeline =
    props.pipelines.find((item) => item.isDefault) ?? props.pipelines[0];
  return (
    <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-black text-text-main">
            Pipeline commercial
          </h2>
          <p className="mt-0.5 text-micro text-text-muted">
            {pipeline?.name ?? "Pipeline CRM"} ·{" "}
            {
              props.opportunities.filter((item) => item.status === "open")
                .length
            }{" "}
            opportunité(s) ouverte(s)
          </p>
        </div>
        <Badge variant="neutral">
          Pondéré{" "}
          {money(props.weightedPipelineMinor, props.currency, props.locale)}
        </Badge>
      </div>
      <PipelineBoard
        pipeline={pipeline}
        opportunities={props.opportunities}
        locale={props.locale}
        pendingActionId={props.pendingActionId}
        onMove={props.onMoveOpportunity}
        expanded
      />
      <p className="border-t border-border-subtle px-4 py-3 text-micro text-text-muted">
        Chaque transition valide l’étape, la version optimiste et ajoute une
        activité au journal partagé.
      </p>
    </section>
  );
}

export function FullTasksPanel(props: SharedPanelProps) {
  const pending = props.tasks.filter((task) => task.status !== "completed");
  const overdue = pending.filter(
    (task) => new Date(task.dueAt).getTime() < DEMO_NOW,
  );
  const completed = props.tasks.filter((task) => task.status === "completed");
  return (
    <div className="space-y-4">
      <section
        className="grid grid-cols-3 gap-3"
        aria-label="Résumé des tâches"
      >
        {(
          [
            ["À faire", pending.length, CalendarClock],
            ["En retard", overdue.length, CircleAlert],
            ["Terminées", completed.length, CheckCircle2],
          ] as const
        ).map(([label, value, Icon]) => (
          <article
            key={String(label)}
            className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
          >
            <Icon
              className="h-icon-md w-icon-md text-primary"
              aria-hidden="true"
            />
            <strong className="mt-2 block text-xl font-black tabular-nums text-text-main">
              {String(value)}
            </strong>
            <span className="text-micro text-text-muted">{String(label)}</span>
          </article>
        ))}
      </section>
      <section className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs">
        <div className="border-b border-border-subtle px-4 py-4 sm:px-5">
          <h2 className="text-base font-black text-text-main">
            Tâches & relances
          </h2>
          <p className="mt-0.5 text-micro text-text-muted">
            Une file d’action reliée aux entreprises et opportunités.
          </p>
        </div>
        <TaskQueue
          tasks={props.tasks}
          accounts={props.accounts}
          opportunities={props.opportunities}
          locale={props.locale}
          pendingActionId={props.pendingActionId}
          onComplete={props.onCompleteTask}
        />
      </section>
    </div>
  );
}

export function CampaignsPanel(
  props: SharedPanelProps & { suppressionCount: number },
) {
  if (!props.campaigns.length) {
    return (
      <EmptyState
        icon={<MailCheck className="h-8 w-8 text-text-muted" />}
        title="Aucune campagne sur ce marché"
        description="Préparez une campagne dans Marketing après avoir qualifié une audience conforme."
        action={null}
      />
    );
  }
  return (
    <div className="space-y-4">
      <section className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-text-main">
              Campagnes avec approbation
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-text-muted">
              Prospects prépare l’audience et le contexte. Marketing reste
              responsable du consentement, des suppressions, du pré-vol et de
              l’envoi.
            </p>
          </div>
          <Badge variant={props.suppressionCount ? "warning" : "success"}>
            {props.suppressionCount} suppression(s) active(s)
          </Badge>
        </div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {props.campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            preflight={props.campaignPreflights[campaign.id]}
            pending={props.pendingActionId === campaign.id}
            onCheck={() => void props.onCheckCampaign(campaign.id)}
          />
        ))}
      </section>
    </div>
  );
}

export type ProspectsCrmPanelProps = SharedPanelProps;
