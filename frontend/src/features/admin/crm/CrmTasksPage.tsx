import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  Circle,
  Filter,
  Plus,
} from "lucide-react";
import type {
  CrmAccount,
  CrmContact,
  CrmOpportunity,
  CrmTask,
  CrmTaskInput,
} from "@shongre/contracts/crm";
import { services } from "../../../api/client/service-registry";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import {
  FormField,
  Input,
  Select,
  Textarea,
} from "../../../design-system/primitives/FormField";
import { EmptyState, Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";
import { useCrmSurface } from "../../crm/CrmSurfaceContext";
import { useTranslation } from "../../../i18n/I18nProvider";
import {
  CRM_TASK_PRIORITIES,
  taskPriorityMessageKey,
} from "../../../domains/crm/crm.labels";
import { taskPriorityToneClass } from "./crm.presentation";

type TaskFilter = "pending" | "completed" | "all";
type RelatedType = "none" | "account" | "contact" | "opportunity";

function defaultDueDate() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  date.setMinutes(0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export const CrmTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const crmPaths = useCrmSurface();
  const priorityLabel = (priority: string) => {
    const key = taskPriorityMessageKey(priority);
    return key ? t(key) : priority;
  };
  usePageMeta({
    title: t("admin.crmTasksPage.tachesCrmShongre"),
    description: t(
      "admin.crmTasksPage.planificationEtSuiviDesRelancesCommerciales",
    ),
    canonicalPath: crmPaths.tasks,
    noIndex: true,
  });
  const toast = useToast();
  const { activeMarket, currentLocale } = useMarketLocation();
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState(defaultDueDate);
  const [priority, setPriority] = useState<CrmTask["priority"]>("medium");
  const [relatedType, setRelatedType] = useState<RelatedType>("none");
  const [relatedId, setRelatedId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [taskPage, accountPage, contactPage, opportunityPage] =
        await Promise.all([
          services.crm.listTasks({ limit: 100 }),
          services.crm.listAccounts({ limit: 100 }),
          services.crm.listContacts({ limit: 100 }),
          services.crm.listOpportunities({ limit: 100 }),
        ]);
      const marketAccounts =
        crmPaths.kind === "admin"
          ? accountPage.items
          : accountPage.items.filter(
              (account) => account.marketCode === activeMarket.code,
            );
      const marketAccountIds = new Set(
        marketAccounts.map((account) => account.id),
      );
      const marketContacts =
        crmPaths.kind === "admin"
          ? contactPage.items
          : contactPage.items.filter(
              (contact) => contact.country === activeMarket.countryCode,
            );
      const marketContactIds = new Set(
        marketContacts.map((contact) => contact.id),
      );
      const marketOpportunities =
        crmPaths.kind === "admin"
          ? opportunityPage.items
          : opportunityPage.items.filter((opportunity) =>
              opportunity.accountId
                ? marketAccountIds.has(opportunity.accountId)
                : false,
            );
      const marketOpportunityIds = new Set(
        marketOpportunities.map((opportunity) => opportunity.id),
      );
      const marketTasks =
        crmPaths.kind === "admin"
          ? taskPage.items
          : taskPage.items.filter(
              (task) =>
                (task.accountId
                  ? marketAccountIds.has(task.accountId)
                  : false) ||
                (task.contactId
                  ? marketContactIds.has(task.contactId)
                  : false) ||
                (task.opportunityId
                  ? marketOpportunityIds.has(task.opportunityId)
                  : false),
            );
      setTasks(marketTasks);
      setAccounts(marketAccounts);
      setContacts(marketContacts);
      setOpportunities(marketOpportunities);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Tâches indisponibles.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [activeMarket.code, activeMarket.countryCode, crmPaths.kind]);

  const entityLabels = useMemo(() => {
    const values = new Map<string, string>();
    accounts.forEach((item) => values.set(item.id, item.name));
    contacts.forEach((item) => values.set(item.id, item.fullName));
    opportunities.forEach((item) => values.set(item.id, item.name));
    return values;
  }, [accounts, contacts, opportunities]);

  const relatedOptions = useMemo(() => {
    if (relatedType === "account")
      return accounts.map((item) => ({ value: item.id, label: item.name }));
    if (relatedType === "contact")
      return contacts.map((item) => ({ value: item.id, label: item.fullName }));
    if (relatedType === "opportunity")
      return opportunities.map((item) => ({
        value: item.id,
        label: item.name,
      }));
    return [];
  }, [accounts, contacts, opportunities, relatedType]);

  const visibleTasks = tasks.filter((task) =>
    filter === "pending"
      ? task.status === "pending" || task.status === "in_progress"
      : filter === "completed"
        ? task.status === "completed"
        : true,
  );
  const counts = {
    pending: tasks.filter(
      (task) => task.status === "pending" || task.status === "in_progress",
    ).length,
    completed: tasks.filter((task) => task.status === "completed").length,
    overdue: tasks.filter(
      (task) =>
        task.status !== "completed" &&
        new Date(task.dueAt).getTime() < Date.now(),
    ).length,
  };

  const complete = async (task: CrmTask) => {
    if (task.status === "completed") return;
    try {
      const updated = await services.crm.completeTask(task.id, task.version);
      setTasks((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success("Tâche terminée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const relation =
      relatedType !== "none" && relatedId
        ? { [`${relatedType}Id`]: relatedId }
        : {};
    const input: CrmTaskInput = {
      type: "follow_up",
      title: title.trim(),
      description: description.trim() || undefined,
      dueAt: new Date(dueAt).toISOString(),
      priority,
      ...relation,
    };
    setSubmitting(true);
    try {
      const created = await services.crm.createTask(input);
      setTasks((items) => [created, ...items]);
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setDueAt(defaultDueDate());
      setPriority("medium");
      setRelatedType("none");
      setRelatedId("");
      toast.success("Tâche créée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Création impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const relationName = (task: CrmTask) =>
    entityLabels.get(
      task.opportunityId ?? task.contactId ?? task.accountId ?? "",
    ) ?? "Sans relation";

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-text-inverse sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-violet-300">
              {t("admin.crmTasksPage.crmExecution")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {t("admin.crmTasksPage.tachesRelances")}
            </h1>
            <p className="mt-1 text-xs text-text-disabled">
              {t(
                "admin.crmTasksPage.uneFileDActionPartageeRelieeAuxComptesEtOpportunites",
              )}
            </p>
          </div>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-icon-md w-icon-md" />{" "}
            {t("admin.crmTasksPage.nouvelleTache")}
          </Button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-control bg-stone-900 p-3">
            <span className="text-micro text-text-disabled">
              {t("admin.crmTasksPage.aFaire")}
            </span>
            <strong className="block text-xl font-bold">
              {counts.pending}
            </strong>
          </div>
          <div className="rounded-control bg-stone-900 p-3">
            <span className="text-micro text-text-disabled">En retard</span>
            <strong className="block text-xl font-bold text-red-300">
              {counts.overdue}
            </strong>
          </div>
          <div className="rounded-control bg-stone-900 p-3">
            <span className="text-micro text-text-disabled">
              {t("admin.crmTasksPage.terminees")}
            </span>
            <strong className="block text-xl font-bold text-emerald-300">
              {counts.completed}
            </strong>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-border-base bg-bg-surface shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <div className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-stone-500">
            <Filter className="h-icon-sm w-icon-sm" /> Vue
          </div>
          <div
            className="flex rounded-lg bg-stone-100 p-1"
            role="tablist"
            aria-label={t("admin.crmTasksPage.filtrerLesTaches")}
          >
            {(["pending", "completed", "all"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => setFilter(value)}
                className={`rounded-md px-3 py-1.5 text-micro font-semibold ${filter === value ? "bg-bg-surface text-stone-950 shadow-xs" : "text-stone-500"}`}
              >
                {value === "pending"
                  ? `À faire (${counts.pending})`
                  : value === "completed"
                    ? `Terminées (${counts.completed})`
                    : `Toutes (${tasks.length})`}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-16 rounded-control" />
            ))}
          </div>
        ) : visibleTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="h-8 w-8" />}
            title={t("admin.crmTasksPage.aucuneTacheDansCetteVue")}
            description={t(
              "admin.crmTasksPage.lesProchainesActionsCommercialesApparaitrontIci",
            )}
            className="border-0 shadow-none"
            action={
              <Button size="sm" onClick={() => setModalOpen(true)}>
                {t("admin.crmTasksPage.creerUneTache")}
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {visibleTasks.map((task) => {
              const done = task.status === "completed";
              const overdue =
                !done && new Date(task.dueAt).getTime() < Date.now();
              return (
                <article
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-stone-50"
                >
                  <button
                    type="button"
                    disabled={done}
                    onClick={() => void complete(task)}
                    aria-label={
                      done
                        ? `${task.title}, terminée`
                        : `Marquer ${task.title} comme terminée`
                    }
                    className="shrink-0 text-text-disabled enabled:hover:text-success disabled:text-success"
                  >
                    {done ? (
                      <CheckCircle2 className="h-icon-lg w-icon-lg" />
                    ) : (
                      <Circle className="h-icon-lg w-icon-lg" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <strong
                      className={`block truncate text-xs ${done ? "text-text-disabled line-through" : "text-text-main"}`}
                    >
                      {task.title}
                    </strong>
                    <p className="mt-0.5 truncate text-micro text-stone-500">
                      {relationName(task)} · {task.ownerName ?? "Non assignée"}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1.5 text-micro font-bold sm:flex">
                    <CalendarClock className="h-icon-sm w-icon-sm" />
                    <time
                      className={overdue ? "text-danger" : "text-stone-500"}
                    >
                      {new Intl.DateTimeFormat(currentLocale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(task.dueAt))}
                    </time>
                  </div>
                  <span
                    className={`shrink-0 rounded-pill px-2 py-1 text-micro font-bold ${taskPriorityToneClass(task.priority)}`}
                  >
                    {priorityLabel(task.priority)}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("admin.crmTasksPage.creerUneTache")}
        description={t(
          "admin.crmTasksPage.planifiezUneActionEtRattachezLaAuBonContexteCrm",
        )}
      >
        <form onSubmit={createTask} className="space-y-3.5 text-xs">
          <FormField label="Titre" required>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("admin.crmTasksPage.relancerApresLaDemonstration")}
              required
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("invoicing.workspace.dueDate")} required>
              <Input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                required
              />
            </FormField>
            <FormField label={t("admin.crmTasksPage.priorite")}>
              <Select
                aria-label={t("admin.crmTasksPage.priorite")}
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as CrmTask["priority"])
                }
                options={CRM_TASK_PRIORITIES.map((value) => ({
                  value,
                  label: priorityLabel(value),
                }))}
              />
            </FormField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t("admin.crmTasksPage.typeDeRelation")}>
              <Select
                aria-label={t("admin.crmTasksPage.typeDeRelation")}
                value={relatedType}
                onChange={(event) => {
                  setRelatedType(event.target.value as RelatedType);
                  setRelatedId("");
                }}
                options={[
                  { value: "none", label: t("admin.crmTasksPage.aucune") },
                  { value: "account", label: "Entreprise" },
                  { value: "contact", label: "Contact" },
                  {
                    value: "opportunity",
                    label: t("admin.crmOverviewPage.opportunite"),
                  },
                ]}
              />
            </FormField>
            {relatedType !== "none" && (
              <FormField label={t("admin.crmTasksPage.elementLie")} required>
                <Select
                  aria-label={t("admin.crmTasksPage.elementLie")}
                  value={relatedId}
                  onChange={(event) => setRelatedId(event.target.value)}
                  options={[
                    {
                      value: "",
                      label: t("admin.crmOpportunityDetailPage.selectionner"),
                    },
                    ...relatedOptions,
                  ]}
                  required
                />
              </FormField>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Création…" : "Créer"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
