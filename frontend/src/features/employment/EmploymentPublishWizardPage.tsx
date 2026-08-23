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
  JobDraft,
  ProhibitedLanguageFlag,
} from "@shongre/contracts/employment";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services } from "../../api/client/service-registry";
import { useAuth } from "../../app/providers/AuthProvider";
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
  Textarea,
} from "../../design-system";
import { usePageMeta } from "../../hooks/usePageMeta";
import { storageService } from "../../services/storage.service";
import { formatEmploymentMoney } from "./employment-format";

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

type DraftData = {
  employerId: string;
  employerName: string;
  employerDescription: string;
  positionsCount: string;
  internalReference: string;
  title: string;
  professionId: string;
  specializationId: string;
  industryId: string;
  responsibilities: string;
  requiredSkills: string;
  preferredSkills: string;
  contractTypeId: string;
  contractDuration: string;
  workingArrangementId: string;
  workingTimeId: string;
  weeklyHours: string;
  requiredExperienceId: string;
  educationLevelId: string;
  qualificationSummary: string;
  certifications: string;
  city: string;
  postalCode: string;
  additionalLocations: string;
  travelRequirement: string;
  accessibilityInformation: string;
  salaryMinimum: string;
  salaryMaximum: string;
  salaryFrequencyId: string;
  benefits: string;
  bonusDescription: string;
  trialPeriodInformation: string;
  desiredStartDate: string;
  applicationDeadline: string;
  recruitmentProcess: string;
  publishSalary: boolean;
  applicationMethod: "shongre" | "external" | "contact_recruiter";
  externalApplicationUrl: string;
  screeningQuestion: string;
  privacyNoticeAccepted: boolean;
  checkoutId: string;
};

