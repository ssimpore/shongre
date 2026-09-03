import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileQuestion,
  ListChecks,
  MapPin,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type {
  EmploymentCatalog,
  EmployerSummary,
  ProhibitedLanguageFlag,
} from "@shongre/contracts/employment";
import { EMPLOYMENT_PUBLICATION_CONSTRAINTS } from "@shongre/contracts/employment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import {
  EMPTY_EMPLOYMENT_PUBLICATION_DRAFT,
  type EmploymentPublicationDraftData,
} from "../../api/contracts/employment.contract";
import { useAuth } from "../../app/providers/AuthProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";
import { useToast } from "../../app/providers/ToastProvider";
import {
  Badge,
  Button,
  Checkbox,
  FormField,
  Input,
  OnboardingPreparationPage,
  Select,
  Skeleton,
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { formatEmploymentMoney } from "./employment-format";
import { motionDurationMs } from "@shongre/design-tokens";
import { useTranslation } from "../../i18n/I18nProvider";
import { scrollToTop } from "../../utilities/motion";

const STEPS = [
  ["Employeur", Building2],
  ["Métier", BriefcaseBusiness],
  ["Contrat", ClipboardCheck],
  ["Missions", ListChecks],
  ["Compétences", Sparkles],
  ["Lieu", MapPin],
  ["Rémunération", BadgeEuro],
  ["Candidature", FileQuestion],
  ["Questions", ShieldAlert],
  ["Aperçu", Eye],
  ["Visibilité", CheckCircle2],
  ["Paiement", CreditCard],
  ["Envoi", Send],
] as const;

const PUBLISH_STEP = {
  employer: 1,
  profession: 2,
  contract: 3,
  responsibilities: 4,
  skills: 5,
  location: 6,
  salary: 7,
  application: 8,
  screening: 9,
  preview: 10,
  visibility: 11,
  checkout: 12,
  submit: 13,
} as const;

type DraftData = EmploymentPublicationDraftData;
const defaults = EMPTY_EMPLOYMENT_PUBLICATION_DRAFT;

const optionsFor = (
  catalog: EmploymentCatalog,
  kind: EmploymentCatalog["dictionaries"][number]["kind"],
) => catalog.dictionaries.filter((entry) => entry.kind === kind);
const splitValues = (value: string) =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
const draftListText = (value: unknown) =>
  Array.isArray(value)
    ? value.map(String).join("\n")
    : typeof value === "string"
      ? value
      : "";

const hydrateDraftData = (value: Record<string, unknown>): DraftData => {
  const employer = (value.employer || {}) as Record<string, unknown>;
  const salary = (value.salary || {}) as Record<string, unknown>;
  const salaryMinimum = (salary.minimum || {}) as Record<string, unknown>;
  const salaryMaximum = (salary.maximum || {}) as Record<string, unknown>;
  const scalar = { ...defaults } as Record<string, unknown>;
  for (const [key, fallback] of Object.entries(defaults)) {
    const candidate = value[key];
    if (typeof fallback === "string" && typeof candidate === "string")
      scalar[key] = candidate;
    if (typeof fallback === "boolean" && typeof candidate === "boolean")
      scalar[key] = candidate;
  }
  const additionalLocations = Array.isArray(value.additionalLocations)
    ? value.additionalLocations
        .map((location) => {
          const item = location as Record<string, unknown>;
          return String(item.label || item.city || "");
        })
        .filter(Boolean)
        .join("\n")
    : draftListText(value.additionalLocations);
  return {
    ...(scalar as DraftData),
    employerId: String(value.employerId || employer.id || ""),
    employerName: String(employer.name || value.employerName || ""),
    employerDescription: String(
      employer.description || value.employerDescription || "",
    ),
    positionsCount: String(value.positionsCount || 1),
    internalReference: String(value.reference || value.internalReference || ""),
    responsibilities: draftListText(value.responsibilities),
    requiredSkills: draftListText(value.requiredSkills),
    preferredSkills: draftListText(value.preferredSkills),
    certifications: draftListText(value.certifications),
    additionalLocations,
    benefits: draftListText(value.benefits),
    recruitmentProcess: draftListText(value.recruitmentProcess),
    travelRequirement: String(
      value.travelRequirementId || value.travelRequirement || "",
    ),
    trialPeriodInformation: String(value.trialPeriodInformation || ""),
    salaryMinimum:
      salaryMinimum.amountMinor != null
        ? String(Number(salaryMinimum.amountMinor) / 100)
        : String(value.salaryMinimum || ""),
    salaryMaximum:
      salaryMaximum.amountMinor != null
        ? String(Number(salaryMaximum.amountMinor) / 100)
        : String(value.salaryMaximum || ""),
    salaryFrequencyId: String(
      salary.frequencyId || value.salaryFrequencyId || "",
    ),
    bonusDescription: String(
      salary.bonusDescription || value.bonusDescription || "",
    ),
    publishSalary: Boolean(value.salary || value.publishSalary),
    desiredStartDate: String(value.desiredStartDate || "").slice(0, 10),
    applicationDeadline: String(value.applicationDeadline || "").slice(0, 10),
  };
};

export const EmploymentPublishWizardPage: React.FC = () => {
  const { t } = useTranslation();
  const { currentUser, can } = useAuth();
  const { activeMarket, currentLocale, convertMoney } = useMarketLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const accountId = currentUser?.id || "guest";
  const [draftId, setDraftId] = useState("");
  const [catalog, setCatalog] = useState<EmploymentCatalog | null>(null);
  const [employers, setEmployers] = useState<EmployerSummary[]>([]);
  const [step, setStep] = useState<number>(
    EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
  );
  const [data, setData] = useState<DraftData>(defaults);
  const [privateEmployer, setPrivateEmployer] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [flags, setFlags] = useState<ProhibitedLanguageFlag[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [isPreparationVisible, setIsPreparationVisible] = useState(true);
  const [hasEnteredWizard, setHasEnteredWizard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completeId, setCompleteId] = useState<string>();
  const hydrated = useRef(false);
  const wizardHeadingRef = useRef<HTMLHeadingElement>(null);

  usePageMeta({
    title: "Publier une offre d’emploi",
    description:
      "Créez une offre claire, conforme et accessible sur Shongre Emploi.",
    canonicalPath: "/deposer/emploi",
    noIndex: true,
  });

  useEffect(() => {
    Promise.all([
      services.employment.getCatalog(activeMarket.code),
      services.employment.getOrCreateDraft(
        accountId,
        activeMarket.code,
        searchParams.get("draft") || undefined,
      ),
      can("employment.recruiter.manage.own")
        ? services.employment.listRecruiterEmployers()
        : Promise.resolve([]),
    ])
      .then(([nextCatalog, remote, availableEmployers]) => {
        const restoredData = hydrateDraftData(remote.data);
        setCatalog(nextCatalog);
        setEmployers(availableEmployers);
        setDraftId(remote.id);
        setStep(remote.currentStep);
        setData(restoredData);
        setHasSavedProgress(
          remote.currentStep > EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep ||
            Boolean(
              searchParams.get("draft") ||
              restoredData.title ||
              restoredData.professionId,
            ),
        );
        setPrivateEmployer(
          remote.privateEmployer || !availableEmployers.length,
        );
        setSelectedOfferId(
          remote.selectedOfferId ||
            nextCatalog.offers.find((offer) => offer.isActive)?.id ||
            "",
        );
        setSelectedAddOnIds(remote.selectedAddOnIds);
        setDuplicateIds(remote.duplicateCandidateIds);
        if (!availableEmployers.length) {
          setPrivateEmployer(true);
        } else {
          setData((current) => ({
            ...current,
            employerId: current.employerId || availableEmployers[0].id,
            employerName: current.employerName || availableEmployers[0].name,
            employerDescription:
              current.employerDescription ||
              availableEmployers[0].description ||
              "",
          }));
        }
        hydrated.current = true;
      })
      .catch(() =>
        toast.error("Le parcours Emploi est momentanément indisponible."),
      );
  }, [accountId, activeMarket.code, can, searchParams, toast]);

  const labelFor = (id: string) =>
    catalog?.dictionaries.find((entry) => entry.id === id)?.label || id;
  const defaultOfferId = useMemo(
    () =>
      catalog?.offers.find((offer) => offer.isActive && offer.kind === "free")
        ?.id ||
      catalog?.offers.find((offer) => offer.isActive)?.id ||
      "",
    [catalog],
  );
  const persistPublicationDraft = (
    currentStep = step,
    markAllPreviousStepsComplete = false,
  ) =>
    services.employment.savePublicationDraft({
      draftId,
      ownerUserId: accountId,
      marketCode: activeMarket.code,
      countryCode: activeMarket.countryCode,
      currentStep,
      privateEmployer,
      data,
      selectedOfferId,
      selectedAddOnIds,
      duplicateCandidateIds: duplicateIds,
      markAllPreviousStepsComplete,
    });

  useEffect(() => {
    if (!hasEnteredWizard || !hydrated.current || !catalog || !draftId) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await persistPublicationDraft();
      } finally {
        setSaving(false);
      }
    }, motionDurationMs.slow);
    return () => window.clearTimeout(timer);
    // persistPublicationDraft is derived from the listed state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountId,
    catalog,
    data,
    draftId,
    duplicateIds,
    hasEnteredWizard,
    privateEmployer,
    selectedAddOnIds,
    selectedOfferId,
    step,
  ]);

  useEffect(() => {
    if (!isPreparationVisible) wizardHeadingRef.current?.focus();
  }, [isPreparationVisible]);

  const update = <K extends keyof DraftData>(key: K, value: DraftData[K]) =>
    setData((current) => ({
      ...current,
      [key]: value,
      ...(key === "checkoutId" ? {} : { checkoutId: "" }),
    }));
  const selectedTotal = useMemo(() => {
    const price = catalog?.offers
      .find((item) => item.id === selectedOfferId)
      ?.prices.find((item) => item.isActive)?.amount;
    return {
      amountMinor:
        (price?.amountMinor || 0) +
        (catalog?.addOns || [])
          .filter((item) => selectedAddOnIds.includes(item.id))
          .reduce((sum, item) => sum + item.price.amountMinor, 0),
      currency:
        price?.currency || catalog?.config.currency || activeMarket.currency,
    };
  }, [catalog, selectedAddOnIds, selectedOfferId]);

  const canContinue = useMemo(() => {
    if (step === PUBLISH_STEP.employer)
      return privateEmployer || Boolean(data.employerId);
    if (step === PUBLISH_STEP.profession)
      return Boolean(data.professionId && data.industryId);
    if (step === PUBLISH_STEP.contract)
      return Boolean(
        data.contractTypeId && data.workingArrangementId && data.workingTimeId,
      );
    if (step === PUBLISH_STEP.responsibilities)
      return (
        data.title.trim().length >=
          EMPLOYMENT_PUBLICATION_CONSTRAINTS.titleMinLength &&
        data.responsibilities.trim().length >=
          EMPLOYMENT_PUBLICATION_CONSTRAINTS.responsibilitiesMinLength
      );
    if (step === PUBLISH_STEP.location)
      return (
        data.city.trim().length >=
        EMPLOYMENT_PUBLICATION_CONSTRAINTS.cityMinLength
      );
    if (step === PUBLISH_STEP.salary)
      return (
        !data.publishSalary ||
        Boolean(data.salaryMinimum && data.salaryFrequencyId)
      );
    if (step === PUBLISH_STEP.application)
      return (
        data.applicationMethod !== "external" ||
        data.externalApplicationUrl.startsWith("https://")
      );
    if (step === PUBLISH_STEP.screening) return data.privacyNoticeAccepted;
    if (step === PUBLISH_STEP.checkout)
      return selectedTotal.amountMinor === 0 || Boolean(data.checkoutId);
    return true;
  }, [data, privateEmployer, selectedTotal.amountMinor, step]);

  const goNext = async () => {
    if (!canContinue) return;
    if (step === PUBLISH_STEP.responsibilities) {
      setSaving(true);
      try {
        await persistPublicationDraft();
        setFlags(
          await services.employment.flagProhibitedLanguage(
            `${data.title} ${data.responsibilities}`,
          ),
        );
        setDuplicateIds(
          (await services.employment.checkDuplicateDraft(draftId))
            .duplicateCandidateIds,
        );
      } finally {
        setSaving(false);
      }
    }
    if (
      step === PUBLISH_STEP.checkout &&
      selectedTotal.amountMinor > 0 &&
      !data.checkoutId
    ) {
      setSubmitting(true);
      try {
        const checkout = await services.employment.createCheckout({
          marketCode: activeMarket.code,
          offerId: selectedOfferId,
          addOnIds: selectedAddOnIds,
          idempotencyKey: `employment-publish-${draftId}`,
        });
        if (checkout.status !== "paid") {
          if (checkout.providerCheckoutUrl) {
            window.location.assign(checkout.providerCheckoutUrl);
            return;
          }
          throw new Error(
            "Le paiement doit être confirmé avant la publication.",
          );
        }
        setData((current) => ({ ...current, checkoutId: checkout.id }));
      } catch (cause) {
        toast.error(
          cause instanceof Error ? cause.message : "Paiement impossible.",
        );
        return;
      } finally {
        setSubmitting(false);
      }
    }
    setStep((current) =>
      Math.min(EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount, current + 1),
    );
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await persistPublicationDraft(
        EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount,
        true,
      );
      const result = await services.employment.submitDraft(draftId);
      setFlags(result.complianceFlags);
      setCompleteId(result.jobId);
      toast.success(
        result.lifecycle === "published"
          ? "Offre publiée."
          : "Offre envoyée en vérification.",
      );
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Publication impossible.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startOnboarding = () => {
    setHasEnteredWizard(true);
    setIsPreparationVisible(false);
    scrollToTop();
  };

  const goBack = () => {
    if (step === PUBLISH_STEP.employer) {
      setIsPreparationVisible(true);
    } else {
      setStep((current) => current - 1);
    }
    scrollToTop();
  };

  if (isPreparationVisible) {
    return (
      <OnboardingPreparationPage
        eyebrow={t("onboarding.preparation.employment.eyebrow")}
        title={t("onboarding.preparation.employment.title")}
        description={t("onboarding.preparation.employment.description")}
        checklistTitle={t("onboarding.preparation.employment.checklistTitle")}
        items={[
          {
            title: t("onboarding.preparation.employment.roleTitle"),
            description: t("onboarding.preparation.employment.roleDescription"),
            icon: BriefcaseBusiness,
          },
          {
            title: t("onboarding.preparation.employment.salaryTitle"),
            description: t(
              "onboarding.preparation.employment.salaryDescription",
            ),
            icon: BadgeEuro,
          },
          {
            title: t("onboarding.preparation.employment.applicationTitle"),
            description: t(
              "onboarding.preparation.employment.applicationDescription",
            ),
            icon: ClipboardCheck,
          },
        ]}
        actionLabel={t(
          hasSavedProgress
            ? "onboarding.preparation.employment.resume"
            : "onboarding.preparation.employment.start",
        )}
        durationLabel={t("onboarding.preparation.employment.duration")}
        statusLabel={t(
          !catalog || !draftId
            ? "onboarding.preparation.loading"
            : hasSavedProgress
              ? "onboarding.preparation.resumeReady"
              : "onboarding.preparation.autosave",
        )}
        isReady={Boolean(catalog && draftId)}
        onStart={startOnboarding}
      />
    );
  }

  if (!catalog || !draftId)
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-control-md w-72" />
        <Skeleton className="h-120 w-full" />
      </div>
    );
  if (completeId)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 text-2xl font-bold">Offre transmise</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Référence {completeId}. Suivez la vérification et les candidatures
          depuis l’espace recruteur.
        </p>
        <Button
          className="mt-6"
          onClick={() => navigate("/compte/emploi/recruteur")}
        >
          Ouvrir l’espace recruteur
        </Button>
      </div>
    );

  const field = (
    label: string,
    key: keyof DraftData,
    props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> = {},
  ) => (
    <FormField label={label}>
      <Input
        {...props}
        value={String(data[key])}
        onChange={(event) => update(key, event.target.value as never)}
      />
    </FormField>
  );
  const selectField = (
    label: string,
    key: keyof DraftData,
    kind: EmploymentCatalog["dictionaries"][number]["kind"],
  ) => (
    <FormField label={label}>
      <Select
        aria-label={label}
        value={String(data[key])}
        onChange={(event) => update(key, event.target.value as never)}
      >
        <option value="">Sélectionner</option>
        {optionsFor(catalog, kind).map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.label}
          </option>
        ))}
      </Select>
    </FormField>
  );

  return (
    <div className="min-h-screen bg-bg-base pb-6">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">
              Shongre Emploi
            </p>
            <h1
              ref={wizardHeadingRef}
              tabIndex={-1}
              className="text-2xl font-bold text-text-main outline-none"
            >
              Publier une offre
            </h1>
          </div>
          <span className="text-xs text-text-muted" aria-live="polite">
            {saving ? "Enregistrement…" : "Brouillon enregistré"}
          </span>
        </div>
        <ol
          className="mt-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar"
          aria-label="Étapes de publication"
          tabIndex={0}
        >
          {STEPS.map(([label, Icon], index) => {
            const number = index + 1;
            return (
              <li
                key={label}
                className={`flex min-w-max items-center gap-2 rounded-pill border px-3 py-2 text-xs font-bold ${number === step ? "border-primary bg-primary-light text-primary" : number < step ? "border-success-border bg-success-surface text-success" : "border-border-base bg-bg-surface text-text-muted"}`}
                aria-current={number === step ? "step" : undefined}
              >
                {number < step ? (
                  <Check className="h-icon-xs w-icon-xs" />
                ) : (
                  <Icon className="h-icon-xs w-icon-xs" />
                )}
                {label}
              </li>
            );
          })}
        </ol>

        <section className="mt-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-sm sm:p-7">
          {step === PUBLISH_STEP.employer && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Qui recrute ?</h2>
              {(
                [
                  [false, "Une entreprise ou organisation"],
                  [true, "Un particulier employeur"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={String(value)}
                  className={`block cursor-pointer rounded-card border p-4 ${privateEmployer === value ? "border-primary bg-primary-light" : "border-border-base"}`}
                >
                  <input
                    type="radio"
                    disabled={!value && employers.length === 0}
                    checked={privateEmployer === value}
                    onChange={() => {
                      setPrivateEmployer(value);
                      if (value) {
                        setSelectedOfferId(defaultOfferId);
                        setSelectedAddOnIds([]);
                      }
                    }}
                  />
                  <span className="ml-2 font-bold">{label}</span>
                  {value && (
                    <span className="mt-1 block pl-7 text-xs text-text-secondary">
                      Publication standard gratuite, identité privée par défaut.
                    </span>
                  )}
                </label>
              ))}
              {!privateEmployer && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="Employeur autorisé">
                    <Select
                      aria-label="Employeur autorisé"
                      value={data.employerId}
                      onChange={(event) => {
                        const employer = employers.find(
                          (candidate) => candidate.id === event.target.value,
                        );
                        setData((current) => ({
                          ...current,
                          employerId: employer?.id || "",
                          employerName: employer?.name || "",
                          employerDescription: employer?.description || "",
                          checkoutId: "",
                        }));
                      }}
                    >
                      <option value="">Sélectionner</option>
                      {employers.map((employer) => (
                        <option key={employer.id} value={employer.id}>
                          {employer.name}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {field(
                    "Référence interne (facultatif)",
                    "internalReference",
                    { placeholder: "EMP-2026-014" },
                  )}
                  <FormField
                    className="sm:col-span-2"
                    label="Présentation de l’employeur"
                  >
                    <Textarea
                      rows={3}
                      value={data.employerDescription}
                      onChange={(event) =>
                        update("employerDescription", event.target.value)
                      }
                    />
                  </FormField>
                </div>
              )}
              {!employers.length && (
                <p className="rounded-control border border-border-base bg-bg-subtle p-3 text-xs text-text-secondary">
                  Aucun employeur professionnel n’est associé à ce profil. La
                  publication gratuite en tant que particulier employeur reste
                  disponible lorsque le marché l’autorise.
                </p>
              )}
              {field("Nombre de postes", "positionsCount", {
                type: "number",
                min: EMPLOYMENT_PUBLICATION_CONSTRAINTS.positionsCountMin,
              })}
            </div>
          )}
          {step === PUBLISH_STEP.profession && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-bold">
                Métier et secteur
              </h2>
              {selectField("Métier", "professionId", "profession")}
              {selectField(
                "Spécialisation (facultatif)",
                "specializationId",
                "specialization",
              )}
              {selectField("Secteur", "industryId", "sector")}
            </div>
          )}
          {step === PUBLISH_STEP.contract && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-bold">
                Contrat et organisation
              </h2>
              {selectField(
                "Type de contrat",
                "contractTypeId",
                "contract_type",
              )}
              {field("Durée du contrat (si applicable)", "contractDuration", {
                placeholder: "Ex. 6 mois",
              })}
              {selectField(
                "Organisation du travail",
                "workingArrangementId",
                "working_arrangement",
              )}
              {selectField(
                "Temps et horaires",
                "workingTimeId",
                "work_schedule",
              )}
              {field("Heures hebdomadaires", "weeklyHours", {
                inputMode: "decimal",
                placeholder: "35",
              })}
            </div>
          )}
          {step === PUBLISH_STEP.responsibilities && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Intitulé et missions</h2>
              {field("Intitulé du poste", "title", {
                placeholder: "Ex. Développeur·se front-end React",
              })}
              <FormField
                label="Missions principales"
                hint="Une mission par ligne rend l’offre plus lisible."
              >
                <Textarea
                  rows={7}
                  value={data.responsibilities}
                  onChange={(event) =>
                    update("responsibilities", event.target.value)
                  }
                />
              </FormField>
              {flags.length > 0 && (
                <div className="rounded-control border border-warning-border bg-warning-surface p-4">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <ShieldAlert className="h-icon-sm w-icon-sm text-warning" />
                    Formulation à vérifier
                  </p>
                  {flags.map((flag) => (
                    <p
                      key={flag.id}
                      className="mt-2 text-xs text-text-secondary"
                    >
                      « {flag.excerpt} » — {flag.neutralSuggestion}
                    </p>
                  ))}
                </div>
              )}
              {duplicateIds.length > 0 && (
                <p className="rounded-control border border-warning-border bg-warning-surface p-3 text-xs">
                  Une offre proche existe déjà. Vérifiez-la avant de créer un
                  doublon.
                </p>
              )}
            </div>
          )}
          {step === PUBLISH_STEP.skills && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-bold">
                Compétences et qualifications
              </h2>
              {field("Compétences requises", "requiredSkills", {
                placeholder: "Ex. TypeScript, React, accessibilité",
              })}
              {field("Compétences appréciées", "preferredSkills", {
                placeholder: "Ex. tests E2E, design system",
              })}
              {selectField(
                "Expérience attendue",
                "requiredExperienceId",
                "seniority",
              )}
              {selectField(
                "Niveau de formation",
                "educationLevelId",
                "education_level",
              )}
              {field("Certifications", "certifications", {
                placeholder: "Une certification par virgule",
              })}
              <FormField label="Qualifications complémentaires">
                <Textarea
                  rows={3}
                  value={data.qualificationSummary}
                  onChange={(event) =>
                    update("qualificationSummary", event.target.value)
                  }
                />
              </FormField>
              <p className="sm:col-span-2 text-xs text-text-muted">
                Renseignez uniquement des critères professionnellement
                pertinents. Les caractéristiques protégées ne sont pas
                collectées.
              </p>
            </div>
          )}
          {step === PUBLISH_STEP.location && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-bold">
                Lieu principal
              </h2>
              {field("Ville", "city", { placeholder: "Lyon" })}
              {field("Code postal", "postalCode", {
                inputMode: "numeric",
                placeholder: "69002",
              })}
              {field("Autres lieux", "additionalLocations", {
                placeholder: "Villeurbanne, Grenoble",
              })}
              {field("Déplacements", "travelRequirement", {
                placeholder: `Ex. ponctuels en ${activeMarket.name}`,
              })}
              <FormField
                className="sm:col-span-2"
                label="Accessibilité du lieu (facultatif)"
              >
                <Textarea
                  rows={3}
                  value={data.accessibilityInformation}
                  onChange={(event) =>
                    update("accessibilityInformation", event.target.value)
                  }
                />
              </FormField>
              <p className="sm:col-span-2 text-xs text-text-muted">
                L’adresse précise reste privée. Seule la zone utile à la
                recherche est publiée.
              </p>
            </div>
          )}
          {step === PUBLISH_STEP.salary && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Rémunération et conditions</h2>
              <Checkbox
                checked={data.publishSalary}
                onChange={(event) =>
                  update("publishSalary", event.target.checked)
                }
                label="Afficher une fourchette de rémunération"
              />
              {data.publishSalary && (
                <div className="grid gap-5 sm:grid-cols-3">
                  {field("Minimum brut", "salaryMinimum", {
                    inputMode: "decimal",
                  })}
                  {field("Maximum brut", "salaryMaximum", {
                    inputMode: "decimal",
                  })}
                  {selectField(
                    "Période",
                    "salaryFrequencyId",
                    "salary_frequency",
                  )}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                {field("Avantages", "benefits", {
                  placeholder: "Télétravail, titres-restaurant",
                })}
                {field("Primes ou commissions", "bonusDescription", {
                  placeholder: "Facultatif",
                })}
                {field("Période d’essai", "trialPeriodInformation", {
                  placeholder: "Selon le cadre applicable",
                })}
                {field("Date de début souhaitée", "desiredStartDate", {
                  type: "date",
                })}
                {field("Date limite de candidature", "applicationDeadline", {
                  type: "date",
                })}
                <FormField label="Étapes du recrutement">
                  <Textarea
                    rows={3}
                    value={data.recruitmentProcess}
                    onChange={(event) =>
                      update("recruitmentProcess", event.target.value)
                    }
                    placeholder="Une étape par ligne"
                  />
                </FormField>
              </div>
              <p className="text-xs text-text-muted">
                Les montants sont enregistrés en unités monétaires mineures et
                formatés selon le marché.
              </p>
            </div>
          )}
          {step === PUBLISH_STEP.application && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Réception des candidatures</h2>
              {(["shongre", "external", "contact_recruiter"] as const).map(
                (method) => (
                  <label
                    key={method}
                    className={`block cursor-pointer rounded-control border p-4 ${data.applicationMethod === method ? "border-primary bg-primary-light" : "border-border-base"}`}
                  >
                    <input
                      type="radio"
                      checked={data.applicationMethod === method}
                      onChange={() => update("applicationMethod", method)}
                    />
                    <span className="ml-2 text-sm font-bold">
                      {method === "shongre"
                        ? "Candidature directe sur Shongre"
                        : method === "external"
                          ? "Redirection vers un site employeur"
                          : "Premier contact avec le recruteur"}
                    </span>
                  </label>
                ),
              )}
              {data.applicationMethod === "external" &&
                field(
                  "URL sécurisée de candidature",
                  "externalApplicationUrl",
                  {
                    type: "url",
                    placeholder: "https://carriere.exemple.fr/poste",
                  },
                )}
            </div>
          )}
          {step === PUBLISH_STEP.screening && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Question de présélection</h2>
              {field("Question facultative", "screeningQuestion", {
                placeholder:
                  "Ex. Pouvez-vous travailler deux jours par semaine sur site ?",
              })}
              <div className="rounded-control border border-primary-border bg-primary-light p-4 text-sm text-text-secondary">
                Les CV, réponses et notes de recrutement sont privés. Les notes
                internes ne sont jamais visibles par le candidat.
              </div>
              <Checkbox
                checked={data.privacyNoticeAccepted}
                onChange={(event) =>
                  update("privacyNoticeAccepted", event.target.checked)
                }
                label="Je confirme disposer d’une base légitime pour traiter les candidatures et respecter les durées de conservation."
              />
            </div>
          )}
          {step === PUBLISH_STEP.preview && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Aperçu avant publication</h2>
              <div className="rounded-card border border-border-base p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge>{labelFor(data.contractTypeId)}</Badge>
                  <Badge>{labelFor(data.workingArrangementId)}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-bold">
                  {data.title || "Intitulé du poste"}
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  {privateEmployer
                    ? "Particulier employeur"
                    : data.employerName}{" "}
                  · {data.city}
                </p>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-text-secondary">
                  {splitValues(data.responsibilities).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {data.publishSalary && data.salaryMinimum && (
                  <p className="mt-4 font-bold">
                    {formatEmploymentMoney(
                      Math.round(
                        Number(data.salaryMinimum.replace(",", ".")) * 100,
                      ),
                      catalog.config.currency,
                      currentLocale,
                      convertMoney,
                    )}
                    {data.salaryMaximum
                      ? ` – ${formatEmploymentMoney(Math.round(Number(data.salaryMaximum.replace(",", ".")) * 100), catalog.config.currency, currentLocale, convertMoney)}`
                      : ""}{" "}
                    · {labelFor(data.salaryFrequencyId)}
                  </p>
                )}
              </div>
              <p className="text-xs text-text-muted">
                Le contrôle formule des recommandations et peut déclencher une
                revue humaine. Il ne produit pas de décision juridique
                automatique.
              </p>
            </div>
          )}
          {step === PUBLISH_STEP.visibility && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Choisir la visibilité</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {catalog.offers
                  .filter((offer) =>
                    privateEmployer
                      ? offer.id === defaultOfferId
                      : offer.isActive,
                  )
                  .map((offer) => {
                    const price = offer.prices.find(
                      (item) => item.isActive,
                    )?.amount;
                    return (
                      <label
                        key={offer.id}
                        className={`cursor-pointer rounded-card border p-4 ${selectedOfferId === offer.id ? "border-primary bg-primary-light" : "border-border-base"}`}
                      >
                        <input
                          type="radio"
                          name="offer"
                          checked={selectedOfferId === offer.id}
                          onChange={() => {
                            setSelectedOfferId(offer.id);
                            update("checkoutId", "");
                          }}
                        />
                        <span className="ml-2 font-bold">{offer.name}</span>
                        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                          {offer.description}
                        </p>
                        <p className="mt-3 text-sm font-bold text-primary">
                          {price?.amountMinor
                            ? formatEmploymentMoney(
                                price.amountMinor,
                                price.currency,
                                currentLocale,
                                convertMoney,
                              )
                            : "Gratuit"}
                        </p>
                      </label>
                    );
                  })}
              </div>
              {!privateEmployer && (
                <fieldset>
                  <legend className="text-sm font-bold">
                    Options facultatives, jamais présélectionnées
                  </legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {catalog.addOns.slice(0, 4).map((addOn) => (
                      <Checkbox
                        key={addOn.id}
                        checked={selectedAddOnIds.includes(addOn.id)}
                        onChange={(event) => {
                          setSelectedAddOnIds((current) =>
                            event.target.checked
                              ? [...current, addOn.id]
                              : current.filter((id) => id !== addOn.id),
                          );
                          update("checkoutId", "");
                        }}
                        label={`${addOn.name} · ${formatEmploymentMoney(addOn.price.amountMinor, addOn.price.currency, currentLocale, convertMoney)}`}
                      />
                    ))}
                  </div>
                </fieldset>
              )}
              <div className="rounded-control border border-border-base bg-bg-subtle p-4 text-xs text-text-secondary">
                La publication standard reste disponible sans abonnement. Les
                placements payants sont identifiés et ne classent jamais les
                candidatures.
              </div>
            </div>
          )}
          {step === PUBLISH_STEP.checkout && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">Confirmation commerciale</h2>
              <div className="flex items-center justify-between gap-4 rounded-card border border-border-base p-5">
                <div>
                  <p className="font-bold">
                    {
                      catalog.offers.find((item) => item.id === selectedOfferId)
                        ?.name
                    }
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {selectedAddOnIds.length} option(s) facultative(s)
                  </p>
                </div>
                <p className="text-xl font-bold text-primary">
                  {selectedTotal.amountMinor
                    ? formatEmploymentMoney(
                        selectedTotal.amountMinor,
                        selectedTotal.currency,
                        currentLocale,
                        convertMoney,
                      )
                    : "Gratuit"}
                </p>
              </div>
              {selectedTotal.amountMinor === 0 ? (
                <p className="rounded-control border border-success-border bg-success-surface p-4 text-sm">
                  Aucun moyen de paiement n’est demandé.
                </p>
              ) : data.checkoutId ? (
                <p className="rounded-control border border-success-border bg-success-surface p-4 text-sm text-success">
                  Paiement confirmé.
                </p>
              ) : (
                <p className="text-sm text-text-secondary">
                  Le paiement ne démarre qu’après confirmation. Le prix, la
                  devise, les taxes et la version tarifaire sont vérifiés côté
                  serveur.
                </p>
              )}
            </div>
          )}
          {step === PUBLISH_STEP.submit && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold">
                Envoyer l’offre en vérification
              </h2>
              <div className="rounded-card border border-success-border bg-success-surface p-5">
                <p className="font-bold">Votre brouillon est complet</p>
                <p className="mt-2 text-sm text-text-secondary">
                  L’offre sera soumise aux règles du marché. Les drapeaux de
                  formulation font l’objet d’une revue humaine.
                </p>
              </div>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>• Publication standard sans abonnement forcé</li>
                <li>• Aucun frais pour les candidats</li>
                <li>• Données privées et rétention configurable</li>
                <li>• Modération et transitions auditables</li>
              </ul>
            </div>
          )}
        </section>

        <footer className="sticky bottom-3 mt-4 flex items-center justify-between gap-3 rounded-card border border-border-base bg-bg-surface/95 p-3 shadow-sticky backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button variant="secondary" disabled={submitting} onClick={goBack}>
            <ArrowLeft className="h-icon-sm w-icon-sm" />
            Précédent
          </Button>
          {step < EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount ? (
            <Button disabled={!canContinue || submitting} onClick={goNext}>
              {step === PUBLISH_STEP.checkout &&
              selectedTotal.amountMinor > 0 &&
              !data.checkoutId
                ? "Confirmer et payer"
                : "Continuer"}
              <ArrowRight className="h-icon-sm w-icon-sm" />
            </Button>
          ) : (
            <Button disabled={submitting} onClick={submit}>
              {submitting ? "Traitement…" : "Envoyer pour publication"}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
};
