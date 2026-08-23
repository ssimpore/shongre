import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarPlus,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Inbox,
  MessageSquarePlus,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import type {
  EmploymentApplication,
  EmploymentImport,
  EmployerSummary,
  RecruiterWorkspace,
} from "@shongre/contracts/employment";
import { useNavigate } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  FormField,
  Input,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatEmploymentDate } from "./employment-format";
import { labelIdentifier } from "../../utilities/identifier-label";

type Tab =
  | "overview"
  | "jobs"
  | "pipeline"
  | "interviews"
  | "imports"
  | "team"
  | "billing";

const systemBadge = (
  state: string,
): "success" | "warning" | "primary" | "neutral" =>
  state === "hired" || state === "offer"
    ? "success"
    : state === "interview"
      ? "warning"
      : state === "active"
        ? "primary"
        : "neutral";

export const EmploymentRecruiterWorkspacePage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<RecruiterWorkspace | null>(null);
  const [employers, setEmployers] = useState<EmployerSummary[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState<string>();
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [interviewDraft, setInterviewDraft] = useState<{
    applicationId?: string;
    startsAt: string;
  }>({ startsAt: "2026-08-28T10:00" });
  const [busyId, setBusyId] = useState<string>();
  const [importPreview, setImportPreview] = useState<EmploymentImport>();

  usePageMeta({
    title: "Espace recruteur",
    description:
      "Pilotez vos offres, candidatures, entretiens, équipe et imports Shongre Emploi.",
    canonicalPath: "/compte/emploi/recruteur",
    noIndex: true,
  });

  const load = async (preferredEmployerId?: string) => {
    setError(undefined);
    try {
      const availableEmployers =
        await services.employment.listRecruiterEmployers();
      setEmployers(availableEmployers);
      const employerId =
        availableEmployers.find(
          (employer) => employer.id === preferredEmployerId,
        )?.id || availableEmployers[0]?.id;
      if (!employerId)
        throw new Error("Aucun espace employeur n’est associé à ce profil.");
      setWorkspace(await services.employment.getRecruiterWorkspace(employerId));
    } catch (cause) {
      setWorkspace(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Espace recruteur indisponible.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const move = async (application: EmploymentApplication, stageId: string) => {
    const stage = workspace?.stages.find((item) => item.id === stageId);
    if (!workspace || !stage) return;
    const reason = ["rejected", "archived"].includes(stage.systemState)
      ? "Décision enregistrée par le recruteur"
      : undefined;
    setBusyId(application.id);
    try {
      const updated = await services.employment.moveApplication(
        workspace.employer.id,
        application.id,
        {
          stageId,
          reason,
          notifyCandidate: stage.candidateNotificationEnabled,
        },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              applications: current.applications.map((item) =>
                item.id === updated.id ? updated : item,
              ),
            }
          : current,
      );
      toast.success("Étape mise à jour et journalisée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Déplacement impossible.",
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const addNote = async (applicationId: string) => {
    const body = noteDrafts[applicationId]?.trim();
    if (!body) return;
    try {
      if (!workspace) return;
      const note = await services.employment.addRecruiterNote(
        workspace.employer.id,
        applicationId,
        body,
      );
      setWorkspace((current) =>
        current
          ? { ...current, recruiterNotes: [note, ...current.recruiterNotes] }
          : current,
      );
      setNoteDrafts((current) => ({ ...current, [applicationId]: "" }));
      toast.success("Note privée ajoutée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Note non enregistrée.",
      );
    }
  };

  const schedule = async () => {
    if (!interviewDraft.applicationId || !interviewDraft.startsAt) return;
    const startsAt = new Date(interviewDraft.startsAt).toISOString();
    const endsAt = new Date(
      new Date(interviewDraft.startsAt).getTime() + 45 * 60_000,
    ).toISOString();
    try {
      if (!workspace) return;
      const interview = await services.employment.scheduleInterview(
        workspace.employer.id,
        interviewDraft.applicationId,
        {
          modeId: "video",
          timezone: "Europe/Paris",
          startsAt,
          endsAt,
          status: "proposed",
          privateMeetingLink: "https://meet.example.test/private-demo",
          participantUserIds: [],
          candidateMessage: "Nous vous proposons un échange de 45 minutes.",
        },
      );
      setWorkspace((current) =>
        current
          ? { ...current, interviews: [interview, ...current.interviews] }
          : current,
      );
      toast.success("Entretien proposé au candidat.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Entretien non planifié.",
      );
    }
  };

  const previewImport = async (sourceType: "csv" | "xml" | "ats") => {
    try {
      if (!workspace) return;
      const preview = await services.employment.previewImport(
        workspace.employer.id,
        {
          sourceType,
          sourceIdentifier:
            sourceType === "ats"
              ? "ats-demo-connector"
              : `offres-technova.${sourceType}`,
          idempotencyKey: `technova-${sourceType}-20260822`,
        },
      );
      setImportPreview(preview);
      toast.success(`Prévisualisation ${labelIdentifier(sourceType)} prête.`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Prévisualisation impossible.",
      );
    }
  };

  const confirmImport = async () => {
    if (!workspace || !importPreview) return;
    try {
      const importJob = await services.employment.requestImport(
        workspace.employer.id,
        {
          sourceType: importPreview.sourceType,
          sourceIdentifier: importPreview.sourceIdentifier,
          idempotencyKey: importPreview.idempotencyKey,
        },
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              imports: [
                importJob,
                ...current.imports.filter((item) => item.id !== importJob.id),
              ],
            }
          : current,
      );
      toast.success(
        `Import ${labelIdentifier(importJob.sourceType)} mis en file d’attente.`,
      );
      setImportPreview(undefined);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Import impossible.",
      );
    }
  };

  const duplicateJob = async (jobId: string) => {
    if (!workspace) return;
    setBusyId(jobId);
    try {
      const draft = await services.employment.duplicateJob(
        workspace.employer.id,
        jobId,
      );
      toast.success("Copie créée. Vérifiez-la avant publication.");
      navigate(`/deposer/emploi?draft=${encodeURIComponent(draft.id)}`);
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Duplication impossible.",
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const applicationByStage = useMemo(
    () =>
      workspace
        ? Object.fromEntries(
            workspace.stages.map((stage) => [
              stage.id,
              workspace.applications.filter(
                (item) => item.stageId === stage.id,
              ),
            ]),
          )
        : {},
    [workspace],
  );
  const activeJobs =
    workspace?.jobs.filter((job) => new Date(job.expiresAt) > new Date())
      .length || 0;

  if (error)
    return (
      <StatePanel
        variant="error"
        title="Espace recruteur indisponible"
        description={error}
        action={<Button onClick={() => void load()}>Réessayer</Button>}
      />
    );
  if (!workspace)
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );

  const tabs: Array<[Tab, string, React.ReactNode]> = [
    [
      "overview",
      "Vue d’ensemble",
      <BarChart3 className="h-icon-sm w-icon-sm" />,
    ],
    ["jobs", "Offres", <BriefcaseBusiness className="h-icon-sm w-icon-sm" />],
    ["pipeline", "Candidatures", <Inbox className="h-icon-sm w-icon-sm" />],
    [
      "interviews",
      "Entretiens",
      <CalendarPlus className="h-icon-sm w-icon-sm" />,
    ],
    ["imports", "Imports", <FileSpreadsheet className="h-icon-sm w-icon-sm" />],
    ["team", "Équipe", <UsersRound className="h-icon-sm w-icon-sm" />],
    [
      "billing",
      "Offre & facturation",
      <CreditCard className="h-icon-sm w-icon-sm" />,
    ],
  ];
  const jobLabel = (id: string) =>
    workspace.jobs.find((job) => job.id === id)?.title || "Offre d’emploi";

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header className="rounded-card border border-border-base bg-bg-surface p-5 shadow-card sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-card bg-text-main font-black text-white">
              {workspace.employer.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black">
                  {workspace.employer.name}
                </h1>
                {workspace.employer.isPubliclyVerified && (
                  <Badge variant="verified">Employeur vérifié</Badge>
                )}
              </div>
              <p className="text-sm text-text-secondary">
                Espace recruteur · {workspace.applications.length} candidatures
                actives
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {employers.length > 1 && (
              <Select
                aria-label="Changer d’employeur"
                value={workspace.employer.id}
                onChange={(event) => void load(event.target.value)}
              >
                {employers.map((employer) => (
                  <option key={employer.id} value={employer.id}>
                    {employer.name}
                  </option>
                ))}
              </Select>
            )}
            <Button to="/deposer/emploi">Publier une offre</Button>
          </div>
        </div>
      </header>

      <nav
        className="flex gap-2 overflow-x-auto rounded-card border border-border-base bg-bg-surface p-2 no-scrollbar"
        aria-label="Espace recruteur"
      >
        {tabs.map(([id, label, icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-control-md min-w-max items-center gap-2 rounded-control px-3 text-xs font-bold ${tab === id ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-subtle"}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section className="min-w-0">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Offres actives", activeJobs],
              ["Candidatures", workspace.applications.length],
              ["Entretiens", workspace.interviews.length],
              [
                "Importées",
                workspace.imports.reduce(
                  (sum, item) => sum + item.createdCount,
                  0,
                ),
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="min-w-0 rounded-card border border-border-base bg-bg-surface p-5"
              >
                <p className="text-xs font-bold text-text-muted">{label}</p>
                <p className="mt-1 text-3xl font-black text-text-main">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-2">
            <div className="min-w-0 rounded-card border border-border-base bg-bg-surface p-5">
              <h2 className="text-lg font-black">Candidatures récentes</h2>
              <div className="mt-3 space-y-3">
                {workspace.applications.slice(0, 4).map((application) => (
                  <button
                    key={application.id}
                    type="button"
                    onClick={() => setTab("pipeline")}
                    className="flex min-w-0 w-full items-center justify-between gap-3 overflow-hidden rounded-control border border-border-subtle p-3 text-left hover:border-primary-border"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">
                        {application.candidateId}
                      </p>
                      <p className="truncate text-xs text-text-muted">
                        {jobLabel(application.jobId)}
                      </p>
                    </div>
                    <Badge variant={systemBadge(application.systemState)}>
                      {application.candidateVisibleStatus}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <div className="min-w-0 rounded-card border border-border-base bg-bg-surface p-5">
              <h2 className="break-words text-lg font-black">
                Capacités de votre offre
              </h2>
              <dl className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {Object.entries(workspace.entitlements)
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="min-w-0 rounded-control bg-bg-subtle p-3"
                    >
                      <dt className="break-all text-xs font-medium text-text-secondary">
                        {labelIdentifier(key)}
                      </dt>
                      <dd className="mt-1 text-sm font-black">
                        {typeof value === "boolean"
                          ? value
                            ? "Inclus"
                            : "Non inclus"
                          : String(value)}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </section>
      )}

      {tab === "jobs" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Offres d’emploi</h2>
            <Button size="sm" to="/deposer/emploi">
              Nouvelle offre
            </Button>
          </div>
          {workspace.jobs.map((job) => (
            <article
              key={job.id}
              className="rounded-card border border-border-base bg-bg-surface p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap gap-2">
                    {job.isFeatured && (
                      <Badge variant="featured">À la une</Badge>
                    )}
                    {job.isSponsored && <Badge>Placement sponsorisé</Badge>}
                  </div>
                  <h3 className="mt-2 font-black">{job.title}</h3>
                  <p className="mt-1 text-xs text-text-secondary">
                    {job.primaryLocation.label} · expire le{" "}
                    {formatEmploymentDate(job.expiresAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    to={`/emploi/offre/${job.slug}`}
                  >
                    Aperçu
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === job.id}
                    onClick={() => void duplicateJob(job.id)}
                  >
                    Dupliquer
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "pipeline" && (
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Pipeline de recrutement</h2>
              <p className="text-xs text-text-muted">
                Les changements sont audités. Aucun classement automatique fondé
                sur des attributs sensibles.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void load(workspace.employer.id)}
            >
              <RefreshCw className="h-icon-sm w-icon-sm" />
              Actualiser
            </Button>
          </div>
          <div className="mt-4 flex min-w-0 gap-3 overflow-x-auto pb-3 no-scrollbar">
            {workspace.stages.map((stage) => (
              <div
                key={stage.id}
                className="w-72 min-w-72 rounded-card border border-border-base bg-bg-subtle p-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black">{stage.label}</h3>
                  <Badge>{applicationByStage[stage.id]?.length || 0}</Badge>
                </div>
                <div className="mt-3 space-y-3">
                  {(applicationByStage[stage.id] || []).map((application) => (
                    <article
                      key={application.id}
                      className="rounded-control border border-border-base bg-bg-surface p-3 shadow-xs"
                    >
                      <p className="text-sm font-black">
                        {application.candidateId}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-text-muted">
                        {jobLabel(application.jobId)}
                      </p>
                      <FormField className="mt-3" label="Étape">
                        <Select
                          aria-label={`Étape de ${application.candidateId}`}
                          value={application.stageId}
                          disabled={busyId === application.id}
                          onChange={(event) =>
                            move(application, event.target.value)
                          }
                        >
                          {workspace.stages.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <Textarea
                        className="mt-3"
                        rows={2}
                        value={noteDrafts[application.id] || ""}
                        onChange={(event) =>
                          setNoteDrafts((current) => ({
                            ...current,
                            [application.id]: event.target.value,
                          }))
                        }
                        aria-label={`Note privée pour ${application.candidateId}`}
                        placeholder="Note privée…"
                      />
                      <Button
                        className="mt-2 w-full"
                        size="sm"
                        variant="secondary"
                        disabled={!noteDrafts[application.id]?.trim()}
                        onClick={() => addNote(application.id)}
                      >
                        <MessageSquarePlus className="h-icon-xs w-icon-xs" />
                        Ajouter la note
                      </Button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "interviews" && (
        <section className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-lg font-black">Proposer un entretien</h2>
            <div className="mt-4 space-y-4">
              <FormField label="Candidature">
                <Select
                  aria-label="Candidature à inviter"
                  value={interviewDraft.applicationId || ""}
                  onChange={(event) =>
                    setInterviewDraft((current) => ({
                      ...current,
                      applicationId: event.target.value,
                    }))
                  }
                >
                  <option value="">Sélectionner</option>
                  {workspace.applications
                    .filter(
                      (item) =>
                        !["rejected", "withdrawn", "archived"].includes(
                          item.systemState,
                        ),
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.candidateId} · {jobLabel(item.jobId)}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField label="Date et heure (Europe/Paris)">
                <Input
                  type="datetime-local"
                  value={interviewDraft.startsAt}
                  onChange={(event) =>
                    setInterviewDraft((current) => ({
                      ...current,
                      startsAt: event.target.value,
                    }))
                  }
                />
              </FormField>
              <Button
                className="w-full"
                onClick={schedule}
                disabled={!interviewDraft.applicationId}
              >
                Envoyer la proposition
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-lg font-black">Entretiens planifiés</h2>
            {workspace.interviews.map((interview) => (
              <article
                key={interview.id}
                className="rounded-card border border-border-base bg-bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black">
                      {jobLabel(
                        workspace.applications.find(
                          (item) => item.id === interview.applicationId,
                        )?.jobId || "",
                      )}
                    </p>
                    <p className="mt-1 text-sm text-text-secondary">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short",
                        timeZone: interview.timezone,
                      }).format(new Date(interview.startsAt))}
                    </p>
                    <p className="text-xs text-text-muted">
                      {interview.timezone} · {labelIdentifier(interview.modeId)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      interview.status === "confirmed" ? "success" : "warning"
                    }
                  >
                    {labelIdentifier(interview.status)}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "imports" && (
        <section className="space-y-4">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="text-lg font-black">Importer et synchroniser</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Chaque exécution utilise une clé d’idempotence pour éviter les
              doublons et produire un rapport détaillé.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={workspace.entitlements.csvImport !== true}
                onClick={() => previewImport("csv")}
              >
                Importer un CSV
              </Button>
              <Button
                variant="secondary"
                disabled={workspace.entitlements.xmlImport !== true}
                onClick={() => previewImport("xml")}
              >
                Synchroniser un flux XML
              </Button>
              <Button
                variant="secondary"
                disabled={workspace.entitlements.apiSync !== true}
                onClick={() => previewImport("ats")}
              >
                Connecter un ATS
              </Button>
            </div>
            {workspace.entitlements.csvImport !== true &&
              workspace.entitlements.apiSync !== true && (
                <p className="mt-3 text-xs text-text-muted">
                  Les imports sont disponibles pour les organisations disposant
                  d’une capacité d’import active.
                </p>
              )}
            {importPreview && (
              <div className="mt-4 rounded-control border border-primary-border bg-primary-light p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-black">
                      Prévisualisation · {importPreview.sourceIdentifier}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
                      {importPreview.createdCount} création(s) ·{" "}
                      {importPreview.updatedCount} mise(s) à jour ·{" "}
                      {importPreview.duplicateCount} doublon(s) ·{" "}
                      {importPreview.errorCount} erreur(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmImport}>
                      Confirmer l’import
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setImportPreview(undefined)}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="overflow-x-auto rounded-card border border-border-base bg-bg-surface">
            <table className="w-full min-w-[44rem] text-left text-xs">
              <thead className="bg-bg-subtle text-text-muted">
                <tr>
                  <th className="p-3">Source</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Créées</th>
                  <th className="p-3">Mises à jour</th>
                  <th className="p-3">Doublons</th>
                  <th className="p-3">Erreurs</th>
                </tr>
              </thead>
              <tbody>
                {workspace.imports.map((item) => (
                  <tr key={item.id} className="border-t border-border-subtle">
                    <td className="p-3 font-bold">{item.sourceIdentifier}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          item.status === "completed"
                            ? "success"
                            : item.status === "failed"
                              ? "warning"
                              : "primary"
                        }
                      >
                        {labelIdentifier(item.status)}
                      </Badge>
                    </td>
                    <td className="p-3">{item.createdCount}</td>
                    <td className="p-3">{item.updatedCount}</td>
                    <td className="p-3">{item.duplicateCount}</td>
                    <td className="p-3">{item.errorCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "team" && (
        <section className="rounded-card border border-border-base bg-bg-surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <UsersRound className="h-icon-md w-icon-md text-primary" />
            Équipe et permissions
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Les recruteurs accèdent uniquement aux offres, branches, clients et
            candidatures qui leur sont assignés.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {workspace.members.map((member) => (
              <article
                key={member.id}
                className="rounded-control border border-border-base p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black">
                      {member.displayName || member.userId}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {labelIdentifier(member.role)} ·{" "}
                      {member.branchIds.length
                        ? `${member.branchIds.length} périmètre(s) agence`
                        : "périmètre employeur"}
                    </p>
                  </div>
                  <Badge
                    variant={member.status === "active" ? "success" : "neutral"}
                  >
                    {labelIdentifier(member.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-xs text-text-secondary">
                  {member.permissions.length
                    ? member.permissions.map(labelIdentifier).join(" · ")
                    : "Lecture limitée selon le rôle"}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs text-text-muted">
            Les droits de facturation, d’entretien et de candidature restent
            séparés et sont vérifiés à chaque opération par le service.
          </p>
        </section>
      )}

      {tab === "billing" && (
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-card border border-primary-border bg-primary-light p-5">
            <Badge variant="primary">Offre active</Badge>
            <h2 className="mt-3 text-xl font-black">
              {workspace.activeOfferId}
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Les quotas et capacités sont résolus par le service central
              d’entitlements.
            </p>
            <Button className="mt-5" to="/solutions-pro">
              Comparer les offres
            </Button>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <CheckCircle2 className="h-icon-md w-icon-md text-success" />
              Transparence
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              <li>Options payantes non présélectionnées</li>
              <li>Prix affichés avant confirmation</li>
              <li>Factures et taxes centralisées</li>
              <li>Aucun paiement demandé aux candidats</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
};
