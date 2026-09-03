import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  CandidateWorkspace,
  JobPostingDetail,
} from "@shongre/contracts/employment";
import { EMPLOYMENT_TEXT_LIMITS } from "@shongre/contracts/employment";
import { services } from "../../api/client/service-registry";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Checkbox,
  Container,
  Input,
  Select,
  Skeleton,
  StatePanel,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";

export const EmploymentApplyPage: React.FC = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [job, setJob] = useState<JobPostingDetail | null>(null);
  const [workspace, setWorkspace] = useState<CandidateWorkspace | null>(null);
  const [cvId, setCvId] = useState("");
  const [coverMessage, setCoverMessage] = useState("");
  const [screeningAnswers, setScreeningAnswers] = useState<
    Record<string, string>
  >({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();

  usePageMeta({
    title: job ? `Postuler – ${job.title}` : "Postuler à une offre",
    description:
      "Envoyez une candidature sécurisée depuis votre espace candidat Shongre.",
    canonicalPath: `/emploi/offre/${slug}/postuler`,
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.employment.getJob(slug),
      services.employment.getCandidateWorkspace(),
    ])
      .then(([nextJob, nextWorkspace]) => {
        setJob(nextJob);
        setWorkspace(nextWorkspace);
        setCvId(
          nextWorkspace.cvs.find(
            (cv) => cv.isDefault && cv.malwareScanStatus === "clean",
          )?.id || "",
        );
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Candidature indisponible.",
        ),
      );
  }, [slug]);

  const activeApplication = useMemo(
    () =>
      workspace?.applications.find(
        (item) =>
          item.jobId === job?.id &&
          !["withdrawn", "rejected", "archived"].includes(item.systemState),
      ),
    [job?.id, workspace?.applications],
  );
  const requiredQuestionsAnswered = useMemo(
    () =>
      job?.screeningQuestions.every(
        (question) =>
          !question.isRequired ||
          Boolean(screeningAnswers[question.id]?.trim()),
      ) ?? false,
    [job?.screeningQuestions, screeningAnswers],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!job || !cvId || !consent || !requiredQuestionsAnswered) return;
    setSubmitting(true);
    try {
      await services.employment.apply(job.id, {
        cvId,
        coverMessage: coverMessage.trim() || undefined,
        screeningAnswers: Object.entries(screeningAnswers)
          .filter(([, answer]) => answer.trim())
          .map(([questionId, answer]) => ({ questionId, answer })),
        privacyConsent: true,
        privacyPolicyVersion: "employment-candidate-v1",
      });
      setSubmitted(true);
      toast.success("Votre candidature a été transmise.");
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "La candidature n’a pas pu être envoyée.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (error)
    return (
      <Container className="py-10">
        <StatePanel
          variant="error"
          title="Impossible de postuler"
          description={error}
          action={
            <Button onClick={() => navigate("/emploi")}>
              Revenir aux offres
            </Button>
          }
        />
      </Container>
    );
  if (!job || !workspace)
    return (
      <Container className="space-y-4 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-80 w-full" />
      </Container>
    );

  if (submitted) {
    return (
      <div>
        <Container width="content" className="py-10 sm:py-16">
          <div className="rounded-card border border-success-border bg-success-surface p-6 text-center shadow-sm sm:p-10">
            <CheckCircle2
              className="mx-auto h-12 w-12 text-success"
              aria-hidden="true"
            />
            <h1 className="mt-4 text-2xl font-bold text-text-main">
              Candidature envoyée
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm text-text-secondary">
              {job.employer.name} a reçu votre candidature pour « {job.title} ».
              Son suivi est disponible dans votre espace candidat.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Button onClick={() => navigate("/compte/emploi")}>
                Suivre ma candidature
              </Button>
              <Button variant="secondary" onClick={() => navigate("/emploi")}>
                Voir d’autres offres
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div>
      <Container width="content" className="py-6 sm:py-10">
        <Link
          to={`/emploi/offre/${job.slug}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-icon-sm w-icon-sm" />
          Retour à l’offre
        </Link>
        <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-content-aside-xs">
          <form
            onSubmit={submit}
            className="min-w-0 max-w-full overflow-hidden rounded-card border border-border-base bg-bg-surface p-5 shadow-sm sm:p-7"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Candidature directe
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold text-text-main">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              {job.employer.name} · {job.primaryLocation.label}
            </p>

            {activeApplication ? (
              <StatePanel
                className="mt-6"
                variant="restricted"
                title="Candidature déjà active"
                description={`Statut : ${activeApplication.candidateVisibleStatus}. Vous pouvez la suivre depuis votre espace candidat.`}
                action={
                  <Button onClick={() => navigate("/compte/emploi")}>
                    Voir mon suivi
                  </Button>
                }
              />
            ) : (
              <>
                <fieldset className="mt-7">
                  <legend className="text-sm font-bold text-text-main">
                    Choisir un CV
                  </legend>
                  <div className="mt-3 space-y-2">
                    {workspace.cvs.map((cv) => (
                      <label
                        key={cv.id}
                        className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-control border p-3 ${cvId === cv.id ? "border-primary bg-primary-light" : "border-border-base"}`}
                      >
                        <input
                          type="radio"
                          name="cv"
                          value={cv.id}
                          checked={cvId === cv.id}
                          disabled={cv.malwareScanStatus !== "clean"}
                          onChange={() => setCvId(cv.id)}
                        />
                        <FileText
                          className="h-icon-md w-icon-md text-primary"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-text-main">
                            {cv.label}
                          </span>
                          <span className="block truncate text-xs text-text-secondary">
                            {cv.fileName}
                          </span>
                        </span>
                        <span className="max-w-20 shrink text-right text-micro font-bold text-success">
                          {cv.malwareScanStatus === "clean"
                            ? "Fichier contrôlé"
                            : "En attente"}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label
                  className="mt-6 block text-sm font-semibold text-text-main"
                  htmlFor="employment-cover-message"
                >
                  Message au recruteur{" "}
                  <span className="font-normal text-text-muted">
                    (facultatif)
                  </span>
                </label>
                <Textarea
                  id="employment-cover-message"
                  className="mt-2"
                  rows={7}
                  maxLength={EMPLOYMENT_TEXT_LIMITS.applicationCoverMessage}
                  value={coverMessage}
                  onChange={(event) => setCoverMessage(event.target.value)}
                  placeholder="Expliquez brièvement ce qui vous motive pour ce poste."
                />
                <p className="mt-1 text-right text-micro text-text-muted">
                  {coverMessage.length} /{" "}
                  {EMPLOYMENT_TEXT_LIMITS.applicationCoverMessage.toLocaleString()}
                </p>

                {job.screeningQuestions.length ? (
                  <fieldset className="mt-6 space-y-4">
                    <legend className="text-sm font-bold text-text-main">
                      Questions de candidature
                    </legend>
                    <p className="text-xs text-text-secondary">
                      Ces réponses sont transmises uniquement aux recruteurs
                      autorisés sur cette offre.
                    </p>
                    {job.screeningQuestions.map((question) => {
                      const id = `employment-screening-${question.id}`;
                      const value = screeningAnswers[question.id] || "";
                      const update = (answer: string) =>
                        setScreeningAnswers((current) => ({
                          ...current,
                          [question.id]: answer,
                        }));
                      return (
                        <label key={question.id} className="block" htmlFor={id}>
                          <span className="mb-2 block text-xs font-bold text-text-main">
                            {question.label}
                            {question.isRequired ? " *" : ""}
                          </span>
                          {question.options.length ? (
                            <Select
                              id={id}
                              value={value}
                              required={question.isRequired}
                              onChange={(event) => update(event.target.value)}
                            >
                              <option value="">Sélectionner une réponse</option>
                              {question.options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </Select>
                          ) : question.questionTypeId.endsWith("long_text") ? (
                            <Textarea
                              id={id}
                              rows={4}
                              value={value}
                              required={question.isRequired}
                              onChange={(event) => update(event.target.value)}
                            />
                          ) : (
                            <Input
                              id={id}
                              value={value}
                              required={question.isRequired}
                              onChange={(event) => update(event.target.value)}
                            />
                          )}
                          {question.helpText ? (
                            <span className="mt-1 block text-micro text-text-secondary">
                              {question.helpText}
                            </span>
                          ) : null}
                        </label>
                      );
                    })}
                  </fieldset>
                ) : null}

                <div className="mt-6 rounded-control border border-border-base bg-bg-subtle p-4">
                  <Checkbox
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    label="J’accepte que ces informations soient transmises à cet employeur pour traiter ma candidature."
                  />
                  <p className="mt-2 pl-7 text-xs leading-relaxed text-text-secondary">
                    Vos documents restent privés. Ils ne sont accessibles qu’aux
                    recruteurs autorisés sur cette candidature et sont supprimés
                    selon la durée de conservation indiquée dans la notice
                    Emploi.
                  </p>
                </div>

                <div className="mt-6 rounded-control border border-border-base p-4 text-xs text-text-secondary">
                  <p className="font-bold text-text-main">Avant l’envoi</p>
                  <p className="mt-1">
                    CV :{" "}
                    {workspace.cvs.find((cv) => cv.id === cvId)?.label ||
                      "à sélectionner"}{" "}
                    · {job.screeningQuestions.length} question(s) · message{" "}
                    {coverMessage.trim() ? "ajouté" : "non ajouté"}
                  </p>
                </div>
                <Button
                  className="mt-6 w-full sm:w-auto"
                  type="submit"
                  disabled={
                    !cvId ||
                    !consent ||
                    !requiredQuestionsAnswered ||
                    submitting
                  }
                >
                  {submitting ? "Envoi en cours…" : "Envoyer ma candidature"}
                </Button>
              </>
            )}
          </form>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
            <div className="min-w-0 rounded-card border border-border-base bg-bg-surface p-4">
              <h2 className="flex min-w-0 items-center gap-2 break-words text-sm font-bold text-text-main">
                <ShieldCheck className="h-icon-sm w-icon-sm shrink-0 text-success" />
                Candidature sécurisée
              </h2>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-secondary">
                <li>Aucun frais pour le candidat</li>
                <li>Statuts lisibles et non trompeurs</li>
                <li>Retrait possible depuis votre espace</li>
              </ul>
            </div>
            <div className="min-w-0 break-words rounded-card border border-primary-border bg-primary-light p-4 text-xs leading-relaxed text-text-secondary">
              <LockKeyhole className="mb-2 h-icon-sm w-icon-sm text-primary" />
              Shongre n’utilise ni l’âge, ni le genre, ni l’origine ou tout
              autre attribut sensible pour classer les candidatures.
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
};