const defaults: DraftData = {
  employerId: "",
  employerName: "",
  employerDescription: "",
  positionsCount: "1",
  internalReference: "",
  title: "",
  professionId: "",
  specializationId: "",
  industryId: "",
  responsibilities: "",
  requiredSkills: "",
  preferredSkills: "",
  contractTypeId: "",
  contractDuration: "",
  workingArrangementId: "",
  workingTimeId: "",
  weeklyHours: "",
  requiredExperienceId: "",
  educationLevelId: "",
  qualificationSummary: "",
  certifications: "",
  city: "",
  postalCode: "",
  additionalLocations: "",
  travelRequirement: "",
  accessibilityInformation: "",
  salaryMinimum: "",
  salaryMaximum: "",
  salaryFrequencyId: "",
  benefits: "",
  bonusDescription: "",
  trialPeriodInformation: "",
  desiredStartDate: "",
  applicationDeadline: "",
  recruitmentProcess: "",
  publishSalary: true,
  applicationMethod: "shongre",
  externalApplicationUrl: "",
  screeningQuestion: "",
  privacyNoticeAccepted: false,
  checkoutId: "",
};

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
  const { currentUser, can } = useAuth();
  const { activeMarket } = useMarketLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const accountId = currentUser?.id || "guest";
  const localKey = `shongre_employment_draft_v1:${accountId}`;
  const [draftId] = useState(
    () =>
      searchParams.get("draft") ||
      storageService.get(
        `${localKey}:id`,
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "employment-draft-demo",
      ),
  );
  const [catalog, setCatalog] = useState<EmploymentCatalog | null>(null);
  const [employers, setEmployers] = useState<EmployerSummary[]>([]);
  const [step, setStep] = useState(() =>
    storageService.get(`${localKey}:step`, 1),
  );
  const [data, setData] = useState<DraftData>(() =>
    storageService.get(localKey, defaults),
  );
  const [privateEmployer, setPrivateEmployer] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(
    "employment.employer.free",
  );
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [flags, setFlags] = useState<ProhibitedLanguageFlag[]>([]);
  const [duplicateIds, setDuplicateIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completeId, setCompleteId] = useState<string>();
  const hydrated = useRef(false);

  usePageMeta({
    title: "Publier une offre d’emploi",
    description:
      "Créez une offre claire, conforme et accessible sur Shongre Emploi.",
    canonicalPath: "/deposer/emploi",
    noIndex: true,
  });

  useEffect(() => {
    storageService.set(`${localKey}:id`, draftId);
    Promise.all([
      services.employment.getCatalog(activeMarket.code),
      services.employment.getDraft(draftId),
      can("employment.recruiter.manage.own")
        ? services.employment.listRecruiterEmployers()
        : Promise.resolve([]),
    ])
      .then(([nextCatalog, remote, availableEmployers]) => {
        setCatalog(nextCatalog);
        setEmployers(availableEmployers);
        if (remote) {
          setStep(remote.currentStep);
          setData((current) => ({
            ...current,
            ...hydrateDraftData(remote.data),
          }));
          setPrivateEmployer(remote.privateEmployer);
          setSelectedOfferId(
            remote.selectedOfferId || "employment.employer.free",
          );
          setSelectedAddOnIds(remote.selectedAddOnIds);
          setDuplicateIds(remote.duplicateCandidateIds);
        } else if (!availableEmployers.length) {
          setPrivateEmployer(true);
          setSelectedOfferId("employment.employer.free");
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
  }, [activeMarket.code, can, draftId, localKey, toast]);

  const labelFor = (id: string) =>
    catalog?.dictionaries.find((entry) => entry.id === id)?.label || id;
  const serializedData = useMemo(() => {
    const selectedEmployer = employers.find(
      (employer) => employer.id === data.employerId,
    );
    const employerId = privateEmployer
      ? `private-employer-${accountId}`
      : selectedEmployer?.id || "";
    const requiredSkills = splitValues(data.requiredSkills);
    const minor = (value: string) =>
      Math.round(Number(value.replace(",", ".") || 0) * 100);
    return {
      ...data,
      employerId,
      employer: privateEmployer
        ? {
            id: employerId,
            name: "Employeur particulier",
            slug: "employeur-particulier",
            employerTypeId: "employment.fr.employer_type.private",
            description: data.employerDescription || undefined,
            verificationLevel: "self_declared" as const,
            isPubliclyVerified: false,
          }
        : selectedEmployer,
      professionLabel: labelFor(data.professionId),
      industryLabel: labelFor(data.industryId),
      specializationId: data.specializationId || undefined,
      specializationLabel: data.specializationId
        ? labelFor(data.specializationId)
        : undefined,
      contractTypeLabel: labelFor(data.contractTypeId),
      workingArrangementLabel: labelFor(data.workingArrangementId),
      responsibilities: splitValues(data.responsibilities),
      requiredSkills,
      requiredSkillIds: requiredSkills
        .map(
          (skill) =>
            catalog?.dictionaries.find(
              (entry) =>
                entry.kind === "skill" &&
                entry.label.toLocaleLowerCase("fr") ===
                  skill.toLocaleLowerCase("fr"),
            )?.id,
        )
        .filter((id): id is string => Boolean(id)),
      preferredSkills: splitValues(data.preferredSkills),
      preferredSkillIds: splitValues(data.preferredSkills)
        .map(
          (skill) =>
            catalog?.dictionaries.find(
              (entry) =>
                entry.kind === "skill" &&
                entry.label.toLocaleLowerCase("fr") ===
                  skill.toLocaleLowerCase("fr"),
            )?.id,
        )
        .filter((id): id is string => Boolean(id)),
      city: data.city,
      locationLabel: `${data.city}${data.postalCode ? ` (${data.postalCode})` : ""}`,
      countryCode: activeMarket.countryCode,
      positionsCount: Math.max(1, Number(data.positionsCount || 1)),
      reference: data.internalReference || undefined,
      contractDuration: data.contractDuration || undefined,
      weeklyHours: data.weeklyHours
        ? Number(data.weeklyHours.replace(",", "."))
        : undefined,
      requiredExperienceId: data.requiredExperienceId || undefined,
      educationLevelId: data.educationLevelId || undefined,
      qualificationSummary: data.qualificationSummary || undefined,
      certifications: splitValues(data.certifications),
      additionalLocations: splitValues(data.additionalLocations).map(
        (location, index) => ({
          id: `additional-location-${index + 1}-${draftId}`,
          label: location,
          city: location,
          countryCode: activeMarket.countryCode,
          isPrimary: false,
          isPublic: true,
        }),
      ),
      travelRequirementId: data.travelRequirement || undefined,
      accessibilityInformation: data.accessibilityInformation || undefined,
      benefits: splitValues(data.benefits),
      trialPeriodInformation: data.trialPeriodInformation || undefined,
      desiredStartDate: data.desiredStartDate || undefined,
      applicationDeadline: data.applicationDeadline
        ? new Date(`${data.applicationDeadline}T23:59:59`).toISOString()
        : undefined,
      recruitmentProcess: splitValues(data.recruitmentProcess),
      workScheduleIds: [data.workingTimeId].filter(Boolean),
      contactPreferences: ["messaging"],
      salary:
        data.publishSalary && data.salaryFrequencyId
          ? {
              minimum: {
                amountMinor: minor(data.salaryMinimum),
                currency: catalog?.config.currency || activeMarket.currency,
              },
              maximum: data.salaryMaximum
                ? {
                    amountMinor: minor(data.salaryMaximum),
                    currency: catalog?.config.currency || activeMarket.currency,
                  }
                : undefined,
              frequencyId: data.salaryFrequencyId,
              presentationId: "gross",
              isPublic: true,
              bonusDescription: data.bonusDescription || undefined,
            }
          : undefined,
    };
  }, [
    accountId,
    activeMarket.countryCode,
    activeMarket.currency,
    catalog,
    data,
    draftId,
    employers,
    privateEmployer,
  ]);

  const screeningQuestions = useMemo<JobDraft["screeningQuestions"]>(
    () =>
      data.screeningQuestion.trim()
        ? [
            {
              id: `question-${draftId}`,
              questionTypeId:
                "employment.fr.screening_question_type.short_text",
              label: data.screeningQuestion.trim(),
              isRequired: false,
              options: [],
              disqualifyingAnswerIds: [],
            },
          ]
        : [],
    [data.screeningQuestion, draftId],
  );

  const buildDraft = (): JobDraft => ({
    id: draftId,
    ownerUserId: accountId,
    employerId: privateEmployer ? undefined : data.employerId,
    privateEmployer,
    marketCode: activeMarket.code,
    schemaVersion: catalog?.config.schemaVersion || 1,
    currentStep: step,
    completedSteps: Array.from(
      { length: Math.max(0, step - 1) },
      (_, index) => index + 1,
    ),
    data: serializedData,
    screeningQuestions,
    selectedOfferId,
    selectedAddOnIds,
    validationIssues: [],
    duplicateCandidateIds: duplicateIds,
    updatedAt: new Date().toISOString(),
  });

  useEffect(() => {
    if (!hydrated.current || !catalog) return;
    storageService.set(localKey, data);
    storageService.set(`${localKey}:step`, step);
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        await services.employment.saveDraft(buildDraft());
      } finally {
        setSaving(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
    // buildDraft is derived from the listed state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountId,
    catalog,
    data,
    draftId,
    duplicateIds,
    localKey,
    privateEmployer,
    screeningQuestions,
    selectedAddOnIds,
    selectedOfferId,
    serializedData,
    step,
  ]);

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
      currency: price?.currency || catalog?.config.currency || "EUR",
    };
  }, [catalog, selectedAddOnIds, selectedOfferId]);

  const canContinue = useMemo(() => {
    if (step === 1) return privateEmployer || Boolean(data.employerId);
    if (step === 2) return Boolean(data.professionId && data.industryId);
    if (step === 3)
      return Boolean(
        data.contractTypeId && data.workingArrangementId && data.workingTimeId,
      );
    if (step === 4)
      return (
        data.title.trim().length >= 5 &&
        data.responsibilities.trim().length >= 20
      );
    if (step === 6) return data.city.trim().length >= 2;
    if (step === 7)
      return (
        !data.publishSalary ||
        Boolean(data.salaryMinimum && data.salaryFrequencyId)
      );
    if (step === 8)
      return (
        data.applicationMethod !== "external" ||
        data.externalApplicationUrl.startsWith("https://")
      );
    if (step === 9) return data.privacyNoticeAccepted;
    if (step === 12)
      return selectedTotal.amountMinor === 0 || Boolean(data.checkoutId);
    return true;
  }, [data, privateEmployer, selectedTotal.amountMinor, step]);

  const goNext = async () => {
    if (!canContinue) return;
    if (step === 4) {
      setSaving(true);
      try {
        await services.employment.saveDraft(buildDraft());
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
    if (step === 12 && selectedTotal.amountMinor > 0 && !data.checkoutId) {
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
    setStep((current) => Math.min(STEPS.length, current + 1));
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await services.employment.saveDraft({
        ...buildDraft(),
        currentStep: 13,
        completedSteps: Array.from({ length: 12 }, (_, index) => index + 1),
      });
      const result = await services.employment.submitDraft(draftId);
      setFlags(result.complianceFlags);
      setCompleteId(result.jobId);
      storageService.remove(localKey);
      storageService.remove(`${localKey}:step`);
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

  if (!catalog)
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-6">
        <Skeleton className="h-control-md w-72" />
        <Skeleton className="h-[30rem] w-full" />
      </div>
    );
  if (completeId)
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <h1 className="mt-4 text-2xl font-black">Offre transmise</h1>
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
    <main className="min-h-screen bg-bg-page pb-6">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-primary">
              Shongre Emploi
            </p>
            <h1 className="text-2xl font-black text-text-main">
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

        <section className="mt-4 rounded-card border border-border-base bg-bg-surface p-5 shadow-card sm:p-7">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Qui recrute ?</h2>
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
                        setSelectedOfferId("employment.employer.free");
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
                min: 1,
              })}
            </div>
          )}
          {step === 2 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-black">
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
          {step === 3 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-black">
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
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Intitulé et missions</h2>
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
                  <p className="flex items-center gap-2 text-sm font-black">
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
          {step === 5 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-black">
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
          {step === 6 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <h2 className="sm:col-span-2 text-xl font-black">
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
                placeholder: "Ex. ponctuels en France",
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
          {step === 7 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Rémunération et conditions</h2>
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
          {step === 8 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Réception des candidatures</h2>
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
          {step === 9 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Question de présélection</h2>
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
          {step === 10 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Aperçu avant publication</h2>
              <div className="rounded-card border border-border-base p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge>{labelFor(data.contractTypeId)}</Badge>
                  <Badge>{labelFor(data.workingArrangementId)}</Badge>
                </div>
                <h3 className="mt-3 text-xl font-black">
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
                  <p className="mt-4 font-black">
                    {formatEmploymentMoney(
                      Math.round(
                        Number(data.salaryMinimum.replace(",", ".")) * 100,
                      ),
                      catalog.config.currency,
                    )}
                    {data.salaryMaximum
                      ? ` – ${formatEmploymentMoney(Math.round(Number(data.salaryMaximum.replace(",", ".")) * 100), catalog.config.currency)}`
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
          {step === 11 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Choisir la visibilité</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {catalog.offers
                  .filter((offer) =>
                    privateEmployer
                      ? offer.id === "employment.employer.free"
                      : [
                          "employment.employer.free",
                          "employment.visibility.pack",
                          "employment.employer.starter",
                        ].includes(offer.id),
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
                        <span className="ml-2 font-black">{offer.name}</span>
                        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                          {offer.description}
                        </p>
                        <p className="mt-3 text-sm font-black text-primary">
                          {price?.amountMinor
                            ? formatEmploymentMoney(
                                price.amountMinor,
                                price.currency,
                              )
                            : "Gratuit"}
                        </p>
                      </label>
                    );
                  })}
              </div>
              {!privateEmployer && (
                <fieldset>
                  <legend className="text-sm font-black">
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
                        label={`${addOn.name} · ${formatEmploymentMoney(addOn.price.amountMinor, addOn.price.currency)}`}
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
          {step === 12 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">Confirmation commerciale</h2>
              <div className="flex items-center justify-between gap-4 rounded-card border border-border-base p-5">
                <div>
                  <p className="font-black">
                    {
                      catalog.offers.find((item) => item.id === selectedOfferId)
                        ?.name
                    }
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {selectedAddOnIds.length} option(s) facultative(s)
                  </p>
                </div>
                <p className="text-xl font-black text-primary">
                  {selectedTotal.amountMinor
                    ? formatEmploymentMoney(
                        selectedTotal.amountMinor,
                        selectedTotal.currency,
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
          {step === 13 && (
            <div className="space-y-5">
              <h2 className="text-xl font-black">
                Envoyer l’offre en vérification
              </h2>
              <div className="rounded-card border border-success-border bg-success-surface p-5">
                <p className="font-black">Votre brouillon est complet</p>
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

        <footer className="sticky bottom-3 mt-4 flex items-center justify-between gap-3 rounded-card border border-border-base bg-bg-surface/95 p-3 shadow-card backdrop-blur sm:static sm:bg-transparent sm:p-0 sm:shadow-none">
          <Button
            variant="secondary"
            disabled={step === 1 || submitting}
            onClick={() => setStep((current) => current - 1)}
          >
            <ArrowLeft className="h-icon-sm w-icon-sm" />
            Précédent
          </Button>
          {step < STEPS.length ? (
            <Button disabled={!canContinue || submitting} onClick={goNext}>
              {step === 12 && selectedTotal.amountMinor > 0 && !data.checkoutId
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
    </main>
  );
};
