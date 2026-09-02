import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Laptop,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { CourseCatalog, DeliveryMode } from "@shongre/contracts/courses";
import { COURSE_CONSTRAINTS } from "@shongre/contracts/courses";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import type { TutorOnboardingDraft } from "../../api/contracts/courses.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  OnboardingPreparationPage,
  SelectableCard,
  Skeleton,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";
import { formatCurrencySymbol } from "../../utilities/formatters";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { scrollToTop } from "../../utilities/motion";
import { useRegionalFormatters } from "../../hooks/useRegionalFormatters";

const STEPS = [
  { label: "Profil", icon: UserRound },
  { label: "Expertise", icon: GraduationCap },
  { label: "Formats", icon: Laptop },
  { label: "Présentation", icon: BookOpen },
  { label: "Tarif & créneaux", icon: Clock3 },
  { label: "Formule", icon: Sparkles },
  { label: "Vérification", icon: ShieldCheck },
] as const;

const ONBOARDING_STEP = {
  profile: 0,
  expertise: 1,
  formats: 2,
  presentation: 3,
  availability: 4,
  plan: 5,
  verification: 6,
} as const;
const ONBOARDING_STEP_DELTA = 1;
const LAST_ONBOARDING_STEP = STEPS.length - ONBOARDING_STEP_DELTA;

const toggle = <T,>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

