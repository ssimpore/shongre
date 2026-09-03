import React from "react";
import {
  Armchair,
  BarChart3,
  Building2,
  CarFront,
  Check,
  ChevronRight,
  CircleAlert,
  Database,
  FileCheck2,
  Gauge,
  Lightbulb,
  ListFilter,
  MailCheck,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  X,
} from "lucide-react";
import {
  PROSPECTING_FIELD_CONSTRAINTS,
  type LeadSourceDefinition,
  type ProspectCandidate,
  type ProspectOpportunityBrief,
  type ProspectingUsage,
} from "@shongre/contracts/prospecting";
import {
  Badge,
  Button,
  DataTable,
  Drawer,
  EmptyState,
  Notice,
  ProgressBar,
  Spinner,
  StatePanel,
  TabPanel,
  Tabs,
  type DataTableColumn,
} from "../../design-system";
import { ConfirmModal } from "../../design-system/primitives/ConfirmModal";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useToast } from "../../app/providers/ToastProvider";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  useProspectingWorkspaceController,
  type ProspectingWorkspaceView,
} from "./useProspectingWorkspaceController";
import {
  CampaignsPanel,
  CompaniesPanel,
  FullPipelinePanel,
  FullTasksPanel,
  UnifiedOverviewPanel,
  type ProspectsCrmPanelProps,
} from "./components/ProspectsCrmPanels";

export type ProspectingEntryPoint =
  "PRO_WORKSPACE" | "STANDALONE" | "INTERNAL_SHONGRE";

export interface ProspectingWorkspacePageProps {
  entryPoint?: ProspectingEntryPoint;
  routeBasePath?: string;
  defaultView?: ProspectingWorkspaceView;
}

const workspaceTabs = [
  {
    id: "overview",
    label: "Vue d’ensemble",
    icon: <Gauge className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "discover",
    label: "Découvrir",
    icon: <Search className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "companies",
    label: "Entreprises",
    icon: <Building2 className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    icon: <Target className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "campaigns",
    label: "Campagnes",
    icon: <MailCheck className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "tasks",
    label: "Tâches",
    icon: <FileCheck2 className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "sources",
    label: "Sources",
    icon: <Database className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "compliance",
    label: "Conformité",
    icon: <ShieldCheck className="h-icon-sm w-icon-sm" />,
  },
  {
    id: "usage",
    label: "Usage",
    icon: <BarChart3 className="h-icon-sm w-icon-sm" />,
  },
];

const discoveryExamples = [
  { label: "Ateliers automobiles", icon: CarFront },
  { label: "Mobilier reconditionné", icon: Armchair },
  { label: "Cabinets de recrutement", icon: UsersRound },
] as const;

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 85 ? "success" : score >= 70 ? "warning" : "neutral";
  return <Badge variant={variant}>Adéquation {score}/100</Badge>;
}

const freshnessPresentation = {
  CURRENT: { label: "Actuelle", variant: "success" as const },
  AGING: { label: "À actualiser bientôt", variant: "warning" as const },
  STALE: { label: "Obsolète", variant: "warning" as const },
  UNKNOWN: { label: "Fraîcheur inconnue", variant: "neutral" as const },
};

const sourceLifecyclePresentation = {
  ACTIVE: { label: "Active", variant: "success" as const },
  DEGRADED: { label: "Dégradée", variant: "warning" as const },
  INACTIVE_REVIEW_REQUIRED: {
    label: "Approbation requise",
    variant: "warning" as const,
  },
  DISCONNECTED: { label: "Déconnectée", variant: "warning" as const },
};

const sourceOperationLabels: Record<
  LeadSourceDefinition["operations"][number],
  string
> = {
  SEARCH: "Recherche",
  ENRICHMENT: "Enrichissement",
  IMPORT: "Import",
  REFRESH: "Actualisation",
  DELETE: "Suppression",
};

function formatEvidenceDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-text-secondary">{label}</span>
        <span className="tabular-nums text-text-muted">
          {used.toLocaleString("fr-FR")} / {limit.toLocaleString("fr-FR")}
        </span>
      </div>
      <ProgressBar
        value={used}
        max={limit || 1}
        label={label}
        variant={
          percent >= 100 ? "danger" : percent >= 80 ? "warning" : "primary"
        }
        className="h-1.5 w-full"
      />
    </div>
  );
}

