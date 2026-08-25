import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageSquare,
  UserRoundCheck,
} from "lucide-react";
import type {
  SupportCase,
  SupportCaseMetrics,
  SupportCaseNote,
  SupportCasePriority,
  SupportCaseStatus,
} from "@shongre/contracts/support";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import { Badge, Button, Skeleton } from "../../design-system";
import { FormField, Textarea } from "../../design-system/primitives/FormField";
import { supportService } from "../../domains/support/support.service";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatDate } from "../../utilities/formatters";

const STATUS_OPTIONS: Array<{ value: SupportCaseStatus; label: string }> = [
  { value: "open", label: "Nouveau" },
  { value: "assigned", label: "Affecté" },
  { value: "waiting_internal", label: "Traitement interne" },
  { value: "waiting_customer", label: "Réponse client attendue" },
  { value: "resolved", label: "Résolu" },
  { value: "closed", label: "Clôturé" },
];

const PRIORITY_OPTIONS: Array<{
  value: SupportCasePriority;
  label: string;
}> = [
  { value: "low", label: "Basse" },
  { value: "normal", label: "Normale" },
  { value: "high", label: "Haute" },
  { value: "urgent", label: "Urgente" },
];

const EMPTY_METRICS: SupportCaseMetrics = {
  open: 0,
  urgent: 0,
  overdue: 0,
  unassigned: 0,
  resolvedToday: 0,
  averageFirstResponseMinutes: 0,
};