export const CourseTutorOnboardingPage: React.FC = () => {
  const { t, locale } = useTranslation();
  const { activeMarket } = useMarketLocation();
  const { formatMoney } = useRegionalFormatters();
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const startsAtRequestedStep = searchParams.has("step");
  const accountId = currentUser?.id || "guest";
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [step, setStep] = useState<number>(() =>
    searchParams.get("step") === "availability"
      ? ONBOARDING_STEP.availability
      : ONBOARDING_STEP.profile,
  );
  const [draft, setDraft] = useState<TutorOnboardingDraft | null>(null);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [isPreparationVisible, setIsPreparationVisible] = useState(
    !startsAtRequestedStep,
  );
  const [hasEnteredWizard, setHasEnteredWizard] = useState(
    startsAtRequestedStep,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const wizardHeadingRef = useRef<HTMLHeadingElement>(null);

  usePageMeta({
    title: t("verticals.education.onboardingTitle"),
    description:
      "Créez votre profil professeur et publiez votre premier cours.",
    canonicalPath: "/deposer/education",
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.courses.getCatalog(activeMarket.code),
      services.courses.getTutorOnboardingDraft(
        accountId,
        activeMarket.code,
        currentUser?.name,
      ),
    ])
      .then(([nextCatalog, savedDraft]) => {
        setCatalog(nextCatalog);
        setDraft(savedDraft);
        setHasSavedProgress(
          Boolean(
            savedDraft.headline.trim() ||
            savedDraft.subjectIds.length > 0 ||
            savedDraft.biography.trim(),
          ),
        );
      })
      .catch(() => {
        toast.error(t("verticals.education.catalogUnavailable"));
      });
  }, [accountId, activeMarket.code, currentUser?.name, t, toast]);

  useEffect(() => {
    if (!draft || !hasEnteredWizard) return;
    // The adapter owns draft persistence; UI never chooses a storage backend.
    void services.courses.saveTutorOnboardingDraft(accountId, draft);
  }, [accountId, draft, hasEnteredWizard]);

  useEffect(() => {
    if (!isPreparationVisible) wizardHeadingRef.current?.focus();
  }, [isPreparationVisible]);

  const availableLevels = useMemo(() => {
    if (!catalog || !draft) return [];
    const allowed = new Set(
      catalog.subjects
        .filter((subject) => draft.subjectIds.includes(subject.id))
        .flatMap((subject) => subject.levelIds),
    );
    return catalog.levels.filter((level) => allowed.has(level.id));
  }, [catalog, draft]);

  const update = <K extends keyof TutorOnboardingDraft>(
    key: K,
    value: TutorOnboardingDraft[K],
  ) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const canContinue = (() => {
    if (!draft) return false;
    if (step === ONBOARDING_STEP.profile) {
      return (
        draft.displayName.trim().length >=
          COURSE_CONSTRAINTS.tutorDisplayName.minLength &&
        (draft.accountKind === "individual" ||
          draft.organizationName.trim().length >=
            COURSE_CONSTRAINTS.tutorOrganizationName.minLength)
      );
    }
    if (step === ONBOARDING_STEP.expertise)
      return draft.subjectIds.length > 0 && draft.levelIds.length > 0;
    if (step === ONBOARDING_STEP.formats)
      return (
        draft.deliveryModes.length > 0 &&
        draft.city.trim().length >= COURSE_CONSTRAINTS.tutorCity.minLength
      );
    if (step === ONBOARDING_STEP.presentation)
      return (
        draft.headline.length >= COURSE_CONSTRAINTS.tutorHeadline.minLength &&
        draft.biography.length >= COURSE_CONSTRAINTS.tutorBiography.minLength &&
        draft.teachingApproach.length >=
          COURSE_CONSTRAINTS.tutorTeachingApproach.minLength
      );
    if (step === ONBOARDING_STEP.availability)
      return (
        draft.priceMinor >= COURSE_CONSTRAINTS.hourlyPriceMinor.min &&
        draft.availability.length >=
          COURSE_CONSTRAINTS.tutorAvailability.minItems
      );
    return true;
  })();

  const publish = async () => {
    if (!catalog || !draft || isSubmitting || !canContinue) return;
    setIsSubmitting(true);
    try {
      await services.courses.submitTutorOnboarding(
        accountId,
        activeMarket.code,
        draft,
      );
      setIsComplete(true);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Publication impossible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOnboarding = () => {
    setHasEnteredWizard(true);
    setIsPreparationVisible(false);
    scrollToTop();
  };

  const goBack = () => {
    if (step === ONBOARDING_STEP.profile) {
      setIsPreparationVisible(true);
    } else {
      setStep((value) => value - ONBOARDING_STEP_DELTA);
    }
    scrollToTop();
  };

  if (isPreparationVisible) {
    return (
      <OnboardingPreparationPage
        eyebrow={t("onboarding.preparation.education.eyebrow")}
        title={t("onboarding.preparation.education.title")}
        description={t("onboarding.preparation.education.description")}
        checklistTitle={t("onboarding.preparation.education.checklistTitle")}
        items={[
          {
            title: t("onboarding.preparation.education.expertiseTitle"),
            description: t(
              "onboarding.preparation.education.expertiseDescription",
            ),
            icon: GraduationCap,
          },
          {
            title: t("onboarding.preparation.education.availabilityTitle"),
            description: t(
              "onboarding.preparation.education.availabilityDescription",
            ),
            icon: Clock3,
          },
          {
            title: t("onboarding.preparation.education.presentationTitle"),
            description: t(
              "onboarding.preparation.education.presentationDescription",
            ),
            icon: BookOpen,
          },
        ]}
        actionLabel={t(
          hasSavedProgress
            ? "onboarding.preparation.education.resume"
            : "onboarding.preparation.education.start",
        )}
        durationLabel={t("onboarding.preparation.education.duration")}
        statusLabel={t(
          !catalog || !draft
            ? "onboarding.preparation.loading"
            : hasSavedProgress
              ? "onboarding.preparation.resumeReady"
              : "onboarding.preparation.autosave",
        )}
        isReady={Boolean(catalog && draft)}
        onStart={startOnboarding}
      />
    );
  }

  if (!catalog || !draft)
    return <Skeleton className="mx-auto h-152 w-full max-w-5xl rounded-card" />;

  if (isComplete) {
    return (
      <div className="mx-auto max-w-xl rounded-card border border-success-border bg-bg-surface p-8 text-center shadow-sm">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-pill bg-success-surface text-success">
          <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-xl font-black text-text-main">
          Votre profil est en cours d’examen
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Le cours est enregistré. Les coordonnées et pièces privées ne seront
          jamais affichées sur votre profil public.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => navigate("/compte/education")}>
            {t("verticals.education.openWorkspace")}
          </Button>
          <Button variant="outline" to="/education">
            Voir les professeurs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge variant="primary">{t("verticals.education.brand")}</Badge>
          <h1
            ref={wizardHeadingRef}
            tabIndex={-1}
            className="mt-2 text-xl font-black text-text-main outline-none sm:text-2xl"
          >
            Créez votre activité de cours
          </h1>
          <p className="mt-1 text-xs text-text-secondary">
            Brouillon enregistré automatiquement · aucune donnée de paiement
            stockée
          </p>
        </div>
        <p className="text-xs font-bold text-text-muted">
          Étape {step + 1} sur {STEPS.length}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-sidebar-compact">
        <aside className="rounded-card border border-border-base bg-bg-surface p-3 shadow-xs">
          <ol className="grid grid-cols-4 gap-1 lg:grid-cols-1">
            {STEPS.map(({ label, icon: Icon }, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => index <= step && setStep(index)}
                  disabled={index > step}
                  className={`flex min-h-control-touch w-full items-center gap-2 rounded-control px-2.5 text-left text-xs font-bold ${
                    index === step
                      ? "bg-primary-light text-primary"
                      : index < step
                        ? "text-success"
                        : "text-text-disabled"
                  }`}
                >
                  {index < step ? (
                    <Check className="h-icon-sm w-icon-sm" />
                  ) : (
                    <Icon className="h-icon-sm w-icon-sm" />
                  )}
                  <span className="hidden lg:inline">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </aside>

        <section className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm sm:p-7">
          {step === ONBOARDING_STEP.profile && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Qui propose les cours ?
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Un professeur indépendant ou une équipe avec plusieurs membres
                et lieux.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "individual",
                    UserRound,
                    "Professeur indépendant",
                    "Un profil, vos cours et vos propres demandes.",
                  ],
                  [
                    "organization",
                    Building2,
                    "Organisme de cours",
                    "Une équipe, plusieurs lieux et une boîte de réception centralisée.",
                  ],
                ].map(([value, Icon, title, description]) => {
                  const ChoiceIcon = Icon as React.ComponentType<{
                    className?: string;
                  }>;
                  return (
                    <SelectableCard
                      key={String(value)}
                      selected={draft.accountKind === value}
                      onSelect={() =>
                        update(
                          "accountKind",
                          value as TutorOnboardingDraft["accountKind"],
                        )
                      }
                      className="rounded-card border border-border-base p-4"
                    >
                      <ChoiceIcon
                        className="h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                      <p className="mt-3 text-sm font-black text-text-main">
                        {String(title)}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                        {String(description)}
                      </p>
                    </SelectableCard>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField label="Nom public" required>
                  <Input
                    value={draft.displayName}
                    onChange={(event) =>
                      update("displayName", event.target.value)
                    }
                  />
                </FormField>
                {draft.accountKind === "organization" && (
                  <FormField label="Nom de l’organisme" required>
                    <Input
                      value={draft.organizationName}
                      onChange={(event) =>
                        update("organizationName", event.target.value)
                      }
                    />
                  </FormField>
                )}
              </div>
            </section>
          )}

          {step === ONBOARDING_STEP.expertise && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Matières et niveaux enseignés
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Les niveaux proposés dépendent des matières activées pour le
                marché {activeMarket.name}.
              </p>
              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-text-main">
                  Matières
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {catalog.subjects
                    .filter((subject) => subject.isActive)
                    .map((subject) => (
                      <Checkbox
                        key={subject.id}
                        label={subject.label}
                        checked={draft.subjectIds.includes(subject.id)}
                        onChange={() =>
                          update(
                            "subjectIds",
                            toggle(draft.subjectIds, subject.id),
                          )
                        }
                      />
                    ))}
                </div>
              </fieldset>
              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-text-main">
                  Niveaux
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {availableLevels.map((level) => (
                    <Checkbox
                      key={level.id}
                      label={level.label}
                      checked={draft.levelIds.includes(level.id)}
                      onChange={() =>
                        update("levelIds", toggle(draft.levelIds, level.id))
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {step === ONBOARDING_STEP.formats && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Où et comment enseignez-vous ?
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["online", Laptop, "En ligne"],
                  ["in_person", MapPin, "En présentiel"],
                  ["hybrid", Sparkles, "Hybride"],
                ].map(([value, Icon, label]) => {
                  const ChoiceIcon = Icon as React.ComponentType<{
                    className?: string;
                  }>;
                  return (
                    <SelectableCard
                      key={String(value)}
                      selected={draft.deliveryModes.includes(
                        value as DeliveryMode,
                      )}
                      onSelect={() =>
                        update(
                          "deliveryModes",
                          toggle(draft.deliveryModes, value as DeliveryMode),
                        )
                      }
                      className="rounded-card border border-border-base p-4 text-center"
                    >
                      <ChoiceIcon
                        className="mx-auto h-6 w-6 text-primary"
                        aria-hidden="true"
                      />
                      <p className="mt-2 text-xs font-black text-text-main">
                        {String(label)}
                      </p>
                    </SelectableCard>
                  );
                })}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FormField
                  label="Ville de référence"
                  required
                  hint="Seule une zone approximative sera publique."
                >
                  <Input
                    value={draft.city}
                    onChange={(event) => update("city", event.target.value)}
                  />
                </FormField>
                <FormField label="Rayon de déplacement (km)">
                  <Input
                    type="number"
                    min={COURSE_CONSTRAINTS.serviceRadiusKm.min}
                    max={COURSE_CONSTRAINTS.serviceRadiusKm.max}
                    value={draft.radiusKm}
                    onChange={(event) =>
                      update("radiusKm", Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
            </section>
          )}

          {step === ONBOARDING_STEP.presentation && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Présentez votre pédagogie
              </h2>
              <div className="mt-5 space-y-4">
                <FormField label="Titre du profil" required>
                  <Input
                    value={draft.headline}
                    onChange={(event) => update("headline", event.target.value)}
                  />
                </FormField>
                <FormField
                  label="À propos"
                  required
                  hint={`${draft.biography.length} caractères · minimum ${COURSE_CONSTRAINTS.tutorBiography.minLength}`}
                >
                  <Textarea
                    rows={5}
                    value={draft.biography}
                    onChange={(event) =>
                      update("biography", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Méthode d’enseignement" required>
                  <Textarea
                    rows={4}
                    value={draft.teachingApproach}
                    onChange={(event) =>
                      update("teachingApproach", event.target.value)
                    }
                  />
                </FormField>
                <FormField label="Années d’expérience">
                  <Input
                    type="number"
                    min={COURSE_CONSTRAINTS.tutorExperienceYears.min}
                    max={COURSE_CONSTRAINTS.tutorExperienceYears.max}
                    value={draft.experienceYears}
                    onChange={(event) =>
                      update("experienceYears", Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
            </section>
          )}

          {step === ONBOARDING_STEP.availability && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Tarif et disponibilités
              </h2>
              <div className="mt-5 max-w-sm">
                <FormField
                  label={`Tarif horaire (${formatCurrencySymbol(
                    catalog.config.currency,
                    locale,
                  )})`}
                  required
                  hint="Le montant public est affiché toutes taxes comprises lorsque cela s’applique."
                >
                  <Input
                    type="number"
                    min={
                      COURSE_CONSTRAINTS.hourlyPriceMinor.min /
                      COURSE_CONSTRAINTS.minorUnitsPerMajor
                    }
                    step={COURSE_CONSTRAINTS.priceMajorStep}
                    value={
                      draft.priceMinor / COURSE_CONSTRAINTS.minorUnitsPerMajor
                    }
                    onChange={(event) =>
                      update(
                        "priceMinor",
                        Math.round(
                          Number(event.target.value) *
                            COURSE_CONSTRAINTS.minorUnitsPerMajor,
                        ),
                      )
                    }
                  />
                </FormField>
              </div>
              <fieldset className="mt-5">
                <legend className="text-xs font-bold text-text-main">
                  Créneaux habituels
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {[
                    ["weekday_day", "En semaine · journée"],
                    ["weekday_evening", "En semaine · soirée"],
                    ["wednesday_afternoon", "Mercredi · après-midi"],
                    ["saturday_morning", "Samedi · matin"],
                    ["weekend", "Week-end"],
                  ].map(([value, label]) => (
                    <Checkbox
                      key={value}
                      label={label}
                      checked={draft.availability.includes(value)}
                      onChange={() =>
                        update(
                          "availability",
                          toggle(draft.availability, value),
                        )
                      }
                    />
                  ))}
                </div>
              </fieldset>
            </section>
          )}

          {step === ONBOARDING_STEP.plan && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Choisissez votre formule
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Les mises en avant restent secondaires dans le classement : la
                pertinence passe avant le paiement.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {catalog.plans
                  .filter(
                    (plan) =>
                      plan.isActive && plan.audience === draft.accountKind,
                  )
                  .map((plan) => (
                    <SelectableCard
                      key={plan.id}
                      selected={draft.planId === plan.id}
                      onSelect={() => update("planId", plan.id)}
                      className="relative rounded-card border border-border-base p-4"
                    >
                      {plan.isRecommended && (
                        <Badge
                          variant="primary"
                          className="absolute right-3 top-3"
                        >
                          Recommandé
                        </Badge>
                      )}
                      <h3 className="text-sm font-black text-text-main">
                        {plan.name}
                      </h3>
                      <p className="mt-1 text-xs text-text-secondary">
                        {plan.description}
                      </p>
                      <p className="mt-4 text-lg font-black text-text-main">
                        {plan.monthlyPrice
                          ? formatMoney(plan.monthlyPrice)
                          : "Gratuit"}
                        {plan.monthlyPrice && (
                          <span className="text-xs font-medium text-text-muted">
                            {" "}
                            / mois
                          </span>
                        )}
                      </p>
                      <ul className="mt-3 space-y-1.5 text-xs text-text-secondary">
                        <li>
                          • {plan.entitlements.maxActiveOffers} cours actifs
                        </li>
                        <li>
                          • {plan.entitlements.maxMonthlyLeads} demandes
                          qualifiées / mois
                        </li>
                        <li>
                          • {plan.entitlements.teamMembers} membre
                          {plan.entitlements.teamMembers > 1 ? "s" : ""}
                        </li>
                      </ul>
                    </SelectableCard>
                  ))}
              </div>
            </section>
          )}

          {step === ONBOARDING_STEP.verification && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Vérifications et publication
              </h2>
              <div className="mt-5 rounded-card border border-info-border bg-info-surface p-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-text-main">
                  <ShieldCheck className="h-icon-md w-icon-md text-info" />
                  Ce qui sera affiché
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  Shongre distingue clairement les déclarations du professeur,
                  les preuves privées téléversées et les éléments réellement
                  vérifiés. Aucun diplôme ne sera présenté comme vérifié avant
                  contrôle.
                </p>
              </div>
              <dl className="mt-5 divide-y divide-border-subtle rounded-card border border-border-base px-4 text-xs">
                {[
                  [
                    "E-mail",
                    currentUser?.isEmailVerified ? "Vérifié" : "À vérifier",
                  ],
                  [
                    "Téléphone",
                    currentUser?.isPhoneVerified ? "Vérifié" : "À vérifier",
                  ],
                  [
                    "Identité",
                    currentUser?.isIdentityVerified
                      ? "Vérifiée"
                      : "Facultatif à ce stade",
                  ],
                  [
                    "Diplômes et certifications",
                    "Déclarés — preuve privée possible",
                  ],
                  [
                    "Éligibilité services à la personne",
                    "Non vérifiée / conditionnelle",
                  ],
                ].map(([label, status]) => (
                  <div key={label} className="flex justify-between gap-4 py-3">
                    <dt className="font-bold text-text-main">{label}</dt>
                    <dd className="text-right text-text-secondary">{status}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 rounded-card border border-warning-border bg-warning-surface p-4 text-xs text-text-secondary">
                Les réservations, paiements, versements et forfaits récurrents
                sont désactivés en {activeMarket.name} tant que les obligations
                prestataire, fiscales et réglementaires ne sont pas validées.
              </div>
            </section>
          )}

          <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
            <Button
              variant="ghost"
              disabled={isSubmitting}
              onClick={goBack}
              leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
            >
              Retour
            </Button>
            {step < LAST_ONBOARDING_STEP ? (
              <Button
                disabled={!canContinue}
                onClick={() =>
                  setStep((value) => value + ONBOARDING_STEP_DELTA)
                }
                rightIcon={<ArrowRight className="h-icon-sm w-icon-sm" />}
              >
                Continuer
              </Button>
            ) : (
              <Button
                isLoading={isSubmitting}
                onClick={publish}
                leftIcon={<CheckCircle2 className="h-icon-sm w-icon-sm" />}
              >
                Envoyer pour examen
              </Button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
};
