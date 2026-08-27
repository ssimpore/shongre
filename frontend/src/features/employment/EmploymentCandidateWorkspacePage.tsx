import React, { useEffect, useMemo, useState } from "react";
import {
  BellOff,
  BellRing,
  BriefcaseBusiness,
  CalendarClock,
  Download,
  FileText,
  Heart,
  LockKeyhole,
  MessageSquare,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import type {
  CandidateProfile,
  CandidateWorkspace,
  EmploymentCatalog,
  JobPostingCard,
} from "@shongre/contracts/employment";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
  ProgressBar,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatEmploymentDate } from "./employment-format";
import { JobCard } from "./components/JobCard";
import { labelIdentifier } from "../../utilities/identifier-label";

type Tab =
  "applications" | "profile" | "saved" | "interviews" | "messages" | "privacy";

const statusVariant = (
  state: string,
): "success" | "warning" | "primary" | "neutral" =>
  state === "offer" || state === "hired"
    ? "success"
    : state === "interview"
      ? "warning"
      : state === "active"
        ? "primary"
        : "neutral";

const splitProfileLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const profileRecordText = (records: Array<Record<string, unknown>>) =>
  records
    .map((record) => String(record.description || record.title || ""))
    .filter(Boolean)
    .join("\n");

export const EmploymentCandidateWorkspacePage: React.FC = () => {
  const toast = useToast();
  const { activeMarket, currentLocale } = useMarketLocation();
  const [workspace, setWorkspace] = useState<CandidateWorkspace | null>(null);
  const [catalog, setCatalog] = useState<EmploymentCatalog | null>(null);
  const [jobs, setJobs] = useState<Record<string, JobPostingCard>>({});
  const [tab, setTab] = useState<Tab>("applications");
  const [profileDraft, setProfileDraft] = useState<CandidateProfile | null>(
    null,
  );
  const [talentConsent, setTalentConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [deletionArmed, setDeletionArmed] = useState(false);
  const [privacyAction, setPrivacyAction] = useState<"export" | "delete">();

  usePageMeta({
    title: "Mon espace candidat",
    description:
      "Suivez vos candidatures, CV, entretiens et préférences Emploi.",
    canonicalPath: "/compte/emploi",
    noIndex: true,
  });

  const load = () =>
    Promise.all([
      services.employment.getCandidateWorkspace(),
      services.employment.getCatalog(activeMarket.code),
    ])
      .then(async ([next, nextCatalog]) => {
        setWorkspace(next);
        setCatalog(nextCatalog);
        setProfileDraft(next.profile);
        setTalentConsent(Boolean(next.profile.recruiterSearchConsentId));
        const entries = await Promise.all(
          Array.from(new Set(next.applications.map((item) => item.jobId))).map(
            async (id) => [id, await services.employment.getJob(id)] as const,
          ),
        );
        setJobs(Object.fromEntries(entries));
      })
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Espace candidat indisponible.",
        ),
      );

  const toggleProfileId = (
    field: "skillIds" | "desiredProfessionIds" | "desiredContractTypeIds",
    id: string,
    checked: boolean,
  ) =>
    setProfileDraft((current) =>
      current
        ? {
            ...current,
            [field]: checked
              ? Array.from(new Set([...current[field], id]))
              : current[field].filter((item) => item !== id),
          }
        : current,
    );

  useEffect(() => {
    void load();
  }, [activeMarket.code]);

  const saveProfile = async () => {
    if (!profileDraft) return;
    setSaving(true);
    try {
      const next: CandidateProfile = {
        ...profileDraft,
        visibility: talentConsent
          ? "verified_recruiters"
          : profileDraft.visibility === "hidden"
            ? "hidden"
            : "applications_only",
        recruiterSearchConsentId: talentConsent
          ? profileDraft.recruiterSearchConsentId ||
            "consent-employment-talent-v1"
          : undefined,
      };
      const saved = await services.employment.saveCandidateProfile(next);
      setProfileDraft(saved);
      setWorkspace((current) =>
        current ? { ...current, profile: saved } : current,
      );
      toast.success("Profil candidat enregistré.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Profil non enregistré.",
      );
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (applicationId: string) => {
    try {
      const updated =
        await services.employment.withdrawApplication(applicationId);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              applications: current.applications.map((item) =>
                item.id === applicationId ? { ...item, ...updated } : item,
              ),
            }
          : current,
      );
      toast.success("Candidature retirée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Retrait impossible.",
      );
    }
  };

  const exportData = async () => {
    setPrivacyAction("export");
    try {
      const exported = await services.employment.exportCandidateData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(exported.data, null, 2)], {
          type: exported.mediaType,
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = exported.fileName;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Votre export Emploi a été généré.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Export indisponible.",
      );
    } finally {
      setPrivacyAction(undefined);
    }
  };

  const requestDeletion = async () => {
    setPrivacyAction("delete");
    try {
      await services.employment.requestCandidateDeletion();
      setDeletionArmed(false);
      toast.success(
        "Demande de suppression enregistrée. Vous serez informé avant son traitement.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Demande non enregistrée.",
      );
    } finally {
      setPrivacyAction(undefined);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await services.employment.deleteJobAlert(alertId);
      setWorkspace((current) =>
        current
          ? {
              ...current,
              alerts: current.alerts.filter((alert) => alert.id !== alertId),
            }
          : current,
      );
      toast.success("Alerte Emploi supprimée.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Alerte non supprimée.",
      );
    }
  };

  const respondToInterview = async (
    interviewId: string,
    status: "confirmed" | "cancelled",
  ) => {
    try {
      const updated = await services.employment.respondToInterview(
        interviewId,
        status,
      );
      setWorkspace((current) =>
        current
          ? {
              ...current,
              interviews: current.interviews.map((interview) =>
                interview.id === updated.id ? updated : interview,
              ),
            }
          : current,
      );
      toast.success(
        status === "confirmed" ? "Entretien confirmé." : "Entretien annulé.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Réponse non enregistrée.",
      );
    }
  };

  const tabs: Array<[Tab, string, React.ReactNode, number?]> = [
    [
      "applications",
      "Candidatures",
      <BriefcaseBusiness className="h-icon-sm w-icon-sm" />,
      workspace?.applications.length,
    ],
    ["profile", "Profil & CV", <UserRound className="h-icon-sm w-icon-sm" />],
    [
      "saved",
      "Offres sauvegardées",
      <Heart className="h-icon-sm w-icon-sm" />,
      workspace?.savedJobs.length,
    ],
    [
      "interviews",
      "Entretiens",
      <CalendarClock className="h-icon-sm w-icon-sm" />,
      workspace?.interviews.length,
    ],
    ["messages", "Messages", <MessageSquare className="h-icon-sm w-icon-sm" />],
    [
      "privacy",
      "Confidentialité",
      <LockKeyhole className="h-icon-sm w-icon-sm" />,
    ],
  ];
  const completion = useMemo(
    () =>
      profileDraft
        ? [
            profileDraft.professionalTitle,
            profileDraft.summary,
            profileDraft.skillIds.length,
            workspace?.cvs.length,
          ].filter(Boolean).length * 25
        : 0,
    [profileDraft, workspace?.cvs.length],
  );

  if (error)
    return (
      <StatePanel
        variant="error"
        title="Espace candidat indisponible"
        description={error}
        action={<Button onClick={load}>Réessayer</Button>}
      />
    );
  if (!workspace || !profileDraft)
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <header className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              Shongre Emploi
            </p>
            <h1 className="mt-1 text-2xl font-black text-text-main">
              Mon espace candidat
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {profileDraft.professionalTitle ||
                "Complétez votre profil professionnel"}
            </p>
          </div>
          <Button to="/emploi">Trouver une offre</Button>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs">
            <span className="font-bold">Profil complété</span>
            <span>{completion}%</span>
          </div>
          <ProgressBar
            className="mt-2"
            value={completion}
            label="Profil complété"
          />
        </div>
      </header>

      <nav
        className="flex gap-2 overflow-x-auto rounded-card border border-border-base bg-bg-surface p-2 no-scrollbar"
        aria-label="Espace candidat"
      >
        {tabs.map(([id, label, icon, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-control-md min-w-max items-center gap-2 rounded-control px-3 text-xs font-bold ${tab === id ? "bg-primary text-white" : "text-text-secondary hover:bg-bg-subtle"}`}
          >
            {icon}
            {label}
            {count !== undefined && (
              <span
                className={`rounded-pill px-2 py-0.5 ${tab === id ? "bg-white/20" : "bg-bg-subtle"}`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === "applications" && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Mes candidatures</h2>
          {workspace.applications.length === 0 ? (
            <StatePanel
              variant="notFound"
              title="Aucune candidature"
              description="Les candidatures envoyées apparaîtront ici."
              action={<Button to="/emploi">Voir les offres</Button>}
            />
          ) : (
            workspace.applications.map((application) => {
              const job = jobs[application.jobId];
              return (
                <article
                  key={application.id}
                  className="rounded-card border border-border-base bg-bg-surface p-4 shadow-xs"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(application.systemState)}>
                          {application.candidateVisibleStatus}
                        </Badge>
                        <span className="text-micro text-text-muted">
                          Envoyée le{" "}
                          {formatEmploymentDate(
                            application.submittedAt,
                            currentLocale,
                          )}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-black text-text-main">
                        {job?.title || "Offre d’emploi"}
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        {job?.employer.name}{" "}
                        {job && <>· {job.primaryLocation.label}</>}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job && (
                        <Button
                          to={`/emploi/offre/${job.slug}`}
                          variant="secondary"
                          size="sm"
                        >
                          Voir l’offre
                        </Button>
                      )}
                      {!["withdrawn", "rejected", "archived", "hired"].includes(
                        application.systemState,
                      ) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdraw(application.id)}
                        >
                          Retirer
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {tab === "profile" && (
        <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Profil professionnel</h2>
              <p className="text-xs text-text-muted">
                Distinct de votre profil public de petites annonces.
              </p>
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              <Save className="h-icon-sm w-icon-sm" />
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
          <div className="mt-6 grid gap-5">
            <FormField label="Titre professionnel">
              <Input
                value={profileDraft.professionalTitle || ""}
                onChange={(event) =>
                  setProfileDraft((current) =>
                    current
                      ? { ...current, professionalTitle: event.target.value }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField label="Présentation">
              <Textarea
                rows={6}
                value={profileDraft.summary || ""}
                onChange={(event) =>
                  setProfileDraft((current) =>
                    current
                      ? { ...current, summary: event.target.value }
                      : current,
                  )
                }
              />
            </FormField>
            <div>
              <h3 className="text-sm font-black">Compétences</h3>
              <p className="mt-1 text-xs text-text-muted">
                Choisissez uniquement des compétences professionnelles utiles
                aux postes recherchés.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {catalog?.dictionaries
                  .filter((entry) => entry.kind === "skill" && entry.isActive)
                  .map((entry) => (
                    <Checkbox
                      key={entry.id}
                      checked={profileDraft.skillIds.includes(entry.id)}
                      onChange={(event) =>
                        toggleProfileId(
                          "skillIds",
                          entry.id,
                          event.target.checked,
                        )
                      }
                      label={entry.label}
                    />
                  ))}
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <FormField
                label="Expériences"
                hint="Une expérience pertinente par ligne."
              >
                <Textarea
                  rows={5}
                  value={profileRecordText(profileDraft.experiences)}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            experiences: splitProfileLines(
                              event.target.value,
                            ).map((description) => ({ description })),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
              <FormField
                label="Formations"
                hint="Une formation ou qualification par ligne."
              >
                <Textarea
                  rows={5}
                  value={profileRecordText(profileDraft.education)}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            education: splitProfileLines(
                              event.target.value,
                            ).map((description) => ({ description })),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
              <FormField
                label="Certifications"
                hint="Une certification par ligne."
              >
                <Textarea
                  rows={4}
                  value={profileDraft.certifications.join("\n")}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            certifications: splitProfileLines(
                              event.target.value,
                            ),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
              <FormField
                label="Langues"
                hint="Une langue et son niveau par ligne."
              >
                <Textarea
                  rows={4}
                  value={profileDraft.languages
                    .map((language) => language.label || language.languageId)
                    .join("\n")}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            languages: splitProfileLines(
                              event.target.value,
                            ).map((label, index) => ({
                              languageId: `candidate-language-${index + 1}`,
                              levelId: "self_reported",
                              label,
                            })),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-black">Métiers recherchés</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {catalog?.dictionaries
                    .filter(
                      (entry) => entry.kind === "profession" && entry.isActive,
                    )
                    .map((entry) => (
                      <Checkbox
                        key={entry.id}
                        checked={profileDraft.desiredProfessionIds.includes(
                          entry.id,
                        )}
                        onChange={(event) =>
                          toggleProfileId(
                            "desiredProfessionIds",
                            entry.id,
                            event.target.checked,
                          )
                        }
                        label={entry.label}
                      />
                    ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-black">Contrats recherchés</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {catalog?.dictionaries
                    .filter(
                      (entry) =>
                        entry.kind === "contract_type" && entry.isActive,
                    )
                    .map((entry) => (
                      <Checkbox
                        key={entry.id}
                        checked={profileDraft.desiredContractTypeIds.includes(
                          entry.id,
                        )}
                        onChange={(event) =>
                          toggleProfileId(
                            "desiredContractTypeIds",
                            entry.id,
                            event.target.checked,
                          )
                        }
                        label={entry.label}
                      />
                    ))}
                </div>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Préférence de télétravail">
                <Select
                  aria-label="Préférence de télétravail"
                  value={profileDraft.remotePreferenceId || ""}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            remotePreferenceId: event.target.value || undefined,
                          }
                        : current,
                    )
                  }
                >
                  <option value="">Sans préférence</option>
                  {catalog?.dictionaries
                    .filter(
                      (entry) =>
                        entry.kind === "working_arrangement" && entry.isActive,
                    )
                    .map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                </Select>
              </FormField>
              <FormField
                label="Liens professionnels"
                hint="Une URL complète par ligne."
              >
                <Textarea
                  rows={3}
                  value={profileDraft.professionalLinks.join("\n")}
                  onChange={(event) =>
                    setProfileDraft((current) =>
                      current
                        ? {
                            ...current,
                            professionalLinks: splitProfileLines(
                              event.target.value,
                            ),
                          }
                        : current,
                    )
                  }
                />
              </FormField>
            </div>
            <FormField label="Disponibilité">
              <Input
                type="date"
                value={profileDraft.availabilityDate || ""}
                onChange={(event) =>
                  setProfileDraft((current) =>
                    current
                      ? { ...current, availabilityDate: event.target.value }
                      : current,
                  )
                }
              />
            </FormField>
            <FormField label="Visibilité par défaut">
              <Select
                aria-label="Visibilité du profil candidat"
                value={profileDraft.visibility}
                onChange={(event) =>
                  setProfileDraft((current) =>
                    current
                      ? {
                          ...current,
                          visibility: event.target
                            .value as CandidateProfile["visibility"],
                        }
                      : current,
                  )
                }
              >
                <option value="applications_only">
                  Uniquement pour mes candidatures
                </option>
                <option value="hidden">Profil masqué</option>
              </Select>
            </FormField>
          </div>
          <div className="mt-6 border-t border-border-subtle pt-5">
            <h3 className="text-sm font-black">Mes CV</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {workspace.cvs.map((cv) => (
                <div
                  key={cv.id}
                  className="flex items-center gap-3 rounded-control border border-border-base p-3"
                >
                  <FileText className="h-icon-md w-icon-md text-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{cv.label}</p>
                    <p className="truncate text-xs text-text-muted">
                      {cv.fileName}
                    </p>
                  </div>
                  {cv.isDefault && <Badge variant="primary">Par défaut</Badge>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "saved" && (
        <section>
          <h2 className="text-lg font-black">Offres sauvegardées</h2>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            {workspace.savedJobs.map((job) => (
              <JobCard key={job.id} job={job} compact />
            ))}
          </div>
        </section>
      )}

      {tab === "interviews" && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Entretiens</h2>
          {workspace.interviews.length === 0 ? (
            <StatePanel
              variant="notFound"
              title="Aucun entretien planifié"
              description="Les invitations confirmées apparaîtront ici avec leur fuseau horaire."
              action={<Button to="/emploi">Continuer ma recherche</Button>}
            />
          ) : (
            workspace.interviews.map((interview) => (
              <article
                key={interview.id}
                className="rounded-card border border-border-base bg-bg-surface p-4"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-icon-md w-icon-md text-primary" />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">
                          Entretien {labelIdentifier(interview.modeId)}
                        </h3>
                        <Badge
                          variant={
                            interview.status === "confirmed"
                              ? "success"
                              : interview.status === "cancelled"
                                ? "neutral"
                                : "warning"
                          }
                        >
                          {labelIdentifier(interview.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {new Intl.DateTimeFormat(currentLocale, {
                          dateStyle: "long",
                          timeStyle: "short",
                          timeZone: interview.timezone,
                        }).format(new Date(interview.startsAt))}
                      </p>
                      <p className="text-xs text-text-muted">
                        Fuseau : {interview.timezone}
                        {interview.locationLabel
                          ? ` · ${interview.locationLabel}`
                          : ""}
                      </p>
                      {interview.status === "confirmed" &&
                        interview.privateMeetingLink && (
                          <a
                            className="mt-2 inline-flex text-xs font-bold text-primary hover:underline"
                            href={interview.privateMeetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Ouvrir le lien privé de l’entretien
                          </a>
                        )}
                    </div>
                  </div>
                  {["proposed", "rescheduled", "confirmed"].includes(
                    interview.status,
                  ) && (
                    <div className="flex flex-wrap gap-2">
                      {interview.status !== "confirmed" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            respondToInterview(interview.id, "confirmed")
                          }
                        >
                          Confirmer
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          respondToInterview(interview.id, "cancelled")
                        }
                      >
                        {interview.status === "confirmed"
                          ? "Annuler"
                          : "Refuser"}
                      </Button>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {tab === "messages" && (
        <section className="rounded-card border border-border-base bg-bg-surface p-5">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <MessageSquare className="h-icon-md w-icon-md text-primary" />
            Messages recruteurs
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Les échanges liés aux candidatures utilisent la messagerie Shongre
            et respectent vos blocages et préférences de notification.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/compte/messages">Ouvrir mes messages</Button>
            <Button to="/compte/notifications/preferences" variant="secondary">
              Préférences de communication
            </Button>
          </div>
        </section>
      )}

      {tab === "privacy" && (
        <section className="space-y-4">
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h2 className="flex items-center gap-2 text-lg font-black">
              <ShieldCheck className="h-icon-md w-icon-md text-success" />
              Confidentialité et consentements
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Votre profil reste invisible dans la recherche recruteur tant que
              vous ne donnez pas un consentement explicite. Le retrait est
              immédiat et ne modifie pas les candidatures déjà transmises.
            </p>
            <div className="mt-5 rounded-control border border-border-base p-4">
              <Checkbox
                checked={talentConsent}
                onChange={(event) => setTalentConsent(event.target.checked)}
                label="Rendre mon profil visible aux recruteurs professionnels vérifiés"
              />
              <p className="mt-2 pl-7 text-xs text-text-secondary">
                Ce consentement peut être retiré ici à tout moment.
              </p>
            </div>
            <Button className="mt-4" onClick={saveProfile} disabled={saving}>
              Enregistrer mes choix
            </Button>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h3 className="text-sm font-black">Historique</h3>
            <ul className="mt-3 space-y-2">
              {workspace.consentHistory.map((consentRecord) => (
                <li
                  key={consentRecord.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-border-subtle py-2 text-xs"
                >
                  <span>{consentRecord.purposeId}</span>
                  <Badge
                    variant={
                      consentRecord.status === "granted" ? "success" : "neutral"
                    }
                  >
                    {consentRecord.status === "granted" ? "Accordé" : "Retiré"}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h3 className="flex items-center gap-2 text-sm font-black">
              <BellRing className="h-icon-sm w-icon-sm" />
              Alertes emploi
            </h3>
            {workspace.alerts.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                Aucune alerte active.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border-subtle">
                {workspace.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <p className="min-w-0 truncate text-sm text-text-secondary">
                      {alert.label} ·{" "}
                      {alert.frequency === "daily"
                        ? "quotidienne"
                        : alert.frequency}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Supprimer l’alerte ${alert.label}`}
                      onClick={() => deleteAlert(alert.id)}
                    >
                      <BellOff className="h-icon-sm w-icon-sm" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-card border border-border-base bg-bg-surface p-5">
            <h3 className="text-sm font-black">Vos données Emploi</h3>
            <p className="mt-2 text-sm text-text-secondary">
              Téléchargez une copie structurée de vos données ou demandez la
              suppression de l’espace candidat. Une demande de suppression est
              vérifiée avant traitement pour préserver les obligations légales
              applicables.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={exportData}
                disabled={Boolean(privacyAction)}
              >
                <Download className="h-icon-sm w-icon-sm" />
                {privacyAction === "export"
                  ? "Génération…"
                  : "Exporter mes données"}
              </Button>
              {deletionArmed ? (
                <>
                  <Button
                    variant="danger"
                    onClick={requestDeletion}
                    disabled={Boolean(privacyAction)}
                  >
                    <Trash2 className="h-icon-sm w-icon-sm" />
                    {privacyAction === "delete"
                      ? "Enregistrement…"
                      : "Confirmer la demande"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDeletionArmed(false)}
                  >
                    Annuler
                  </Button>
                </>
              ) : (
                <Button variant="ghost" onClick={() => setDeletionArmed(true)}>
                  Demander la suppression
                </Button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