export const AdminSupportPage: React.FC = () => {
  usePageMeta({
    title: "Support client — Console Shongre",
    description: "File opérationnelle des demandes d’assistance Shongre.",
    canonicalPath: "/admin/support",
    noIndex: true,
  });
  const { currentUser } = useAuth();
  const toast = useToast();
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<SupportCaseNote[]>([]);
  const [statusFilter, setStatusFilter] = useState<SupportCaseStatus | "all">(
    "all",
  );
  const [reply, setReply] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [items, nextMetrics] = await Promise.all([
        services.support.listCases(
          statusFilter === "all" ? {} : { status: statusFilter },
        ),
        services.support.getMetrics(),
      ]);
      setCases(items);
      setMetrics(nextMetrics);
      setSelectedId((current) =>
        current && items.some((item) => item.id === current)
          ? current
          : (items[0]?.id ?? null),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "La file support n’a pas pu être chargée.",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setNotes([]);
      return;
    }
    void services.support
      .getCase(selectedId)
      .then((detail) => setNotes(detail.notes))
      .catch((error) =>
        toast.error(
          error instanceof Error
            ? error.message
            : "L’historique du dossier est indisponible.",
        ),
      );
  }, [selectedId, toast]);

  const selectedCase = useMemo(
    () => cases.find((item) => item.id === selectedId) ?? null,
    [cases, selectedId],
  );

  const updateCase = async (
    patch: Partial<Pick<SupportCase, "status" | "priority" | "assigneeId">>,
    reason: string,
  ) => {
    if (!selectedCase) return;
    setSaving(true);
    try {
      const updated = await services.support.updateCase(selectedCase.id, {
        ...patch,
        reason,
      });
      setCases((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success("Le dossier et son journal d’audit ont été mis à jour.");
      await loadQueue();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Mise à jour impossible.",
      );
    } finally {
      setSaving(false);
    }
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCase || !reply.trim()) return;
    setSaving(true);
    try {
      await services.support.addNote(selectedCase.id, {
        visibility: internalNote ? "internal" : "customer",
        body: reply.trim(),
      });
      const detail = await services.support.getCase(selectedCase.id);
      setNotes(detail.notes);
      setCases((current) =>
        current.map((item) =>
          item.id === detail.case.id ? detail.case : item,
        ),
      );
      setReply("");
      toast.success(
        internalNote ? "Note interne ajoutée." : "Réponse envoyée au client.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Envoi impossible.");
    } finally {
      setSaving(false);
    }
  };

  const metricCards = [
    { label: "Dossiers ouverts", value: metrics.open, Icon: Headphones },
    { label: "Urgents", value: metrics.urgent, Icon: AlertTriangle },
    { label: "SLA dépassé", value: metrics.overdue, Icon: Clock3 },
    { label: "Non affectés", value: metrics.unassigned, Icon: UserRoundCheck },
  ];

  return (
    <div className="space-y-6">
      <header className="bg-white rounded-2xl border border-border-base p-5 shadow-xs">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">
          Opérations Support
        </p>
        <h1 className="mt-1 text-2xl font-black text-stone-900">
          File d’assistance client
        </h1>
        <p className="mt-1 text-xs text-stone-600">
          Affectation, réponses client, notes internes et suivi des engagements
          de service.
        </p>
      </header>

      <section
        aria-label="Indicateurs support"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {metricCards.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-border-base bg-white p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-stone-600">
                {label}
              </span>
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <strong className="mt-2 block text-2xl text-stone-900">
              {value}
            </strong>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-trending-columns">
        <section
          className="rounded-2xl border border-border-base bg-white shadow-xs overflow-hidden"
          aria-labelledby="support-queue-title"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border-subtle p-4">
            <h2
              id="support-queue-title"
              className="text-sm font-black text-stone-900"
            >
              Dossiers
            </h2>
            <label className="text-xs font-semibold text-stone-600">
              <span className="sr-only">Filtrer par statut</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as SupportCaseStatus | "all",
                  )
                }
                className="rounded-control border border-border-base bg-white px-3 py-2 text-xs h-control-touch"
              >
                <option value="all">Tous les statuts</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-7 w-7 text-success" />
              <p className="mt-2 text-sm font-bold text-stone-900">
                Aucun dossier dans cette file
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {cases.map((item) => {
                const meta = supportService.getStatusInfo(item.status);
                const active = selectedId === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      aria-pressed={active}
                      className={`w-full p-4 text-left transition-colors ${active ? "bg-primary/5" : "hover:bg-stone-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-micro font-bold text-stone-500">
                          {item.reference}
                        </span>
                        <Badge variant={meta.variant} size="sm">
                          {meta.label}
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-1 text-sm font-black text-stone-900">
                        {item.subject}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2 text-micro text-stone-500">
                        <span>
                          {item.category} · {item.priority}
                        </span>
                        <span>{formatDate(item.updatedAt)}</span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="rounded-2xl border border-border-base bg-white p-5 shadow-xs"
          aria-labelledby="support-case-title"
        >
          {!selectedCase ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-stone-500">
              Sélectionnez un dossier.
            </div>
          ) : (
            <div className="space-y-5">
              <div className="border-b border-border-subtle pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-stone-500">
                      {selectedCase.reference}
                    </span>
                    <h2
                      id="support-case-title"
                      className="mt-1 text-xl font-black text-stone-900"
                    >
                      {selectedCase.subject}
                    </h2>
                  </div>
                  {!selectedCase.assigneeId && currentUser && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={saving}
                      onClick={() =>
                        updateCase(
                          { assigneeId: currentUser.id, status: "assigned" },
                          "Prise en charge du dossier par l’agent connecté",
                        )
                      }
                    >
                      Me l’affecter
                    </Button>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-stone-700">
                  {selectedCase.description}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-stone-600">
                    Statut
                    <select
                      value={selectedCase.status}
                      disabled={saving}
                      onChange={(event) =>
                        updateCase(
                          { status: event.target.value as SupportCaseStatus },
                          "Changement manuel du statut après revue du dossier",
                        )
                      }
                      className="mt-1 block w-full rounded-control border border-border-base bg-white px-3 py-2 h-control-touch"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-stone-600">
                    Priorité
                    <select
                      value={selectedCase.priority}
                      disabled={saving}
                      onChange={(event) =>
                        updateCase(
                          {
                            priority: event.target.value as SupportCasePriority,
                          },
                          "Réévaluation manuelle de la priorité du dossier",
                        )
                      }
                      className="mt-1 block w-full rounded-control border border-border-base bg-white px-3 py-2 h-control-touch"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-stone-900">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />{" "}
                  Historique
                </h3>
                <div
                  className="mt-3 max-h-72 space-y-2 overflow-y-auto"
                  aria-live="polite"
                >
                  {notes.map((note) => (
                    <article
                      key={note.id}
                      className={`rounded-xl border p-3 ${note.visibility === "internal" ? "border-warning-border bg-warning-surface" : "border-border-base bg-stone-50"}`}
                    >
                      <div className="flex items-center justify-between gap-2 text-micro font-semibold text-stone-500">
                        <span>
                          {note.visibility === "internal"
                            ? "Note interne"
                            : note.authorId === selectedCase.requesterId
                              ? "Client"
                              : "Support"}
                        </span>
                        <time dateTime={note.createdAt}>
                          {formatDate(note.createdAt)}
                        </time>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-stone-800">
                        {note.body}
                      </p>
                    </article>
                  ))}
                </div>
              </div>

              {selectedCase.status !== "closed" && (
                <form
                  onSubmit={sendReply}
                  className="space-y-3 border-t border-border-subtle pt-4"
                >
                  <FormField
                    label={internalNote ? "Note interne" : "Réponse au client"}
                  >
                    <Textarea
                      rows={4}
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      placeholder={
                        internalNote
                          ? "Visible uniquement par les équipes autorisées…"
                          : "Écrivez une réponse claire et actionnable…"
                      }
                    />
                  </FormField>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-stone-700">
                      <input
                        type="checkbox"
                        checked={internalNote}
                        onChange={(event) =>
                          setInternalNote(event.target.checked)
                        }
                      />
                      Note interne
                    </label>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={saving || reply.trim().length < 2}
                    >
                      {saving
                        ? "Envoi…"
                        : internalNote
                          ? "Ajouter la note"
                          : "Répondre au client"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