function BriefContent({
  candidate,
  brief,
  loading,
  importing,
  sources,
  locale,
  onImport,
}: {
  candidate: ProspectCandidate;
  brief: ProspectOpportunityBrief | null;
  loading: boolean;
  importing: boolean;
  sources: LeadSourceDefinition[];
  locale: string;
  onImport: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreBadge score={candidate.score.totalScore} />
          <Badge variant="neutral">
            Qualité des données {candidate.score.dataConfidence}%
          </Badge>
          {candidate.company.reviewState === "DUPLICATE_REVIEW" && (
            <Badge variant="warning">Doublon à confirmer</Badge>
          )}
        </div>
        <h3 className="text-lg font-bold tracking-tight text-text-main">
          {candidate.company.canonicalName}
        </h3>
        <p className="text-xs leading-relaxed text-text-secondary">
          {candidate.company.description}
        </p>
      </div>

      <Notice variant="info" title="Aide à la décision">
        Le score, la synthèse et la prochaine action sont indicatifs. Aucune
        action externe n’est déclenchée sans votre confirmation.
      </Notice>

      {loading ? (
        <div className="flex items-center gap-2 rounded-control bg-bg-subtle p-4 text-xs text-text-secondary">
          <Spinner size="sm" />
          Préparation du brief explicable…
        </div>
      ) : brief ? (
        <>
          <section aria-labelledby="brief-known-facts" className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Synthèse proposée
            </h4>
            <p className="text-xs leading-relaxed text-text-secondary">
              {brief.summary}
            </p>
            <h4
              id="brief-known-facts"
              className="text-xs font-bold uppercase tracking-wider text-text-muted"
            >
              Faits connus
            </h4>
            <ul className="space-y-2">
              {brief.knownFacts.map((fact, index) => (
                <li
                  key={index}
                  className="flex gap-2 text-xs leading-relaxed text-text-secondary"
                >
                  <Check
                    className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span>{fact.statement}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="brief-score-factors" className="space-y-2">
            <h4
              id="brief-score-factors"
              className="text-xs font-bold uppercase tracking-wider text-text-muted"
            >
              Pourquoi ce score
            </h4>
            <ul className="space-y-1.5 text-xs text-text-secondary">
              {candidate.score.positiveFactors.map((factor) => (
                <li key={factor.code} className="flex justify-between gap-3">
                  <span>{factor.label}</span>
                  <span className="shrink-0 font-bold tabular-nums text-success">
                    +{factor.impact}
                  </span>
                </li>
              ))}
            </ul>
            {candidate.score.missingInformation.length > 0 && (
              <p className="rounded-control bg-warning-surface p-3 text-micro leading-relaxed text-warning">
                À vérifier : {candidate.score.missingInformation.join(", ")}.
              </p>
            )}
          </section>
          <section
            aria-labelledby="brief-next-step"
            className="rounded-control border border-primary/20 bg-primary-light p-4"
          >
            <h4 id="brief-next-step" className="text-xs font-bold text-primary">
              Prochaine action suggérée
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              {brief.suggestions[0]}
            </p>
          </section>
        </>
      ) : (
        <Notice variant="info">
          Le brief utilise uniquement les preuves enregistrées et reste soumis à
          validation humaine.
        </Notice>
      )}

      <section aria-labelledby="brief-evidence" className="space-y-2">
        <h4
          id="brief-evidence"
          className="text-xs font-bold uppercase tracking-wider text-text-muted"
        >
          Preuves et provenance
        </h4>
        {candidate.evidence.map((evidence) => {
          const source = sources.find((item) => item.id === evidence.sourceId);
          const freshness = freshnessPresentation[evidence.freshness];
          return (
            <div
              key={evidence.id}
              className="rounded-control border border-border-base p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-bold text-text-main">
                  {evidence.title}
                </p>
                <Badge variant={freshness.variant}>{freshness.label}</Badge>
              </div>
              <p className="mt-1 text-micro font-semibold text-text-secondary">
                {source?.name ?? evidence.sourceId} · observée le{" "}
                <time dateTime={evidence.observedAt}>
                  {formatEvidenceDate(evidence.observedAt, locale)}
                </time>
              </p>
              {evidence.excerpt && (
                <p className="mt-1.5 text-micro leading-relaxed text-text-muted">
                  {evidence.excerpt}
                </p>
              )}
              <p className="mt-2 text-micro text-text-muted">
                Confiance de la preuve {Math.round(evidence.confidence * 100)} %
                · attribution conservée
              </p>
            </div>
          );
        })}
      </section>

      <Button
        variant="primary"
        className="w-full"
        onClick={onImport}
        disabled={importing || candidate.status === "IMPORTED"}
      >
        {candidate.status === "IMPORTED"
          ? "Ajouté au CRM"
          : importing
            ? "Import en cours…"
            : candidate.company.reviewState === "DUPLICATE_REVIEW"
              ? "Examiner et relier le doublon"
              : "Valider et ajouter au CRM"}
      </Button>
      <p className="text-center text-micro leading-relaxed text-text-muted">
        Aucune donnée de contact n’est inventée. L’import conserve la
        provenance.
      </p>
    </div>
  );
}

function UsagePanel({ usage }: { usage: ProspectingUsage | null }) {
  if (!usage) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-agency-content-aside-secondary">
      <section
        className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6"
        aria-labelledby="usage-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="usage-title" className="text-base font-bold text-text-main">
              Usage d’août 2026
            </h2>
            <p className="mt-1 text-xs text-text-muted">
              Mesures observées, sans estimation de performance.
            </p>
          </div>
          <Badge variant={usage.status === "AVAILABLE" ? "success" : "warning"}>
            {usage.status === "AVAILABLE" ? "Disponible" : "À surveiller"}
          </Badge>
        </div>
        <div className="mt-6 space-y-5">
          <UsageMeter
            label="Découvertes"
            used={usage.discoveriesUsed}
            limit={usage.entitlements.monthlyDiscoveries}
          />
          <UsageMeter
            label="Enrichissements"
            used={usage.enrichmentsUsed}
            limit={usage.entitlements.monthlyEnrichments}
          />
          <UsageMeter
            label="Crédits IA"
            used={usage.aiCreditsUsed}
            limit={usage.entitlements.monthlyAiCredits}
          />
          <UsageMeter
            label="Outreach"
            used={usage.outreachUsed}
            limit={usage.entitlements.monthlyOutreach}
          />
        </div>
      </section>
      <aside className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
        <p className="text-micro font-bold uppercase tracking-wider text-text-muted">
          Offre active
        </p>
        <h2 className="mt-1 text-lg font-bold text-text-main">
          {usage.planName}
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">
          Les prix et quotas finaux restent pilotés par le catalogue commercial
          backend.
        </p>
        <dl className="mt-5 space-y-3 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Sièges</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.seats}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Listes</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.savedLists}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Rétention</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.retentionDays} jours
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-text-muted">Analytics</dt>
            <dd className="font-bold text-text-main">
              {usage.entitlements.analyticsLevel}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

export const ProspectingWorkspacePage: React.FC<
  ProspectingWorkspacePageProps
> = ({ entryPoint = "PRO_WORKSPACE", routeBasePath, defaultView }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const isWide = useMediaQuery("(min-width: 1024px)");
  const controller = useProspectingWorkspaceController(
    entryPoint === "INTERNAL_SHONGRE" ? "INTERNAL_SHONGRE" : "SUBSCRIBER",
    routeBasePath,
    defaultView,
  );
  const [pendingImportCandidate, setPendingImportCandidate] =
    React.useState<ProspectCandidate | null>(null);
  const [visibleDiscoveryExamples, setVisibleDiscoveryExamples] =
    React.useState(() => discoveryExamples.map(({ label }) => label));
  usePageMeta({
    title: t("meta.crmAiProspecting.title"),
    description: t("meta.crmAiProspecting.description"),
    canonicalPath:
      entryPoint === "INTERNAL_SHONGRE"
        ? "/admin/crm/prospection"
        : entryPoint === "STANDALONE"
          ? (routeBasePath ?? "/app")
          : "/compte/pro/prospects",
    noIndex: true,
  });

  const columns: DataTableColumn<ProspectCandidate>[] = [
    {
      id: "company",
      header: "Entreprise",
      isRowTitle: true,
      cell: (row) => (
        <button
          type="button"
          onClick={() => void controller.selectCandidate(row.company.id)}
          className="group max-w-xs text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="block font-bold text-text-main group-hover:text-primary">
            {row.company.canonicalName}
          </span>
          <span className="mt-0.5 block truncate text-micro text-text-muted">
            {row.company.domain}
          </span>
        </button>
      ),
    },
    {
      id: "industry",
      header: "Secteur",
      cell: (row) => <span>{row.company.industry || "À vérifier"}</span>,
    },
    {
      id: "location",
      header: "Localisation",
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <MapPin
            className="h-icon-xs w-icon-xs text-text-muted"
            aria-hidden="true"
          />
          {row.company.city || row.company.countryCode}
        </span>
      ),
    },
    {
      id: "source",
      header: "Preuve",
      cell: (row) => (
        <span>
          {row.evidence.length} source{row.evidence.length > 1 ? "s" : ""}
        </span>
      ),
    },
    {
      id: "score",
      header: "Score",
      align: "right",
      cell: (row) => <ScoreBadge score={row.score.totalScore} />,
    },
    {
      id: "state",
      header: "État",
      cell: (row) =>
        row.status === "IMPORTED" ? (
          <Badge variant="success">CRM</Badge>
        ) : row.company.reviewState === "DUPLICATE_REVIEW" ? (
          <Badge variant="warning">À rapprocher</Badge>
        ) : (
          <Badge variant="neutral">À examiner</Badge>
        ),
    },
    {
      id: "action",
      header: "",
      align: "right",
      hideInStack: true,
      cell: (row) => (
        <button
          type="button"
          aria-label={`Examiner ${row.company.canonicalName}`}
          onClick={() => void controller.selectCandidate(row.company.id)}
          className="inline-flex h-control-sm w-control-sm items-center justify-center rounded-control text-text-muted hover:bg-bg-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronRight className="h-icon-md w-icon-md" aria-hidden="true" />
        </button>
      ),
    },
  ];

  const handleImport = async () => {
    if (!pendingImportCandidate) return;
    try {
      const result = await controller.importCandidate(pendingImportCandidate);
      setPendingImportCandidate(null);
      toast.success(
        result.duplicateDetected
          ? "Le prospect a été relié au compte CRM existant."
          : "Le prospect a été ajouté au CRM avec sa provenance.",
        "Import validé",
      );
    } catch {
      toast.error("L’import n’a pas pu être finalisé.");
    }
  };

  const requestImport = (candidate: ProspectCandidate) => {
    setPendingImportCandidate(candidate);
    if (!isWide) void controller.selectCandidate(null);
  };

  const closeImportConfirmation = () => {
    const candidate = pendingImportCandidate;
    setPendingImportCandidate(null);
    if (!isWide && candidate) {
      void controller.selectCandidate(candidate.company.id);
    }
  };

  const handleMoveOpportunity = async (
    opportunityId: string,
    stageId: string,
  ) => {
    try {
      await controller.moveOpportunity(opportunityId, stageId);
      toast.success(
        "L’opportunité a changé d’étape et l’activité a été enregistrée.",
      );
    } catch {
      toast.error("Le changement d’étape n’a pas pu être finalisé.");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await controller.completeTask(taskId);
      toast.success("Tâche terminée et ajoutée au journal d’activité.");
    } catch {
      toast.error("La tâche n’a pas pu être terminée.");
    }
  };

  const handleCheckCampaign = async (campaignId: string) => {
    try {
      const preflight = await controller.checkCampaign(campaignId);
      if (preflight.canSend) {
        toast.success(
          `${preflight.audience.eligible} destinataire(s) éligible(s).`,
          "Pré-vol conforme",
        );
      } else {
        toast.warning(
          `${preflight.blockers.length} blocage(s) doivent être corrigé(s).`,
          "Pré-vol à corriger",
        );
      }
      return preflight;
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Pré-vol indisponible.",
      );
      throw cause;
    }
  };

  const crmPanelProps: ProspectsCrmPanelProps = {
    accounts: controller.accounts,
    pipelines: controller.pipelines,
    opportunities: controller.opportunities,
    tasks: controller.tasks,
    activities: controller.activities,
    campaigns: controller.campaigns,
    campaignPreflights: controller.campaignPreflights,
    usage: controller.usage,
    locale: controller.currentLocale,
    currency: controller.currentCurrency,
    weightedPipelineMinor: controller.weightedPipelineMinor,
    pendingActionId: controller.pendingActionId,
    onMoveOpportunity: handleMoveOpportunity,
    onCompleteTask: handleCompleteTask,
    onCheckCampaign: handleCheckCampaign,
    onNavigate: controller.setView,
  };

  if (controller.loading) {
    return (
      <div
        className="flex min-h-80 items-center justify-center"
        role="status"
        aria-label="Chargement de Shongre Prospects"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  if (controller.error && !controller.usage) {
    return (
      <StatePanel
        variant="restricted"
        title="Shongre Prospects n’est pas disponible"
        description={controller.error}
        action={
          <Button variant="primary" onClick={() => void controller.reload()}>
            Réessayer
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <header className="rounded-card border border-border-base bg-bg-surface px-4 py-4 shadow-xs sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-control bg-primary text-white">
                <Target className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-text-main sm:text-2xl">
                Shongre Prospects
              </h1>
            </div>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-muted sm:text-sm">
              De la découverte à la conversion, dans un seul espace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <div className="inline-flex h-control-md items-center rounded-control border border-border-base bg-bg-base px-3 text-micro font-bold text-text-secondary">
              {controller.activeMarket.flag} {controller.activeMarket.name}
            </div>
            {controller.usage && (
              <div className="inline-flex h-control-md max-w-72 items-center truncate rounded-control border border-border-base bg-bg-base px-3 text-micro font-bold text-text-secondary">
                {controller.usage.planName}
              </div>
            )}
            <Button size="sm" onClick={() => controller.setView("discover")}>
              <Search className="h-icon-sm w-icon-sm" aria-hidden="true" />
              <span className="hidden sm:inline">
                Découvrir des entreprises
              </span>
              <span className="sm:hidden">Découvrir</span>
            </Button>
          </div>
        </div>
      </header>

      {!routeBasePath && (
        <Tabs
          tabs={workspaceTabs}
          activeTab={controller.view}
          onChange={controller.setView}
          label="Navigation Shongre Prospects"
          idPrefix="prospecting-workspace"
          variant="underline"
        />
      )}

      {controller.error && (
        <Notice variant="error" title="Action non terminée">
          {controller.error}
        </Notice>
      )}

      <TabPanel
        tab={controller.view}
        idPrefix="prospecting-workspace"
        {...(routeBasePath
          ? {
              role: "region",
              "aria-label": "Contenu de Shongre Prospects",
              "aria-labelledby": undefined,
            }
          : {})}
      >
        {controller.view === "overview" && (
          <UnifiedOverviewPanel {...crmPanelProps} />
        )}

        {controller.view === "discover" && (
          <div className="space-y-4">
            <section
              className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6 lg:p-7"
              aria-labelledby="discover-heading"
            >
              <label
                id="discover-heading"
                htmlFor="prospecting-query"
                className="block text-xl font-semibold tracking-tight text-text-main sm:text-2xl"
              >
                Décrivez les entreprises recherchées
              </label>
              <p
                id="prospecting-query-help"
                className="mt-2 text-sm leading-relaxed text-text-muted sm:text-base"
              >
                Plus vous détaillez votre recherche, plus les résultats seront
                pertinents.
              </p>

              <div className="relative mt-5">
                <Search
                  className="pointer-events-none absolute left-4 top-4 h-icon-lg w-icon-lg text-primary"
                  aria-hidden="true"
                />
                <textarea
                  id="prospecting-query"
                  value={controller.query}
                  maxLength={
                    PROSPECTING_FIELD_CONSTRAINTS.discoveryQueryMaxLength
                  }
                  onChange={(event) => controller.setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      void controller.discover();
                    }
                  }}
                  aria-describedby="prospecting-query-help prospecting-query-count"
                  placeholder="Ex. ateliers automobiles spécialisés en carrosserie à Lyon avec un site professionnel, une expérience de plus de 10 ans et des avis clients positifs"
                  className="min-h-32 w-full resize-y rounded-control border border-border-hover bg-bg-surface py-4 pl-12 pr-20 text-sm leading-6 text-text-main outline-none transition-colors placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 sm:min-h-36 sm:text-base"
                />
                <span
                  id="prospecting-query-count"
                  className="pointer-events-none absolute right-4 top-4 text-xs tabular-nums text-text-muted sm:text-sm"
                  aria-live="polite"
                >
                  {controller.query.length} /{" "}
                  {PROSPECTING_FIELD_CONSTRAINTS.discoveryQueryMaxLength}
                </span>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button
                  variant="primary"
                  size="lg"
                  type="button"
                  onClick={() => void controller.discover()}
                  disabled={controller.searching}
                >
                  {controller.searching ? (
                    <Spinner size="sm" />
                  ) : (
                    <Sparkles
                      className="h-icon-md w-icon-md"
                      aria-hidden="true"
                    />
                  )}
                  {controller.searching ? "Recherche…" : "Découvrir"}
                </Button>
                <p className="flex min-w-0 items-start gap-2 text-sm leading-relaxed text-text-muted">
                  <Lightbulb
                    className="mt-0.5 h-icon-md w-icon-md shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Essayez d’être précis : activité, localisation, services,
                    taille, expérience…
                  </span>
                </p>
              </div>

              <div className="mt-6 border-t border-border-subtle pt-5">
                <details className="group rounded-control bg-bg-subtle px-4 py-3 text-xs text-text-secondary sm:text-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <ListFilter
                        className="h-icon-md w-icon-md shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      Critères appliqués
                    </span>
                    <span className="shrink-0 font-semibold text-primary-hover group-open:hidden">
                      Modifier les critères
                    </span>
                    <span className="hidden shrink-0 font-semibold text-primary group-open:inline">
                      Masquer les critères
                    </span>
                  </summary>
                  <dl className="mt-3 grid gap-3 border-t border-border-subtle pt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-text-muted">Marché</dt>
                      <dd className="font-bold text-text-main">
                        {controller.activeMarket.name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Profil de ciblage</dt>
                      <dd className="font-bold text-text-main">
                        {controller.profiles[0]?.name ?? "Profil par défaut"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Sources recherchables</dt>
                      <dd className="font-bold text-text-main">
                        {
                          controller.sources.filter(
                            (source) =>
                              source.lifecycle === "ACTIVE" &&
                              source.operations.includes("SEARCH"),
                          ).length
                        }
                      </dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Qualité minimale</dt>
                      <dd className="font-bold text-text-main">
                        Site professionnel · données actuelles
                      </dd>
                    </div>
                  </dl>
                </details>
                {visibleDiscoveryExamples.length > 0 && (
                  <div
                    className="mt-4 flex flex-wrap gap-3"
                    aria-label="Exemples de recherche"
                  >
                    {discoveryExamples
                      .filter(({ label }) =>
                        visibleDiscoveryExamples.includes(label),
                      )
                      .map(({ label, icon: ExampleIcon }) => (
                        <div
                          key={label}
                          className="inline-flex min-h-control-sm items-center rounded-control bg-bg-muted text-xs font-semibold text-text-secondary shadow-2xs sm:text-sm"
                        >
                          <button
                            type="button"
                            onClick={() => void controller.discover(label)}
                            className="inline-flex min-h-control-sm items-center gap-2 rounded-l-control py-1.5 pl-3 pr-2 hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <ExampleIcon
                              className="h-icon-sm w-icon-sm shrink-0"
                              aria-hidden="true"
                            />
                            {label}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setVisibleDiscoveryExamples((examples) =>
                                examples.filter((example) => example !== label),
                              )
                            }
                            aria-label={`Retirer la suggestion ${label}`}
                            className="inline-flex min-h-control-sm w-control-sm items-center justify-center rounded-r-control text-text-muted hover:bg-primary-light hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <X
                              className="h-icon-sm w-icon-sm"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </section>

            <div
              className={
                isWide && controller.selectedCandidate
                  ? "grid gap-4 lg:grid-cols-content-aside-lg"
                  : ""
              }
            >
              <section
                className="overflow-hidden rounded-card border border-border-base bg-bg-surface shadow-xs"
                aria-labelledby="prospect-results-heading"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-base px-4 py-3.5 sm:px-5">
                  <div>
                    <h2
                      id="prospect-results-heading"
                      className="text-sm font-bold text-text-main"
                    >
                      Entreprises découvertes
                    </h2>
                    <p
                      className="mt-0.5 text-micro text-text-muted"
                      role="status"
                      aria-live="polite"
                    >
                      {controller.hasSearched
                        ? `${controller.discoverySummary?.measuredTotal ?? controller.candidates.length} résultat${(controller.discoverySummary?.measuredTotal ?? controller.candidates.length) > 1 ? "s" : ""} · revue humaine requise`
                        : "Aucune découverte lancée"}
                    </p>
                    {controller.discoverySummary && (
                      <p className="mt-1 text-micro text-text-muted">
                        Instantané de démonstration généré le{" "}
                        <time
                          dateTime={controller.discoverySummary.generatedAt}
                        >
                          {new Intl.DateTimeFormat(controller.currentLocale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(
                            new Date(controller.discoverySummary.generatedAt),
                          )}
                        </time>{" "}
                        · {controller.discoverySummary.sourceIds.length} source
                        {controller.discoverySummary.sourceIds.length > 1
                          ? "s"
                          : ""}
                      </p>
                    )}
                  </div>
                  {controller.candidates.length > 0 && (
                    <Badge variant="neutral">
                      <ListFilter
                        className="mr-1 h-icon-xs w-icon-xs"
                        aria-hidden="true"
                      />
                      Score décroissant
                    </Badge>
                  )}
                </div>
                {controller.searching ? (
                  <div
                    className="flex min-h-64 items-center justify-center"
                    role="status"
                  >
                    <Spinner size="lg" />
                  </div>
                ) : (
                  <DataTable
                    columns={columns}
                    rows={controller.candidates}
                    getRowKey={(row) => row.company.id}
                    caption="Prospects professionnels découverts"
                    className="px-4 sm:px-0"
                    empty={
                      <EmptyState
                        icon={
                          <Search
                            className="h-8 w-8 text-text-muted"
                            aria-hidden="true"
                          />
                        }
                        title={
                          controller.hasSearched
                            ? "Aucun résultat vérifiable"
                            : "Lancez votre première découverte"
                        }
                        description={
                          controller.hasSearched
                            ? "Aucune entreprise ne correspond à ces termes dans le marché et les sources actuellement autorisés. Élargissez la requête ou consultez l’exemple."
                            : "Décrivez un type d’entreprise pour lancer une recherche sur les sources autorisées de votre organisation."
                        }
                        action={
                          <Button
                            variant="primary"
                            onClick={() =>
                              void controller.discover(
                                controller.hasSearched
                                  ? ""
                                  : "Ateliers automobiles",
                              )
                            }
                          >
                            {controller.hasSearched
                              ? "Élargir à toutes les entreprises"
                              : "Voir un exemple"}
                          </Button>
                        }
                      />
                    }
                  />
                )}
              </section>

              {isWide && controller.selectedCandidate && (
                <aside
                  className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
                  aria-label="Brief du prospect sélectionné"
                >
                  <BriefContent
                    candidate={controller.selectedCandidate}
                    brief={controller.brief}
                    loading={controller.briefLoading}
                    importing={
                      controller.importingId ===
                      controller.selectedCandidate.company.id
                    }
                    sources={controller.sources}
                    locale={controller.currentLocale}
                    onImport={() => {
                      const candidate = controller.selectedCandidate;
                      if (candidate) requestImport(candidate);
                    }}
                  />
                </aside>
              )}
            </div>
          </div>
        )}

        {controller.view === "sources" &&
          (controller.sources.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {controller.sources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-text-main">
                        {source.name}
                      </h2>
                      <p className="mt-1 text-xs leading-relaxed text-text-muted">
                        {source.description}
                      </p>
                    </div>
                    <Badge
                      variant={
                        sourceLifecyclePresentation[source.lifecycle].variant
                      }
                    >
                      {sourceLifecyclePresentation[source.lifecycle].label}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="text-micro font-semibold uppercase tracking-wider text-text-muted">
                        Marchés
                      </dt>
                      <dd className="mt-1 font-bold text-text-main">
                        {source.supportedMarketCodes.join(", ")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-micro font-semibold uppercase tracking-wider text-text-muted">
                        Rétention
                      </dt>
                      <dd className="mt-1 font-bold text-text-main">
                        {source.restrictions.retentionDays
                          ? `${source.restrictions.retentionDays} jours`
                          : "Selon contrat"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-micro font-semibold uppercase tracking-wider text-text-muted">
                        Opérations
                      </dt>
                      <dd className="mt-1 font-bold text-text-main">
                        {source.operations
                          .map((operation) => sourceOperationLabels[operation])
                          .join(", ")}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-1 border-t border-border-subtle pt-3 text-micro leading-relaxed text-text-muted">
                    <p>{source.healthMessage}</p>
                    <p>
                      Fraîcheur déclarée : {source.dataFreshnessLabel}.
                      {source.lastHealthCheckAt && (
                        <>
                          {" "}
                          Dernier contrôle le{" "}
                          <time dateTime={source.lastHealthCheckAt}>
                            {formatEvidenceDate(
                              source.lastHealthCheckAt,
                              controller.currentLocale,
                            )}
                          </time>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={
                <Database
                  className="h-8 w-8 text-text-muted"
                  aria-hidden="true"
                />
              }
              title="Aucune source disponible"
              description="Aucune source de prospection n’est autorisée pour le marché actif. Aucune découverte ne sera lancée."
              action={null}
            />
          ))}

        {controller.view === "usage" && <UsagePanel usage={controller.usage} />}

        {controller.view === "compliance" && (
          <div className="space-y-4">
            <header className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-success-surface text-success">
                  <ShieldCheck
                    className="h-icon-md w-icon-md"
                    aria-hidden="true"
                  />
                </span>
                <div>
                  <h2 className="text-base font-bold text-text-main">
                    Paramètres et conformité
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    Configuration en lecture seule dans la démonstration. Les
                    droits du tenant et du marché restent appliqués à chaque
                    opération.
                  </p>
                </div>
              </div>
            </header>
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
                <h3 className="text-sm font-bold text-text-main">
                  Contrôles avant prise de contact
                </h3>
                <ul className="mt-4 space-y-3 text-xs text-text-secondary">
                  {[
                    "Finalité professionnelle et autorisation du tenant",
                    "Source éligible et provenance conservée",
                    "Quota et droits actifs",
                    "Objections et suppressions",
                    "Identité d’envoi vérifiée",
                    "Lien de désinscription et fréquence",
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <Check
                        className="mt-0.5 h-icon-sm w-icon-sm shrink-0 text-success"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs">
                <h3 className="text-sm font-bold text-text-main">
                  État des intégrations
                </h3>
                <dl className="mt-4 divide-y divide-border-subtle text-xs">
                  {[
                    ["Sources externes", "Inactives"],
                    ["Fournisseur IA", "Moteur déterministe local"],
                    ["Envoi e-mail", "Inactif"],
                    ["Webhooks", "Inactifs"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <dt className="text-text-muted">{label}</dt>
                      <dd className="text-right font-bold text-text-main">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
            <Notice
              variant="warning"
              title="Activation de production distincte"
            >
              Les sources, fournisseurs IA et canaux d’envoi externes restent
              inactifs tant que les contrats, identifiants et validations
              juridiques par marché ne sont pas fournis.
            </Notice>
          </div>
        )}

        {controller.view === "companies" && (
          <CompaniesPanel
            accounts={controller.accounts}
            opportunities={controller.opportunities}
            locale={controller.currentLocale}
            onNavigate={controller.setView}
          />
        )}

        {controller.view === "pipeline" && (
          <FullPipelinePanel {...crmPanelProps} />
        )}

        {controller.view === "tasks" && <FullTasksPanel {...crmPanelProps} />}

        {controller.view === "campaigns" && (
          <CampaignsPanel
            {...crmPanelProps}
            suppressionCount={controller.suppressions.length}
          />
        )}
      </TabPanel>

      {!isWide && (
        <Drawer
          isOpen={Boolean(controller.selectedCandidate)}
          onClose={() => void controller.selectCandidate(null)}
          title="Brief et preuves"
          position="bottom"
        >
          {controller.selectedCandidate && (
            <BriefContent
              candidate={controller.selectedCandidate}
              brief={controller.brief}
              loading={controller.briefLoading}
              importing={
                controller.importingId ===
                controller.selectedCandidate.company.id
              }
              sources={controller.sources}
              locale={controller.currentLocale}
              onImport={() => {
                const candidate = controller.selectedCandidate;
                if (candidate) requestImport(candidate);
              }}
            />
          )}
        </Drawer>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingImportCandidate)}
        onClose={closeImportConfirmation}
        onConfirm={() => void handleImport()}
        title={
          pendingImportCandidate?.company.reviewState === "DUPLICATE_REVIEW"
            ? "Relier ce prospect au compte existant ?"
            : "Ajouter ce prospect au CRM ?"
        }
        message={
          pendingImportCandidate?.company.reviewState === "DUPLICATE_REVIEW"
            ? "Cette confirmation relie l’entreprise au doublon détecté, conserve les preuves et crée le suivi commercial prévu. Aucun message externe n’est envoyé."
            : "Cette confirmation crée l’entreprise, son opportunité de qualification et sa prochaine tâche en conservant les preuves. Aucun message externe n’est envoyé."
        }
        confirmText={
          pendingImportCandidate?.company.reviewState === "DUPLICATE_REVIEW"
            ? "Confirmer le rapprochement"
            : "Ajouter au CRM"
        }
        cancelText="Revenir aux preuves"
        variant="primary"
        isLoading={Boolean(controller.importingId)}
      />

      <footer className="flex flex-wrap items-center gap-2 text-micro leading-relaxed text-text-muted">
        <CircleAlert
          className="h-icon-sm w-icon-sm shrink-0"
          aria-hidden="true"
        />
        Chaque découverte, import et campagne reste soumis aux droits du tenant,
        aux quotas, à la provenance et aux contrôles de conformité du marché.
      </footer>
    </div>
  );
};
