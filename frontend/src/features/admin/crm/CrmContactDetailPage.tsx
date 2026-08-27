import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  ShieldAlert,
  Target,
  UserRound,
} from "lucide-react";
import type {
  CrmAccount,
  CrmActivity,
  CrmContact,
  CrmOpportunity,
  CrmTask,
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
import { Skeleton } from "../../../design-system";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";
import { usePageMeta } from "../../../hooks/usePageMeta";

const lifecycleOptions = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "qualified", label: "Qualifié" },
  { value: "customer", label: "Client" },
  { value: "partner", label: "Partenaire" },
  { value: "do_not_contact", label: "Ne pas contacter" },
  { value: "archived", label: "Archivé" },
];

function tomorrowMorning() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1_000);
  date.setHours(9, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

export const CrmContactDetailPage: React.FC = () => {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { currentLocale } = useMarketLocation();
  const [contact, setContact] = useState<CrmContact | null>(null);
  const [accounts, setAccounts] = useState<CrmAccount[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [note, setNote] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueAt, setTaskDueAt] = useState(tomorrowMorning);
  const [submitting, setSubmitting] = useState(false);

  usePageMeta({
    title: contact
      ? `${contact.fullName} | CRM Shongre`
      : "Contact CRM | Shongre",
    description: "Vue complète du contact CRM.",
    canonicalPath: id ? `/admin/crm/contacts/${id}` : undefined,
    noIndex: true,
  });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [item, accountPage, opportunityPage, taskPage, activityPage] =
        await Promise.all([
          services.crm.getContact(id),
          services.crm.listAccounts({ limit: 100 }),
          services.crm.listOpportunities({ limit: 100 }),
          services.crm.listTasks({ limit: 100 }),
          services.crm.listActivities("contact", id),
        ]);
      setContact(item);
      setAccounts(
        accountPage.items.filter((account) =>
          item.accountIds.includes(account.id),
        ),
      );
      setOpportunities(
        opportunityPage.items.filter((opportunity) =>
          opportunity.contactIds.includes(item.id),
        ),
      );
      setTasks(taskPage.items.filter((task) => task.contactId === item.id));
      setActivities(activityPage);
    } catch (reason) {
      setContact(null);
      toast.error(
        reason instanceof Error ? reason.message : "Contact indisponible.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const updateLifecycle = async (lifecycle: CrmContact["lifecycle"]) => {
    if (!contact) return;
    try {
      const updated = await services.crm.updateContact(
        contact.id,
        contact.version,
        {
          lifecycle,
          doNotContact:
            lifecycle === "do_not_contact" ? true : contact.doNotContact,
        },
      );
      setContact(updated);
      toast.success("Cycle de vie mis à jour.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Mise à jour impossible.",
      );
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contact || !note.trim()) return;
    setSubmitting(true);
    try {
      const activity = await services.crm.createActivity({
        entityType: "contact",
        entityId: contact.id,
        activityType: "NOTE_CREATED",
        title: "Note contact",
        description: note.trim(),
      });
      setActivities((items) => [activity, ...items]);
      setNote("");
      setNoteOpen(false);
      toast.success("Note enregistrée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Note non enregistrée.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const createTask = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!contact || !taskTitle.trim()) return;
    setSubmitting(true);
    try {
      const task = await services.crm.createTask({
        contactId: contact.id,
        type: "follow_up",
        title: taskTitle.trim(),
        dueAt: new Date(taskDueAt).toISOString(),
        priority: "medium",
      });
      setTasks((items) => [task, ...items]);
      setTaskTitle("");
      setTaskDueAt(tomorrowMorning());
      setTaskOpen(false);
      toast.success("Tâche planifiée.");
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Tâche non créée.",
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

  const openPipeline = useMemo(
    () =>
      opportunities
        .filter((item) => item.status === "open")
        .reduce((sum, item) => sum + item.amount.amountMinor, 0),
    [opportunities],
  );

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  if (!contact)
    return (
      <section className="rounded-2xl border border-border-base bg-white p-10 text-center">
        <UserRound className="mx-auto h-8 w-8 text-stone-400" />
        <h1 className="mt-3 text-lg font-black">Contact introuvable</h1>
        <Button
          className="mt-4"
          size="sm"
          onClick={() => navigate("/admin/crm/contacts")}
        >
          Retour aux contacts
        </Button>
      </section>
    );

  const initials =
    `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-4 pb-8">
      <section className="rounded-2xl border border-stone-800 bg-stone-950 p-5 text-white shadow-sm sm:p-6">
        <Link
          to="/admin/crm/contacts"
          className="inline-flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-stone-400 hover:text-white"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" /> Contacts
        </Link>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-lg font-black">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                  {contact.fullName}
                </h1>
                {contact.doNotContact && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-950 px-2 py-1 text-micro font-bold text-red-300">
                    <ShieldAlert className="h-icon-xs w-icon-xs" /> Ne pas
                    contacter
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-stone-400">
                {contact.jobTitle ?? "Fonction non renseignée"}
                {accounts[0] ? ` · ${accounts[0].name}` : ""}
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-micro text-stone-400">
                {contact.email && (
                  <a
                    className="inline-flex items-center gap-1 hover:text-white"
                    href={`mailto:${contact.email}`}
                  >
                    <Mail className="h-icon-xs w-icon-xs" /> {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    className="inline-flex items-center gap-1 hover:text-white"
                    href={`tel:${contact.phone}`}
                  >
                    <Phone className="h-icon-xs w-icon-xs" /> {contact.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Cycle de vie du contact"
              value={contact.lifecycle}
              onChange={(event) =>
                void updateLifecycle(
                  event.target.value as CrmContact["lifecycle"],
                )
              }
              options={lifecycleOptions}
            />
            <Button
              variant="outline"
              size="sm"
              className="border-stone-700 bg-stone-900 text-white hover:bg-stone-800"
              onClick={() => setTaskOpen(true)}
            >
              <CalendarClock className="h-icon-md w-icon-md" /> Tâche
            </Button>
            <Button size="sm" onClick={() => setNoteOpen(true)}>
              <MessageSquareText className="h-icon-md w-icon-md" /> Note
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <article className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            Entreprises
          </span>
          <strong className="mt-1 block text-2xl font-black">
            {accounts.length}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            Opportunités
          </span>
          <strong className="mt-1 block text-2xl font-black">
            {opportunities.length}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            Pipeline ouvert
          </span>
          <strong className="mt-1 block text-2xl font-black text-primary">
            {new Intl.NumberFormat(currentLocale, {
              style: "currency",
              currency: opportunities[0]?.amount.currency ?? "EUR",
              maximumFractionDigits: 0,
            }).format(openPipeline / 100)}
          </strong>
        </article>
        <article className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
          <span className="text-micro font-bold uppercase tracking-wider text-stone-500">
            Tâches ouvertes
          </span>
          <strong className="mt-1 block text-2xl font-black">
            {tasks.filter((item) => item.status !== "completed").length}
          </strong>
        </article>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-black">Historique</h2>
                <p className="text-micro text-stone-500">
                  Interactions immuables du contact
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
            <div className="divide-y divide-border-subtle px-5">
              {activities.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-500">
                  Aucune activité enregistrée.
                </p>
              ) : (
                activities.map((activity) => (
                  <article key={activity.id} className="flex gap-3 py-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-600">
                      <MessageSquareText className="h-icon-sm w-icon-sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-xs font-black">
                          {activity.title}
                        </strong>
                        <time className="text-micro text-stone-500">
                          {new Intl.DateTimeFormat(currentLocale, {
                            dateStyle: "medium",
                          }).format(new Date(activity.occurredAt))}
                        </time>
                      </div>
                      {activity.description && (
                        <p className="mt-1 text-xs text-stone-600">
                          {activity.description}
                        </p>
                      )}
                      <p className="mt-1 text-micro text-stone-400">
                        {activity.actorName}
                      </p>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3.5">
              <div>
                <h2 className="text-sm font-black">Opportunités liées</h2>
                <p className="text-micro text-stone-500">
                  Influence et engagements en cours
                </p>
              </div>
              <Target className="h-icon-md w-icon-md text-primary" />
            </div>
            <div className="divide-y divide-border-subtle px-5">
              {opportunities.length === 0 ? (
                <p className="py-8 text-center text-xs text-stone-500">
                  Aucune opportunité liée.
                </p>
              ) : (
                opportunities.map((opportunity) => (
                  <Link
                    key={opportunity.id}
                    to={`/admin/crm/opportunites/${opportunity.id}`}
                    className="flex items-center gap-3 py-3 hover:text-primary"
                  >
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-xs">
                        {opportunity.name}
                      </strong>
                      <span className="text-micro text-stone-500">
                        {opportunity.stageName} · {opportunity.probability}%
                      </span>
                    </span>
                    <strong className="text-xs tabular-nums">
                      {new Intl.NumberFormat(currentLocale, {
                        style: "currency",
                        currency: opportunity.amount.currency,
                        maximumFractionDigits: 0,
                      }).format(opportunity.amount.amountMinor / 100)}
                    </strong>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border-base bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3.5">
              <div>
                <h2 className="text-sm font-black">Tâches associées</h2>
                <p className="text-micro text-stone-500">Prochaines actions</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTaskOpen(true)}
              >
                <Plus className="h-icon-md w-icon-md" /> Ajouter
              </Button>
            </div>
            <div className="divide-y divide-border-subtle px-4">
              {tasks.length === 0 ? (
                <p className="py-7 text-center text-xs text-stone-500">
                  Aucune tâche planifiée.
                </p>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 py-3">
                    <button
                      type="button"
                      disabled={task.status === "completed"}
                      onClick={() => void completeTask(task)}
                      className="text-stone-400 enabled:hover:text-success disabled:text-success"
                      aria-label={
                        task.status === "completed"
                          ? `${task.title}, terminée`
                          : `Terminer ${task.title}`
                      }
                    >
                      <CheckCircle2 className="h-icon-md w-icon-md" />
                    </button>
                    <span className="min-w-0 flex-1">
                      <strong
                        className={`block truncate text-xs ${task.status === "completed" ? "text-stone-400 line-through" : ""}`}
                      >
                        {task.title}
                      </strong>
                      <time className="text-micro text-stone-500">
                        {new Intl.DateTimeFormat(currentLocale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(task.dueAt))}
                      </time>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border-base bg-white p-4 shadow-xs">
            <h2 className="text-sm font-black">Données du contact</h2>
            <dl className="mt-3 divide-y divide-border-subtle text-xs">
              {[
                ["Département", contact.department ?? "Non renseigné"],
                ["Langue", contact.language ?? "Non renseignée"],
                ["Fuseau", contact.timezone ?? "Non renseigné"],
                ["Pays", contact.country],
                [
                  "Canal préféré",
                  contact.preferredContactMethod ?? "Non renseigné",
                ],
                ["Source", contact.source.replace("_", " ")],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-2.5">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="text-right font-bold text-stone-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {accounts.map((account) => (
              <Link
                key={account.id}
                to={`/admin/crm/entreprises/${account.id}`}
                className="mt-3 flex items-center gap-2 rounded-xl bg-stone-50 p-3 text-xs font-bold hover:text-primary"
              >
                <Building2 className="h-icon-md w-icon-md" /> {account.name}
              </Link>
            ))}
          </section>
        </aside>
      </div>

      <Modal
        isOpen={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Ajouter une note"
        description={`Historique commercial de ${contact.fullName}.`}
      >
        <form onSubmit={addNote} className="space-y-4 text-xs">
          <FormField label="Note" required>
            <Textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
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
        isOpen={taskOpen}
        onClose={() => setTaskOpen(false)}
        title="Planifier une tâche"
        description={`Action associée à ${contact.fullName}.`}
      >
        <form onSubmit={createTask} className="space-y-4 text-xs">
          <FormField label="Titre" required>
            <Input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Relancer pour confirmer le rendez-vous"
              required
            />
          </FormField>
          <FormField label="Échéance" required>
            <Input
              type="datetime-local"
              value={taskDueAt}
              onChange={(event) => setTaskDueAt(event.target.value)}
              required
            />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-border-subtle pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTaskOpen(false)}
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
