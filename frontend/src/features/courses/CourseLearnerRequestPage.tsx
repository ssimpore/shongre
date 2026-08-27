import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import type {
  CourseCatalog,
  DeliveryMode,
  LearnerRequest,
} from "@shongre/contracts/courses";
import { COURSE_CONSTRAINTS } from "@shongre/contracts/courses";
import type {
  LearnerRequestDraft,
  LearnerRequestProgressDraft,
} from "../../api/contracts/courses.contract";
import { services } from "../../api/client/service-registry";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Button,
  Container,
  Select,
  Skeleton,
  StatePanel,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { useAuth } from "../../app/providers/AuthProvider";

interface RequestFormState extends LearnerRequestProgressDraft {
  guardianName: string;
  guardianRelationship: string;
  guardianConsent: boolean;
}

export const CourseLearnerRequestPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { activeMarket, currencySymbol } = useMarketLocation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const accountId = currentUser?.id || "guest";
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<RequestFormState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<LearnerRequest | null>(null);
  const [loadError, setLoadError] = useState(false);

  usePageMeta({
    title: t("verticals.education.requestTitle"),
    description:
      "Décrivez votre objectif, vos disponibilités et votre budget pour recevoir des propositions de professeurs pertinentes.",
    canonicalPath: "/education/demande",
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.courses.getCatalog(activeMarket.code),
      services.courses.getLearnerRequestDraft(
        accountId,
        activeMarket.code,
        searchParams.get("subject") || undefined,
      ),
    ])
      .then(([nextCatalog, savedDraft]) => {
        setCatalog(nextCatalog);
        setForm({
          ...savedDraft,
          guardianName: "",
          guardianRelationship: "",
          guardianConsent: false,
        });
      })
      .catch(() => setLoadError(true));
  }, [accountId, activeMarket.code, searchParams]);

  useEffect(() => {
    // Persist only non-contact learning criteria. Guardian names and consent
    // remain memory-only and are sent directly to the service on submission.
    if (!form) return;
    const {
      guardianName: _name,
      guardianRelationship: _relationship,
      guardianConsent: _consent,
      ...safeDraft
    } = form;
    void services.courses.saveLearnerRequestDraft(accountId, safeDraft);
  }, [accountId, form]);

  const steps = [
    "Besoin",
    "Modalités",
    "Budget et date",
    "Responsable et sécurité",
  ];
  const isMinor = form ? form.learnerAgeBand !== "adult" : false;

  const update = <K extends keyof RequestFormState>(
    key: K,
    value: RequestFormState[K],
  ) => setForm((current) => (current ? { ...current, [key]: value } : current));

  const toggleArray = <T extends string>(current: T[], value: T): T[] =>
    current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];

  const stepIsValid = useMemo(() => {
    if (!form) return false;
    if (step === 0)
      return Boolean(
        form.subjectId && form.levelId && form.objective.trim().length >= 10,
      );
    if (step === 1)
      return Boolean(
        form.preferredSchedule.length &&
        form.deliveryModes.length &&
        (form.deliveryModes.includes("online") || form.city.trim()),
      );
    if (step === 2)
      return Boolean(
        form.desiredStartDate &&
        (!form.budgetMinEuros ||
          !form.budgetMaxEuros ||
          Number(form.budgetMinEuros) <= Number(form.budgetMaxEuros)),
      );
    return (
      !isMinor ||
      Boolean(
        form.guardianName.trim() &&
        form.guardianRelationship.trim() &&
        form.guardianConsent,
      )
    );
  }, [form, isMinor, step]);

  const submit = async () => {
    if (!stepIsValid || !form) return;
    const request: LearnerRequestDraft = {
      marketCode: activeMarket.code,
      subjectId: form.subjectId,
      levelId: form.levelId,
      objective: form.objective.trim(),
      preferredSchedule: form.preferredSchedule,
      deliveryModes: form.deliveryModes,
      city: form.city.trim() || undefined,
      radiusKm: form.deliveryModes.includes("in_person")
        ? form.radiusKm
        : undefined,
      budgetMin: form.budgetMinEuros
        ? {
            amountMinor: Math.round(
              Number(form.budgetMinEuros) *
                COURSE_CONSTRAINTS.minorUnitsPerMajor,
            ),
            currency: catalog?.config.currency || activeMarket.currency,
          }
        : undefined,
      budgetMax: form.budgetMaxEuros
        ? {
            amountMinor: Math.round(
              Number(form.budgetMaxEuros) *
                COURSE_CONSTRAINTS.minorUnitsPerMajor,
            ),
            currency: catalog?.config.currency || activeMarket.currency,
          }
        : undefined,
      desiredStartDate: form.desiredStartDate,
      context: form.context.trim(),
      learnerAgeBand: form.learnerAgeBand,
      guardianContact: isMinor
        ? {
            guardianName: form.guardianName.trim(),
            relationship: form.guardianRelationship.trim(),
            consentConfirmedAt: new Date().toISOString(),
          }
        : undefined,
    };
    setIsSubmitting(true);
    try {
      const result = await services.courses.submitLearnerRequest(request);
      setSubmitted(result);
      await services.courses.clearLearnerRequestDraft(accountId);
      toast.success("Votre demande a été transmise.");
    } catch (reason) {
      toast.error(
        reason instanceof Error
          ? reason.message
          : "La demande n’a pas pu être envoyée.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <Container className="py-10">
        <StatePanel
          title="Formulaire indisponible"
          description="Le catalogue de matières n’a pas pu être chargé. Votre brouillon local est conservé."
          action={
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          }
        />
      </Container>
    );
  }

  if (!catalog || !form) {
    return (
      <Container className="py-8">
        <Skeleton className="mx-auto h-136 max-w-3xl rounded-card" />
      </Container>
    );
  }

  if (submitted) {
    return (
      <Container className="py-10">
        <div className="mx-auto max-w-2xl rounded-card border border-success-border bg-bg-surface p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-pill bg-success-surface text-success">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-xl font-black text-text-main">
            Votre demande est enregistrée
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-text-secondary">
            Les profils sont rapprochés selon la matière, le niveau, les
            modalités, la disponibilité et la sécurité. Vos coordonnées restent
            masquées jusqu’à une acceptation conforme aux règles de contact.
          </p>
          <p className="mt-4 text-xs text-text-muted">
            Référence : {submitted.id}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button to="/education">Voir les professeurs</Button>
            <Button to="/compte/messages" variant="outline">
              Ouvrir mes messages
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-5 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="flex items-center gap-2 text-xs font-bold text-primary">
            <BookOpen className="h-icon-sm w-icon-sm" aria-hidden="true" />
            {t("verticals.education.brand")}
          </p>
          <h1 className="mt-1 text-xl font-black text-text-main sm:text-2xl">
            Décrire mon besoin
          </h1>
          <p className="mt-1 text-xs text-text-secondary sm:text-sm">
            Une demande précise aide les professeurs disponibles à répondre
            utilement.
          </p>
        </div>

        <ol className="mb-5 grid grid-cols-4 gap-2" aria-label="Progression">
          {steps.map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined}>
              <div
                className={`h-1 rounded-pill ${index <= step ? "bg-primary" : "bg-bg-muted"}`}
              />
              <span
                className={`mt-2 hidden text-micro font-semibold sm:block ${index === step ? "text-text-main" : "text-text-muted"}`}
              >
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>

        <div className="rounded-card border border-border-base bg-bg-surface p-5 shadow-xs sm:p-7">
          {step === 0 && (
            <section aria-labelledby="request-step-need" className="space-y-5">
              <div>
                <h2
                  id="request-step-need"
                  className="text-base font-black text-text-main"
                >
                  Quel accompagnement recherchez-vous ?
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  La matière et le niveau sont les premiers critères de
                  pertinence.
                </p>
              </div>
              <label className="block text-xs font-bold text-text-main">
                Matière
                <Select
                  className="mt-2 w-full"
                  labelledByAncestor
                  value={form.subjectId}
                  onChange={(event) => update("subjectId", event.target.value)}
                >
                  <option value="">Choisir une matière</option>
                  {catalog.subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-xs font-bold text-text-main">
                Niveau de l’élève
                <Select
                  className="mt-2 w-full"
                  labelledByAncestor
                  value={form.levelId}
                  onChange={(event) => update("levelId", event.target.value)}
                >
                  <option value="">Choisir un niveau</option>
                  {catalog.levels.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block text-xs font-bold text-text-main">
                Objectif principal
                <textarea
                  value={form.objective}
                  onChange={(event) => update("objective", event.target.value)}
                  placeholder="Ex. reprendre les bases et préparer le brevet"
                  maxLength={COURSE_CONSTRAINTS.learnerObjective.maxLength}
                  rows={4}
                  className="mt-2 w-full rounded-control border border-border-base bg-bg-base p-3 text-sm font-normal leading-relaxed min-h-control-touch"
                />
                <span className="mt-1 block text-micro font-normal text-text-muted">
                  {COURSE_CONSTRAINTS.learnerObjective.minLength} caractères
                  minimum · {form.objective.length}/
                  {COURSE_CONSTRAINTS.learnerObjective.maxLength}
                </span>
              </label>
            </section>
          )}

          {step === 1 && (
            <section
              aria-labelledby="request-step-format"
              className="space-y-5"
            >
              <div>
                <h2
                  id="request-step-format"
                  className="text-base font-black text-text-main"
                >
                  Où et quand souhaitez-vous apprendre ?
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Choisissez plusieurs options si votre emploi du temps est
                  flexible.
                </p>
              </div>
              <fieldset>
                <legend className="text-xs font-bold text-text-main">
                  Format du cours
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    ["online", "En ligne", "Visioconférence"],
                    [
                      "in_person",
                      "En présentiel",
                      "À domicile ou dans un lieu convenu",
                    ],
                  ].map(([value, label, description]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-control border border-border-base p-3 hover:border-primary-border"
                    >
                      <input
                        type="checkbox"
                        checked={form.deliveryModes.includes(
                          value as DeliveryMode,
                        )}
                        onChange={() =>
                          update(
                            "deliveryModes",
                            toggleArray(
                              form.deliveryModes,
                              value as DeliveryMode,
                            ),
                          )
                        }
                      />
                      <span>
                        <span className="block text-xs font-bold text-text-main">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-micro text-text-muted">
                          {description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {form.deliveryModes.includes("in_person") && (
                <div className="grid gap-3 sm:grid-cols-content-compact-aside">
                  <label className="block text-xs font-bold text-text-main">
                    Ville
                    <div className="relative mt-2">
                      <MapPin
                        className="absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
                        aria-hidden="true"
                      />
                      <input
                        value={form.city}
                        onChange={(event) => update("city", event.target.value)}
                        className="h-control-touch w-full rounded-control border border-border-base bg-bg-base pl-9 pr-3 text-sm font-normal"
                        placeholder="Ville"
                      />
                    </div>
                  </label>
                  <label className="block text-xs font-bold text-text-main">
                    Rayon
                    <Select
                      className="mt-2 w-full"
                      labelledByAncestor
                      value={form.radiusKm}
                      onChange={(event) =>
                        update("radiusKm", Number(event.target.value))
                      }
                    >
                      {[5, 10, 15, 25, 40].map((radius) => (
                        <option key={radius} value={radius}>
                          {radius} km
                        </option>
                      ))}
                    </Select>
                  </label>
                </div>
              )}
              <fieldset>
                <legend className="text-xs font-bold text-text-main">
                  Créneaux préférés
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    ["weekday_morning", "Matin en semaine"],
                    ["weekday_afternoon", "Après-midi en semaine"],
                    ["weekday_evening", "Soir en semaine"],
                    ["weekend", "Week-end"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-control-touch cursor-pointer items-center gap-2 rounded-control border border-border-base px-3 text-xs text-text-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={form.preferredSchedule.includes(value)}
                        onChange={() =>
                          update(
                            "preferredSchedule",
                            toggleArray(form.preferredSchedule, value),
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {step === 2 && (
            <section
              aria-labelledby="request-step-budget"
              className="space-y-5"
            >
              <div>
                <h2
                  id="request-step-budget"
                  className="text-base font-black text-text-main"
                >
                  Budget et date de début
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Le budget aide à éviter les propositions incompatibles. Il ne
                  modifie pas la priorité de sécurité.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-bold text-text-main">
                  Budget minimum par heure
                  <div className="relative mt-2">
                    <input
                      type="number"
                      min={COURSE_CONSTRAINTS.budgetMajor.min}
                      step={COURSE_CONSTRAINTS.budgetMajor.step}
                      value={form.budgetMinEuros}
                      onChange={(event) =>
                        update("budgetMinEuros", event.target.value)
                      }
                      className="h-control-touch w-full rounded-control border border-border-base bg-bg-base px-3 pr-9 text-sm font-normal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                      {currencySymbol}
                    </span>
                  </div>
                </label>
                <label className="block text-xs font-bold text-text-main">
                  Budget maximum par heure
                  <div className="relative mt-2">
                    <input
                      type="number"
                      min={COURSE_CONSTRAINTS.budgetMajor.min}
                      step={COURSE_CONSTRAINTS.budgetMajor.step}
                      value={form.budgetMaxEuros}
                      onChange={(event) =>
                        update("budgetMaxEuros", event.target.value)
                      }
                      className="h-control-touch w-full rounded-control border border-border-base bg-bg-base px-3 pr-9 text-sm font-normal"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                      {currencySymbol}
                    </span>
                  </div>
                </label>
              </div>
              <label className="block text-xs font-bold text-text-main">
                Date de début souhaitée
                <div className="relative mt-2">
                  <CalendarDays
                    className="absolute left-3 top-1/2 h-icon-sm w-icon-sm -translate-y-1/2 text-text-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    value={form.desiredStartDate}
                    onChange={(event) =>
                      update("desiredStartDate", event.target.value)
                    }
                    className="h-control-touch w-full rounded-control border border-border-base bg-bg-base pl-9 pr-3 text-sm font-normal"
                  />
                </div>
              </label>
              <label className="block text-xs font-bold text-text-main">
                Contexte utile (facultatif)
                <textarea
                  value={form.context}
                  onChange={(event) => update("context", event.target.value)}
                  maxLength={COURSE_CONSTRAINTS.learnerContext.maxLength}
                  rows={5}
                  placeholder="Rythme actuel, difficultés, échéances ou aménagements utiles…"
                  className="mt-2 w-full rounded-control border border-border-base bg-bg-base p-3 text-sm font-normal leading-relaxed min-h-control-touch"
                />
              </label>
            </section>
          )}

          {step === 3 && (
            <section
              aria-labelledby="request-step-safety"
              className="space-y-5"
            >
              <div>
                <h2
                  id="request-step-safety"
                  className="text-base font-black text-text-main"
                >
                  Élève, responsable et sécurité
                </h2>
                <p className="mt-1 text-xs text-text-secondary">
                  Les coordonnées d’un mineur ne sont jamais publiées dans la
                  demande.
                </p>
              </div>
              <label className="block text-xs font-bold text-text-main">
                Tranche d’âge de l’élève
                <Select
                  className="mt-2 w-full"
                  labelledByAncestor
                  value={form.learnerAgeBand}
                  onChange={(event) =>
                    update(
                      "learnerAgeBand",
                      event.target.value as RequestFormState["learnerAgeBand"],
                    )
                  }
                >
                  <option value="adult">Adulte</option>
                  <option value="16_17">16–17 ans</option>
                  <option value="13_15">13–15 ans</option>
                  <option value="under_13">Moins de 13 ans</option>
                </Select>
              </label>
              {isMinor && (
                <div className="space-y-4 rounded-card border border-warning-border bg-warning-surface p-4">
                  <div className="flex items-start gap-3">
                    <Users
                      className="h-icon-md w-icon-md shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    <div>
                      <h3 className="text-xs font-black text-text-main">
                        Responsable légal requis
                      </h3>
                      <p className="mt-1 text-micro leading-relaxed text-text-secondary">
                        Le responsable légal reste le contact du professeur et
                        organise les rencontres.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-text-main">
                      Nom du responsable
                      <input
                        value={form.guardianName}
                        onChange={(event) =>
                          update("guardianName", event.target.value)
                        }
                        className="mt-2 h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm font-normal"
                      />
                    </label>
                    <label className="block text-xs font-bold text-text-main">
                      Lien avec l’élève
                      <input
                        value={form.guardianRelationship}
                        onChange={(event) =>
                          update("guardianRelationship", event.target.value)
                        }
                        placeholder="Parent, tuteur…"
                        className="mt-2 h-control-touch w-full rounded-control border border-border-base bg-bg-surface px-3 text-sm font-normal"
                      />
                    </label>
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-text-secondary">
                    <input
                      type="checkbox"
                      checked={form.guardianConsent}
                      onChange={(event) =>
                        update("guardianConsent", event.target.checked)
                      }
                    />
                    <span>
                      Je confirme être habilité à organiser ces cours et consens
                      à être le contact du professeur pour cet élève mineur.
                    </span>
                  </label>
                </div>
              )}
              <div className="rounded-card border border-success-border bg-success-surface p-4">
                <h3 className="flex items-center gap-2 text-xs font-black text-text-main">
                  <ShieldCheck
                    className="h-icon-sm w-icon-sm text-success"
                    aria-hidden="true"
                  />
                  Ce qui se passe après l’envoi
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-secondary">
                  <li>
                    • La pertinence, la disponibilité et la sécurité restent
                    prioritaires.
                  </li>
                  <li>
                    • Vos coordonnées sont masquées avant une acceptation
                    valide.
                  </li>
                  <li>
                    • Vous pouvez signaler et bloquer un profil à tout moment.
                  </li>
                </ul>
              </div>
            </section>
          )}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
            {step > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setStep((current) => current - 1)}
                leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
              >
                Retour
              </Button>
            ) : (
              <Button
                to="/education"
                variant="ghost"
                leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
              >
                Annuler
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button
                onClick={() => setStep((current) => current + 1)}
                disabled={!stepIsValid}
                rightIcon={<ArrowRight className="h-icon-sm w-icon-sm" />}
              >
                Continuer
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={!stepIsValid}
                isLoading={isSubmitting}
              >
                Envoyer ma demande
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-micro leading-relaxed text-text-muted">
          Votre brouillon non sensible est conservé sur cet appareil. Les
          coordonnées du responsable ne sont enregistrées qu’à l’envoi.
        </p>
      </div>
    </Container>
  );
};
