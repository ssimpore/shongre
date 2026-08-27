import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
  UserRound,
  XCircle,
} from "lucide-react";
import type {
  CrmActivity,
  CrmOpportunity,
  CrmPipeline,
  CrmProduct,
  CrmQuote,
  CrmTask,
} from "@shongre/contracts/crm";
import { CRM_FIELD_CONSTRAINTS } from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

function money(amountMinor: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

const activityPresentation: Record<
  string,
  {
    label: string;
    tone: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  CALL_COMPLETED: {
    label: "Appel terminé",
    tone: "bg-info-surface text-info",
    icon: Phone,
  },
  EMAIL_SENT: {
    label: "Email envoyé",
    tone: "bg-violet-50 text-violet-700",
    icon: Mail,
  },
  EMAIL_RECEIVED: {
    label: "Email reçu",
    tone: "bg-violet-50 text-violet-700",
    icon: Mail,
  },
  NOTE_CREATED: {
    label: "Note",
    tone: "bg-warning-surface text-warning",
    icon: MessageSquareText,
  },
  TASK_COMPLETED: {
    label: "Tâche terminée",
    tone: "bg-success-surface text-success",
    icon: CheckCircle2,
  },
  STAGE_CHANGED: {
    label: "Étape modifiée",
    tone: "bg-primary-light text-primary",
    icon: Target,
  },
  OPPORTUNITY_WON: {
    label: "Opportunité gagnée",
    tone: "bg-success-surface text-success",
    icon: CheckCircle2,
  },
  OPPORTUNITY_LOST: {
    label: "Opportunité perdue",
    tone: "bg-danger-surface text-danger",
    icon: XCircle,
  },
};

export const CrmOpportunityDetailPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLocale } = useMarketLocation();
  const toast = useToast();
  const [opportunity, setOpportunity] = useState<CrmOpportunity | null>(null);
  const [pipeline, setPipeline] = useState<CrmPipeline | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [quotes, setQuotes] = useState<CrmQuote[]>([]);
  const [products, setProducts] = useState<CrmProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [closeMode, setCloseMode] = useState<"won" | "lost" | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [lossDetail, setLossDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quoteProductId, setQuoteProductId] = useState("");
  const [quoteQuantity, setQuoteQuantity] = useState("1");
  const [quoteValidUntil, setQuoteValidUntil] = useState("");

  usePageMeta({
    title: opportunity
      ? `${opportunity.name} | CRM Shongre`
      : "Opportunité CRM | Shongre",
    description: "Vue commerciale complète de l’opportunité.",
    canonicalPath: id ? `/admin/crm/opportunites/${id}` : undefined,
    noIndex: true,
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [item, pipelineList, taskPage, quotePage, productPage] =
        await Promise.all([
          services.crm.getOpportunity(id),
          services.crm.listPipelines(),
          services.crm.listTasks({ limit: 100 }),
          services.crm.listQuotes({ limit: 100, opportunityId: id }),
          services.crm.listProducts({ limit: 100 }),
        ]);
      setOpportunity(item);
      setPipeline(
        pipelineList.find((value) => value.id === item.pipelineId) ?? null,
      );
      setTasks(taskPage.items.filter((task) => task.opportunityId === item.id));
      setQuotes(quotePage.items);
      setProducts(productPage.items.filter((product) => product.isActive));
      setActivities(await services.crm.listActivities("opportunity", item.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Opportunité introuvable.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const currentStageIndex = useMemo(
    () =>
      pipeline?.stages.findIndex(
        (stage) => stage.id === opportunity?.stageId,
      ) ?? -1,
    [pipeline, opportunity?.stageId],
  );

  const transition = async (stageId: string) => {
    if (!opportunity || !pipeline) return;
    const stage = pipeline.stages.find((item) => item.id === stageId);
    if (!stage) return;
    if (stage.isWon || stage.isLost) {
      setCloseMode(stage.isWon ? "won" : "lost");
      return;
    }
    setSubmitting(true);
    try {
      const updated = await services.crm.transitionOpportunity(opportunity.id, {
        stageId,
        expectedVersion: opportunity.version,
      });
      setOpportunity(updated);
      setActivities(
        await services.crm.listActivities("opportunity", updated.id),
      );
      toast.success(`Étape mise à jour : ${stage.name}.`);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Transition impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const closeOpportunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunity || !pipeline || !closeMode) return;
    if (closeMode === "lost" && !lossReason) {
      toast.error("Le motif de perte est obligatoire.");
      return;
    }
    const stage = pipeline.stages.find((item) =>
      closeMode === "won" ? item.isWon : item.isLost,
    );
    if (!stage) return;
    setSubmitting(true);
    try {
      const updated = await services.crm.transitionOpportunity(opportunity.id, {
        stageId: stage.id,
        expectedVersion: opportunity.version,
        lossReason: closeMode === "lost" ? lossReason : undefined,
        lossDetail: closeMode === "lost" ? lossDetail || undefined : undefined,
        contractValue: closeMode === "won" ? opportunity.amount : undefined,
        onboardingStatus: closeMode === "won" ? "à_planifier" : undefined,
      });
      setOpportunity(updated);
      setActivities(
        await services.crm.listActivities("opportunity", updated.id),
      );
      setCloseMode(null);
      toast.success(
        closeMode === "won"
          ? "Opportunité gagnée."
          : "Opportunité perdue enregistrée.",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Clôture impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunity || !note.trim()) return;
    setSubmitting(true);
    try {
      const activity = await services.crm.createActivity({
        entityType: "opportunity",
        entityId: opportunity.id,
        activityType: "NOTE_CREATED",
        title: "Note commerciale",
        description: note.trim(),
      });
      setActivities((items) => [activity, ...items]);
      setNote("");
      setNoteOpen(false);
      toast.success("Note ajoutée à l’historique.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Note non enregistrée.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const completeTask = async (task: CrmTask) => {
    try {
      const updated = await services.crm.completeTask(task.id, task.version);
      setTasks((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success("Tâche terminée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Tâche non mise à jour.",
      );
    }
  };

  const createQuote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!opportunity?.accountId || !quoteProductId) return;
    const product = products.find((item) => item.id === quoteProductId);
    const price =
      product?.prices.find(
        (item) => item.amount.currency === opportunity.amount.currency,
      ) ?? product?.prices[0];
    const quantity = Number(quoteQuantity);
    if (!product || !price || !Number.isFinite(quantity) || quantity <= 0)
      return;
    const subtotal = Math.round(quantity * price.amount.amountMinor);
    setSubmitting(true);
    try {
      const quote = await services.crm.createQuote({
        accountId: opportunity.accountId,
        opportunityId: opportunity.id,
        currency: price.amount.currency,
        validUntil: quoteValidUntil || undefined,
        items: [
          {
            productId: product.id,
            description: product.name,
            quantity,
            unitAmountMinor: price.amount.amountMinor,
            discountMinor: 0,
            taxMinor: Math.round(subtotal * 0.2),
          },
        ],
      });
      setQuotes((items) => [quote, ...items]);
      setQuoteOpen(false);
      setQuoteProductId("");
      setQuoteQuantity("1");
      setQuoteValidUntil("");
      toast.success(`Devis ${quote.quoteNumber} créé.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Devis non créé.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!opportunity || !pipeline || error) {
    return (
      <section className="rounded-2xl border border-border-base bg-white p-8 text-center shadow-xs">
        <CircleAlert
          className="mx-auto h-8 w-8 text-danger"
          aria-hidden="true"
        />
        <h1 className="mt-3 text-lg font-black text-stone-900">
          Opportunité introuvable
        </h1>
        <p className="mt-1 text-sm text-stone-500">{error}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/crm/pipeline")}
          >
            <ArrowLeft className="h-icon-md w-icon-md" /> Pipeline
          </Button>
          <Button size="sm" onClick={() => void load()}>
            <RefreshCw className="h-icon-md w-icon-md" /> Réessayer
          </Button>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <section className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-950 text-white shadow-sm">
        <div className="p-5 sm:p-6">
          <Link
            to="/admin/crm/pipeline"
            className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-stone-400 hover:text-white"
          >
            <ArrowLeft className="h-icon-sm w-icon-sm" aria-hidden="true" />{" "}
            Pipeline
          </Link>
          <div className="mt-3 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-micro font-bold ${opportunity.status === "won" ? "bg-emerald-950 text-emerald-300" : opportunity.status === "lost" ? "bg-rose-950 text-rose-300" : "bg-primary/15 text-orange-200"}`}
                >
                  {opportunity.stageName}
                </span>
                <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
                  {opportunity.forecastCategory.replace("_", " ")}
                </span>
              </div>
              <h1 className="mt-2 max-w-3xl text-2xl font-black leading-tight tracking-tight sm:text-3xl">
                {opportunity.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-400">
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="h-icon-sm w-icon-sm" />{" "}
                  {opportunity.accountName ?? "Sans entreprise"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-icon-sm w-icon-sm" />{" "}
                  {opportunity.ownerName ?? "Non assignée"}
                </span>
                {opportunity.expectedCloseDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-icon-sm w-icon-sm" /> Clôture{" "}
                    {new Intl.DateTimeFormat(currentLocale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(
                      new Date(`${opportunity.expectedCloseDate}T12:00:00`),
                    )}
                  </span>
                )}
              </div>
            </div>
            <div className="xl:text-right">
              <strong className="block text-3xl font-black tabular-nums">
                {money(
                  opportunity.amount.amountMinor,
                  opportunity.amount.currency,
                  currentLocale,
                )}
              </strong>
              <span className="text-xs text-stone-400">
                {opportunity.probability}% de probabilité
              </span>
              <div className="mt-3 flex flex-wrap gap-2 xl:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
                  onClick={() => setNoteOpen(true)}
                >
                  <MessageSquareText className="h-icon-md w-icon-md" /> Ajouter
                  une note
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
                  onClick={() => setQuoteOpen(true)}
                  disabled={!opportunity.accountId}
                >
                  <FileText className="h-icon-md w-icon-md" /> Devis
                </Button>
                {opportunity.status === "open" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCloseMode("won")}
                  >
                    <CheckCircle2 className="h-icon-md w-icon-md" /> Gagnée
                  </Button>
                )}
                {opportunity.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
                    onClick={() => setCloseMode("lost")}
                  >
                    <XCircle className="h-icon-md w-icon-md" /> Perdue
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-stone-800 px-4 py-4 sm:px-6">
          <div className="flex min-w-3xl items-start">
            {pipeline.stages.map((stage, index) => {
              const complete = index <= currentStageIndex && !stage.isLost;
              const current = stage.id === opportunity.stageId;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => void transition(stage.id)}
                  disabled={submitting || current}
                  aria-current={current ? "step" : undefined}
                  className="group relative flex flex-1 flex-col items-center gap-1 text-center disabled:cursor-default"
                >
                  {index > 0 && (
                    <span
                      className={`absolute right-1/2 top-3 h-0.5 w-full ${complete ? "bg-primary" : "bg-stone-700"}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-raised inline-flex h-6 w-6 items-center justify-center rounded-full border-2 text-micro font-black ${current ? "border-primary bg-primary text-white ring-4 ring-primary/15" : complete ? "border-primary bg-primary text-white" : "border-stone-600 bg-stone-900 text-stone-400"}`}
                  >
                    {complete ? (
                      <Check
                        className="h-icon-sm w-icon-sm"
                        aria-hidden="true"
                      />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={`text-micro font-bold ${current ? "text-white" : "text-stone-500 group-hover:text-stone-300"}`}
                  >
                    {stage.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-black text-stone-950">
                  Historique commercial
                </h2>
                <p className="text-micro text-stone-500">
                  Journal immuable des échanges et changements
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNoteOpen(true)}
              >
                <Plus className="h-icon-md w-icon-md" /> Note
              </Button>
            </div>
            <div className="p-5">
              {activities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 p-8 text-center">
                  <Clock3 className="mx-auto h-icon-xl w-icon-xl text-stone-400" />
                  <p className="mt-2 text-xs font-bold text-stone-700">
                    Aucune activité
                  </p>
                  <p className="text-micro text-stone-500">
                    Les appels, emails, notes et transitions apparaîtront ici.
                  </p>
                </div>
              ) : (
                <ol className="relative space-y-5 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-px before:bg-stone-200">
                  {activities.map((activity) => {
                    const presentation = activityPresentation[
                      activity.activityType
                    ] ?? {
                      label: activity.activityType,
                      tone: "bg-stone-100 text-stone-700",
                      icon: Clock3,
                    };
                    const Icon = presentation.icon;
                    return (
                      <li key={activity.id} className="relative flex gap-3">
                        <span
                          className={`relative z-raised inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${presentation.tone}`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <strong className="text-xs font-black text-stone-900">
                              {activity.title}
                            </strong>
                            <time className="text-micro text-stone-500">
                              {new Intl.DateTimeFormat(currentLocale, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(activity.occurredAt))}
                            </time>
                          </div>
                          <p className="mt-0.5 text-micro font-semibold text-stone-500">
                            {presentation.label} · {activity.actorName}
                          </p>
                          {activity.description && (
                            <p className="mt-1.5 rounded-lg bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-700">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-black text-stone-950">
                  Tâches liées
                </h2>
                <p className="text-micro text-stone-500">
                  Relances et prochaines étapes
                </p>
              </div>
              <Link
                to="/admin/crm/taches"
                className="text-xs font-bold text-primary hover:underline"
              >
                Toutes les tâches
              </Link>
            </div>
            <div className="divide-y divide-border-subtle px-5">
              {tasks.length === 0 ? (
                <p className="py-7 text-center text-xs text-stone-500">
                  Aucune tâche associée.
                </p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        task.status !== "completed" && void completeTask(task)
                      }
                      aria-label={`Marquer « ${task.title} » comme terminée`}
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${task.status === "completed" ? "border-success-border bg-success-surface text-success" : "border-stone-200 text-stone-400 hover:border-success-border hover:text-success"}`}
                    >
                      <Check className="h-icon-md w-icon-md" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-bold ${task.status === "completed" ? "text-stone-400 line-through" : "text-stone-900"}`}
                      >
                        {task.title}
                      </p>
                      <p className="text-micro text-stone-500">
                        {new Intl.DateTimeFormat(currentLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(task.dueAt))}{" "}
                        · {task.ownerName ?? "Non assignée"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-micro font-bold ${task.priority === "urgent" ? "bg-danger-surface text-danger" : task.priority === "high" ? "bg-primary-light text-primary" : "bg-stone-100 text-stone-600"}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-black text-stone-950">Devis</h2>
                <p className="text-micro text-stone-500">
                  Propositions chiffrées liées à l’opportunité
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuoteOpen(true)}
                disabled={!opportunity.accountId}
              >
                <Plus className="h-icon-md w-icon-md" /> Créer
              </Button>
            </div>
            <div className="divide-y divide-border-subtle px-5">
              {quotes.length === 0 ? (
                <p className="py-7 text-center text-xs text-stone-500">
                  Aucun devis associé.
                </p>
              ) : (
                quotes.map((quote) => (
                  <article
                    key={quote.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-700">
                      <FileText className="h-icon-md w-icon-md" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-xs">
                        {quote.quoteNumber}
                      </strong>
                      <p className="text-micro text-stone-500">
                        {quote.items.length} ligne(s) · valable{" "}
                        {quote.validUntil
                          ? new Intl.DateTimeFormat(currentLocale, {
                              dateStyle: "medium",
                            }).format(new Date(`${quote.validUntil}T12:00:00`))
                          : "sans échéance"}
                      </p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-micro font-bold text-stone-600">
                      {quote.status}
                    </span>
                    <strong className="text-xs tabular-nums">
                      {money(quote.totalMinor, quote.currency, currentLocale)}
                    </strong>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
            <h2 className="text-sm font-black text-stone-950">Informations</h2>
            <dl className="mt-3 divide-y divide-border-subtle text-xs">
              {[
                ["Pipeline", opportunity.pipelineName],
                ["Étape", opportunity.stageName],
                ["Prévision", opportunity.forecastCategory.replace("_", " ")],
                ["Source", opportunity.source.replace("_", " ")],
                ["Propriétaire", opportunity.ownerName ?? "Non assignée"],
                ["Équipe", opportunity.teamName ?? "Non assignée"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="text-right font-bold text-stone-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {opportunity.nextStep && (
              <div className="mt-3 rounded-xl border border-primary/15 bg-primary-light p-3">
                <span className="text-micro font-bold uppercase tracking-wider text-primary">
                  Prochaine étape
                </span>
                <p className="mt-1 text-xs font-semibold text-stone-800">
                  {opportunity.nextStep}
                </p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-stone-800 bg-stone-950 p-4 text-white shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="h-icon-md w-icon-md text-primary" />
              <h2 className="text-sm font-black">Assistant commercial</h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              Rédigez une relance ou résumez l’historique avec le fournisseur IA
              autorisé par votre tenant.
            </p>
            <div className="mt-3 rounded-xl border border-stone-800 bg-stone-900 p-3 text-micro text-stone-400">
              <Bot className="mb-1.5 h-icon-md w-icon-md text-stone-500" />
              Aucun fournisseur IA personnel actif. Le CRM reste entièrement
              fonctionnel sans IA.
            </div>
            <Button
              to="/admin/fournisseurs"
              variant="outline"
              size="sm"
              className="mt-3 w-full border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
            >
              <Settings2 className="h-icon-md w-icon-md" /> Configurer les
              fournisseurs
            </Button>
          </section>

          <section className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Mail className="h-icon-md w-icon-md text-primary" />
              <h2 className="text-sm font-black text-stone-950">
                Communication
              </h2>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-stone-500">
              L’envoi exige une connexion Mailbox ou Email Delivery explicite.
              Aucun fallback financé par Shongre.
            </p>
            <Button
              to="/admin/fournisseurs"
              variant="outline"
              size="sm"
              className="mt-3 w-full"
            >
              <Mail className="h-icon-md w-icon-md" /> Connecter une messagerie
            </Button>
          </section>
        </aside>
      </div>

      <Modal
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Ajouter une note"
        description="La note sera ajoutée à l’historique immuable de l’opportunité."
      >
        <form onSubmit={addNote} className="space-y-4 text-xs">
          <FormField label="Note commerciale" required>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="Décisions, objections, engagements ou prochaine étape…"
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNoteOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        title="Créer un devis"
        description="Les totaux et taxes sont calculés en unités monétaires mineures côté service."
      >
        <form onSubmit={createQuote} className="space-y-4 text-xs">
          <FormField label="Produit" required>
            <Select
              aria-label="Produit du devis"
              value={quoteProductId}
              onChange={(event) => setQuoteProductId(event.target.value)}
              options={[
                { value: "", label: "Sélectionner…" },
                ...products.map((product) => ({
                  value: product.id,
                  label: product.name,
                })),
              ]}
              required
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Quantité" required>
              <Input
                type="number"
                min={CRM_FIELD_CONSTRAINTS.quoteQuantityMin}
                step={CRM_FIELD_CONSTRAINTS.quoteQuantityStep}
                value={quoteQuantity}
                onChange={(event) => setQuoteQuantity(event.target.value)}
                required
              />
            </FormField>
            <FormField label="Valable jusqu’au">
              <Input
                type="date"
                value={quoteValidUntil}
                onChange={(event) => setQuoteValidUntil(event.target.value)}
              />
            </FormField>
          </div>
          {quoteProductId &&
            (() => {
              const product = products.find(
                (item) => item.id === quoteProductId,
              );
              const price = product?.prices[0];
              return price ? (
                <div className="rounded-xl bg-stone-50 p-3">
                  <span className="text-stone-500">Prix unitaire</span>
                  <strong className="ml-2">
                    {money(
                      price.amount.amountMinor,
                      price.amount.currency,
                      currentLocale,
                    )}
                  </strong>
                  <p className="mt-1 text-micro text-stone-500">
                    TVA de démonstration : 20 %. Le backend reste autoritaire
                    sur les totaux.
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-warning-surface p-3 text-warning">
                  Ce produit n’a pas de prix actif.
                </p>
              );
            })()}
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuoteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !quoteProductId}
            >
              {submitting ? "Création…" : "Créer le devis"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(closeMode)}
        onClose={() => setCloseMode(null)}
        title={
          closeMode === "won"
            ? "Confirmer l’opportunité gagnée"
            : "Enregistrer l’opportunité perdue"
        }
        description={opportunity.name}
      >
        <form onSubmit={closeOpportunity} className="space-y-4 text-xs">
          {closeMode === "won" ? (
            <div className="rounded-xl border border-success-border bg-success-surface p-4">
              <div className="flex items-center gap-2 font-black text-success">
                <CheckCircle2 className="h-icon-lg w-icon-lg" /> Contrat de{" "}
                {money(
                  opportunity.amount.amountMinor,
                  opportunity.amount.currency,
                  currentLocale,
                )}
              </div>
              <p className="mt-1 text-success">
                La clôture est auditée et prépare l’onboarding sans modifier la
                source de vérité Billing.
              </p>
            </div>
          ) : (
            <>
              <FormField label="Motif de perte" required>
                <Select
                  aria-label="Motif de perte"
                  value={lossReason}
                  onChange={(event) => setLossReason(event.target.value)}
                  options={[
                    { value: "", label: "Sélectionner…" },
                    { value: "budget", label: "Budget insuffisant" },
                    { value: "concurrent", label: "Concurrent retenu" },
                    { value: "timing", label: "Calendrier reporté" },
                    { value: "no_need", label: "Besoin non confirmé" },
                    { value: "no_response", label: "Absence de réponse" },
                    { value: "other", label: "Autre" },
                  ]}
                />
              </FormField>
              <FormField label="Précisions">
                <Textarea
                  value={lossDetail}
                  onChange={(event) => setLossDetail(event.target.value)}
                  rows={3}
                />
              </FormField>
            </>
          )}
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloseMode(null)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Validation…" : "Confirmer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
