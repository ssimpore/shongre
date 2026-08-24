import React, { useEffect, useMemo, useState } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  SelectableCard,
  Skeleton,
  Textarea,
} from "../../design-system";
import { storageService } from "../../services/storage.service";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useTranslation } from "../../i18n/I18nProvider";

type OnboardingDraft = {
  accountKind: "individual" | "organization";
  displayName: string;
  organizationName: string;
  headline: string;
  subjectIds: string[];
  levelIds: string[];
  deliveryModes: DeliveryMode[];
  city: string;
  radiusKm: number;
  languages: string[];
  experienceYears: number;
  biography: string;
  teachingApproach: string;
  priceMinor: number;
  availability: string[];
  planId: string;
};

const DEFAULT_DRAFT: OnboardingDraft = {
  accountKind: "individual",
  displayName: "Sophie Martin",
  organizationName: "",
  headline: "Professeure de mathématiques — collège et lycée",
  subjectIds: ["subject_mathematics"],
  levelIds: ["middle_school", "high_school"],
  deliveryModes: ["online", "in_person"],
  city: "Lyon",
  radiusKm: 15,
  languages: ["fr"],
  experienceYears: 8,
  biography:
    "Professeure certifiée, j’accompagne les élèves pour retrouver confiance, consolider leurs bases et préparer leurs examens.",
  teachingApproach:
    "Je pars des acquis de l’élève, rends les objectifs visibles et alterne explications, exercices guidés et autonomie.",
  priceMinor: 3200,
  availability: ["weekday_evening", "wednesday_afternoon", "saturday_morning"],
  planId: "tutor_pro",
};

const STEPS = [
  { label: "Profil", icon: UserRound },
  { label: "Expertise", icon: GraduationCap },
  { label: "Formats", icon: Laptop },
  { label: "Présentation", icon: BookOpen },
  { label: "Tarif & créneaux", icon: Clock3 },
  { label: "Formule", icon: Sparkles },
  { label: "Vérification", icon: ShieldCheck },
] as const;

const toggle = <T,>(values: T[], value: T): T[] =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const CourseTutorOnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftKey = `shongre_courses_onboarding_v1:${currentUser?.id || "guest"}`;
  const [catalog, setCatalog] = useState<CourseCatalog | null>(null);
  const [step, setStep] = useState(() =>
    searchParams.get("step") === "availability" ? 4 : 0,
  );
  const [draft, setDraft] = useState<OnboardingDraft>(() =>
    storageService.get(draftKey, {
      ...DEFAULT_DRAFT,
      displayName: currentUser?.name || DEFAULT_DRAFT.displayName,
    }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  usePageMeta({
    title: t("verticals.education.onboardingTitle"),
    description:
      "Créez votre profil professeur et publiez votre premier cours.",
    canonicalPath: "/deposer/education",
    noIndex: true,
  });

  useEffect(() => {
    services.courses
      .getCatalog("FR")
      .then(setCatalog)
      .catch(() => {
        toast.error(t("verticals.education.catalogUnavailable"));
      });
  }, [t, toast]);

  useEffect(() => {
    // No identity document, payment data or guardian data is stored here.
    storageService.set(draftKey, draft);
  }, [draft, draftKey]);

  const availableLevels = useMemo(() => {
    if (!catalog) return [];
    const allowed = new Set(
      catalog.subjects
        .filter((subject) => draft.subjectIds.includes(subject.id))
        .flatMap((subject) => subject.levelIds),
    );
    return catalog.levels.filter((level) => allowed.has(level.id));
  }, [catalog, draft.subjectIds]);

  const update = <K extends keyof OnboardingDraft>(
    key: K,
    value: OnboardingDraft[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const canContinue = (() => {
    if (step === 0) {
      return (
        draft.displayName.trim().length >= 2 &&
        (draft.accountKind === "individual" ||
          draft.organizationName.trim().length >= 2)
      );
    }
    if (step === 1)
      return draft.subjectIds.length > 0 && draft.levelIds.length > 0;
    if (step === 2)
      return draft.deliveryModes.length > 0 && draft.city.trim().length >= 2;
    if (step === 3)
      return (
        draft.headline.length >= 10 &&
        draft.biography.length >= 60 &&
        draft.teachingApproach.length >= 30
      );
    if (step === 4)
      return draft.priceMinor >= 1000 && draft.availability.length > 0;
    return true;
  })();

  const publish = async () => {
    if (!catalog || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const profile = await services.courses.saveTutorProfile({
        organizationId:
          draft.accountKind === "organization" ? "org_lumiere" : undefined,
        profileType:
          draft.accountKind === "organization"
            ? "organization_member"
            : "individual",
        slug: slugify(draft.displayName),
        displayName: draft.displayName,
        avatarUrl:
          currentUser?.avatarUrl ||
          "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=85",
        headline: draft.headline,
        biography: draft.biography,
        teachingApproach: draft.teachingApproach,
        experienceYears: draft.experienceYears,
        subjectIds: draft.subjectIds,
        levelIds: draft.levelIds,
        languages: draft.languages,
        deliveryModes: draft.deliveryModes,
        serviceArea: draft.deliveryModes.includes("in_person")
          ? {
              marketCode: "FR",
              cityLabel: draft.city,
              radiusKm: draft.radiusKm,
              publicLocationLabel: `${draft.city} et alentours`,
            }
          : undefined,
        availabilityRules: [
          {
            id: "availability-onboarding",
            dayOfWeek: 3,
            startsAtLocal: "17:00",
            endsAtLocal: "20:00",
            timezone: "Europe/Paris",
            deliveryModes: draft.deliveryModes,
            effectiveFrom: now.slice(0, 10),
          },
        ],
        availabilityExceptions: [],
        responseTimeMinutes: 0,
        responseRatePercent: 0,
        reviewCount: 0,
        ratingIsStatisticallyMeaningful: false,
        mediaUrls: [],
        qualifications: [
          {
            id: "qualification-onboarding",
            type: "degree",
            label: "Formation et expérience déclarées",
            evidenceStatus: "self_declared",
            verificationStatus: "not_submitted",
            publicLabel: "Déclaré par le professeur — non vérifié",
            publicDetailsAllowed: true,
          },
        ],
        verifications: {
          email: currentUser?.isEmailVerified ? "verified" : "not_submitted",
          phone: currentUser?.isPhoneVerified ? "verified" : "not_submitted",
          identity: currentUser?.isIdentityVerified
            ? "verified"
            : "not_submitted",
          qualifications: "not_submitted",
          business:
            draft.accountKind === "organization" ? "pending" : "not_submitted",
          representative:
            draft.accountKind === "organization" ? "pending" : "not_submitted",
          payment: "not_submitted",
          payout: "not_submitted",
          personalServicesEligibility: "not_submitted",
        },
        taxEligibility: {
          status: "not_submitted",
          publicWording: catalog.config.taxEligibilityWording,
        },
        planId: draft.planId,
        moderationStatus: "pending_review",
        profileCompletionPercent: 82,
        isFeatured: false,
      });

      await services.courses.createCourseOffer({
        tutorProfileId: profile.id,
        organizationId: profile.organizationId,
        slug: `${slugify(draft.subjectIds[0] || "cours")}-${profile.slug}`,
        title: draft.headline,
        description: `${draft.biography}\n\n${draft.teachingApproach}`,
        subjectId: draft.subjectIds[0] || "subject_mathematics",
        levelIds: draft.levelIds,
        goalIds: ["confidence", "exam_preparation"],
        languages: draft.languages,
        deliveryModes: draft.deliveryModes,
        serviceArea: profile.serviceArea,
        pricingOptions: [
          {
            id: "hourly-onboarding",
            type: "hourly",
            label: "Cours à l’heure",
            price: { amountMinor: draft.priceMinor, currency: "EUR" },
            durationMinutes: 60,
            isActive: true,
          },
        ],
        availabilitySummary: "Créneaux en semaine et le samedi",
        trialLessonAvailable: false,
        status: "pending_review",
        marketCodes: ["FR"],
        capacityStatus: "available",
      });
      storageService.remove(draftKey);
      setIsComplete(true);
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Publication impossible.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!catalog)
    return (
      <Skeleton className="mx-auto h-[38rem] w-full max-w-5xl rounded-card" />
    );

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
          <h1 className="mt-2 text-xl font-black text-text-main sm:text-2xl">
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

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
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

        <main className="rounded-card border border-border-base bg-bg-surface p-5 shadow-sm sm:p-7">
          {step === 0 && (
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
                          value as OnboardingDraft["accountKind"],
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

          {step === 1 && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Matières et niveaux enseignés
              </h2>
              <p className="mt-1 text-xs text-text-secondary">
                Les niveaux proposés dépendent des matières activées pour le
                marché France.
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

          {step === 2 && (
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
                    min={0}
                    max={250}
                    value={draft.radiusKm}
                    onChange={(event) =>
                      update("radiusKm", Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
            </section>
          )}

          {step === 3 && (
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
                  hint={`${draft.biography.length} caractères · minimum 60`}
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
                    min={0}
                    max={70}
                    value={draft.experienceYears}
                    onChange={(event) =>
                      update("experienceYears", Number(event.target.value))
                    }
                  />
                </FormField>
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <h2 className="text-lg font-black text-text-main">
                Tarif et disponibilités
              </h2>
              <div className="mt-5 max-w-sm">
                <FormField
                  label="Tarif horaire (€)"
                  required
                  hint="Le montant public est affiché toutes taxes comprises lorsque cela s’applique."
                >
                  <Input
                    type="number"
                    min={10}
                    step={1}
                    value={draft.priceMinor / 100}
                    onChange={(event) =>
                      update(
                        "priceMinor",
                        Math.round(Number(event.target.value) * 100),
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

          {step === 5 && (
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
                          ? `${(plan.monthlyPrice.amountMinor / 100).toLocaleString("fr-FR")} €`
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

          {step === 6 && (
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
                sont désactivés en France tant que les obligations prestataire,
                fiscales et réglementaires ne sont pas validées.
              </div>
            </section>
          )}

          <footer className="mt-8 flex items-center justify-between gap-3 border-t border-border-subtle pt-5">
            <Button
              variant="ghost"
              disabled={step === 0 || isSubmitting}
              onClick={() => setStep((value) => value - 1)}
              leftIcon={<ArrowLeft className="h-icon-sm w-icon-sm" />}
            >
              Retour
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                disabled={!canContinue}
                onClick={() => setStep((value) => value + 1)}
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
        </main>
      </div>
    </div>
  );
};
