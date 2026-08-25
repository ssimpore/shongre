import { randomUUID } from "node:crypto";
import type {
  CandidateDataExport,
  CandidateProfile,
  EmploymentCatalog,
  EmploymentImport,
  EmploymentDataSubjectRequest,
  EmploymentInterview,
  EmploymentMarketConfig,
  EmploymentSearchQuery,
  JobDraft,
  JobAlert,
  JobPostingDetail,
} from "@shongre/contracts/employment";
import {
  EMPLOYMENT_PUBLICATION_CONSTRAINTS,
  candidateProfileSchema,
  interviewSchema,
  employmentJobReportSchema,
  employmentSearchQuerySchema,
  jobDraftSchema,
  jobPostingDetailSchema,
} from "@shongre/contracts/employment";
import type { VerticalCheckout } from "@shongre/contracts/vertical";
import { verticalCheckoutSchema } from "@shongre/contracts/vertical";
import { applyMonetizationToEmploymentCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import { CANONICAL_TAXONOMY_IDS } from "@shongre/contracts/taxonomy-catalog";
import {
  EmploymentRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  businessRulesService,
  BusinessRulesService,
} from "../business-rules/business-rules.service.js";
import {
  NotificationsService,
  notificationsService,
} from "../notifications/notifications.service.js";
import { requireMarketCode } from "../../shared/market/market-code.js";

const currentIso = () => new Date().toISOString();
const addDays = (iso: string, days: number) =>
  new Date(Date.parse(iso) + days * 86_400_000).toISOString();
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const publicEmployer = (job: JobPostingDetail) => ({
  ...job,
  employer: {
    ...job.employer,
    isPubliclyVerified:
      job.employer.isPubliclyVerified &&
      ["domain_verified", "manually_verified", "provider_verified"].includes(
        job.employer.verificationLevel,
      ),
  },
});

const getRequiredString = (data: Record<string, unknown>, key: string) => {
  const value = data[key];
  if (typeof value !== "string" || !value.trim())
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: `Le champ ${key} est obligatoire.`,
      details: { field: key },
    });
  return value.trim();
};

const readString = (data: Record<string, unknown>, key: string) =>
  typeof data[key] === "string" ? data[key].trim() : "";
const splitPublicationValues = (value: unknown) =>
  String(value || "")
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
const parseMoneyMinor = (value: unknown) => {
  const amount = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
};

export class EmploymentService {
  constructor(
    private readonly repo: EmploymentRepository = repositories.employment,
    private readonly commercialRules: BusinessRulesService = businessRulesService,
    private readonly notifications: NotificationsService = notificationsService,
  ) {}

  private async notify(
    userId: string,
    type: string,
    title: string,
    body: string,
    marketCode: string,
    linkUrl?: string,
  ) {
    try {
      await this.notifications.dispatchNotification(
        userId,
        type,
        title,
        body,
        linkUrl,
        undefined,
        requireMarketCode(marketCode),
      );
    } catch {
      // The domain mutation and its audit event remain authoritative. Delivery
      // retries are handled by the notification infrastructure, not by rolling
      // back an application or pipeline transition.
    }
  }

  private async resolveCatalog(marketCode: string, includeInactive = false) {
    const code = requireMarketCode(marketCode);
    const [catalog, commercial] = await Promise.all([
      this.repo.getCatalog(code, includeInactive),
      this.commercialRules.getCatalog(code),
    ]);
    return applyMonetizationToEmploymentCatalog(catalog, commercial);
  }

  getCatalog(marketCode: string, includeInactive = false) {
    return this.resolveCatalog(marketCode, includeInactive);
  }

  async search(input: unknown) {
    const query = employmentSearchQuerySchema.parse(input);
    const catalog = await this.resolveCatalog(query.marketCode);
    if (
      !catalog.activation.isActive ||
      !catalog.config.isEnabled ||
      !catalog.config.featureFlags.verticalEnabled
    ) {
      return {
        items: [],
        total: 0,
        organicResultCount: 0,
        recommendationFactors: [],
        pageInfo: { hasNextPage: false },
      };
    }
    const result = await this.repo.search(query);
    await this.repo.trackAnalyticsEvent({
      eventName: "search_performed",
      marketCode: query.marketCode,
      dimensions: {
        resultCount: result.total,
        keywordProvided: Boolean(query.keywords),
        professionCount: query.professionIds.length,
        locationProvided: Boolean(query.location),
      },
    });
    return result;
  }

  async getPublicJob(idOrSlug: string) {
    const job = await this.repo.getJob(idOrSlug);
    if (
      !job ||
      job.lifecycle !== "published" ||
      Date.parse(job.expiresAt) <= Date.now()
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Offre d’emploi introuvable.",
      });
    await this.repo.trackAnalyticsEvent({
      eventName: "job_viewed",
      marketCode: job.marketCode,
      jobId: job.id,
      employerId: job.employer.id,
    });
    return publicEmployer(job);
  }

  async getSimilarJobs(idOrSlug: string) {
    const job = await this.getPublicJob(idOrSlug);
    const result = await this.repo.search(
      employmentSearchQuerySchema.parse({
        marketCode: job.marketCode,
        professionIds: [job.professionId],
        location:
          job.primaryLocation.city === "France"
            ? undefined
            : job.primaryLocation.city,
        sort: "relevance",
        limit: 5,
      }),
    );
    return result.items.filter((item) => item.id !== job.id).slice(0, 3);
  }

  async getOrCreateOwnDraft(
    userId: string,
    marketCode: string,
    preferredDraftId?: string,
  ) {
    const normalizedMarket = requireMarketCode(marketCode);
    if (preferredDraftId) {
      const preferred = await this.repo.getDraft(preferredDraftId);
      if (preferred) {
        if (preferred.ownerUserId !== userId)
          throw new AppError({
            code: "NOT_FOUND",
            message: "Brouillon Emploi introuvable.",
          });
        return preferred;
      }
    }
    const existing = await this.repo.getLatestDraft(userId, normalizedMarket);
    if (existing) return existing;
    const catalog = await this.resolveCatalog(normalizedMarket);
    const defaultOffer =
      catalog.offers.find((offer) => offer.isActive && offer.kind === "free") ||
      catalog.offers.find((offer) => offer.isActive);
    return this.saveOwnDraft(userId, preferredDraftId || randomUUID(), {
      privateEmployer: false,
      marketCode: normalizedMarket,
      schemaVersion: catalog.config.schemaVersion,
      currentStep: EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
      completedSteps: [],
      data: {},
      screeningQuestions: [],
      selectedOfferId: defaultOffer?.id,
      selectedAddOnIds: [],
      validationIssues: [],
      duplicateCandidateIds: [],
    });
  }

  async getOwnDraft(userId: string, draftId: string) {
    const draft = await this.repo.getDraft(draftId);
    if (!draft || draft.ownerUserId !== userId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Brouillon Emploi introuvable.",
      });
    return draft;
  }

  async saveOwnDraft(userId: string, draftId: string, input: unknown) {
    const existing = await this.repo.getDraft(draftId);
    if (existing && existing.ownerUserId !== userId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Brouillon Emploi introuvable.",
      });
    const body = (input || {}) as Partial<JobDraft>;
    const data = { ...(existing?.data || {}), ...(body.data || {}) };
    for (const key of [
      "candidateEmail",
      "candidatePhone",
      "cvUrl",
      "paymentSecret",
      "internalRiskScore",
      "protectedCharacteristics",
    ])
      delete data[key];
    const draft = jobDraftSchema.parse({
      id: draftId,
      ownerUserId: userId,
      employerId: body.employerId || existing?.employerId,
      branchId: body.branchId || existing?.branchId,
      privateEmployer:
        body.privateEmployer ?? existing?.privateEmployer ?? false,
      marketCode: requireMarketCode(body.marketCode || existing?.marketCode),
      schemaVersion: body.schemaVersion || existing?.schemaVersion || 1,
      currentStep: body.currentStep || existing?.currentStep || 1,
      completedSteps: body.completedSteps || existing?.completedSteps || [],
      data,
      screeningQuestions:
        body.screeningQuestions || existing?.screeningQuestions || [],
      selectedOfferId:
        body.selectedOfferId ||
        existing?.selectedOfferId ||
        "employment.employer.free",
      selectedAddOnIds:
        body.selectedAddOnIds || existing?.selectedAddOnIds || [],
      validationIssues: body.validationIssues || [],
      duplicateCandidateIds:
        body.duplicateCandidateIds || existing?.duplicateCandidateIds || [],
      updatedAt: currentIso(),
    });
    const catalog = await this.resolveCatalog(draft.marketCode);
    if (draft.schemaVersion !== catalog.config.schemaVersion)
      throw new AppError({
        code: "CONFLICT",
        message:
          "Le formulaire Emploi a évolué. Rechargez le brouillon pour continuer.",
      });
    if (
      draft.privateEmployer &&
      !catalog.config.featureFlags.privateEmployersEnabled
    )
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "La publication par un employeur particulier n’est pas activée sur ce marché.",
      });
    const saved = await this.repo.saveDraft(draft);
    await this.repo.trackAnalyticsEvent({
      eventName: "job_draft_saved",
      marketCode: saved.marketCode,
      employerId: saved.employerId,
      dimensions: {
        currentStep: saved.currentStep,
        completedSteps: saved.completedSteps.length,
      },
    });
    return saved;
  }

  async saveOwnPublicationDraft(
    userId: string,
    draftId: string,
    input: unknown,
  ) {
    const body = (input || {}) as {
      marketCode?: string;
      countryCode?: string;
      currentStep?: number;
      privateEmployer?: boolean;
      data?: Record<string, unknown>;
      selectedOfferId?: string;
      selectedAddOnIds?: string[];
      duplicateCandidateIds?: string[];
      markAllPreviousStepsComplete?: boolean;
    };
    const marketCode = requireMarketCode(body.marketCode);
    const catalog = await this.resolveCatalog(marketCode);
    const raw = { ...(body.data || {}) };
    const privateEmployer = Boolean(body.privateEmployer);
    const existing = await this.repo.getDraft(draftId);
    if (existing && existing.ownerUserId !== userId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Brouillon Emploi introuvable.",
      });
    const employers = privateEmployer
      ? []
      : await this.repo.listRecruiterEmployers(userId);
    const selectedEmployer = employers.find(
      (employer) => employer.id === readString(raw, "employerId"),
    );
    if (!privateEmployer && !selectedEmployer)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Sélectionnez un employeur auquel votre compte est rattaché.",
      });
    const existingEmployer =
      existing?.data?.employer && typeof existing.data.employer === "object"
        ? (existing.data.employer as Record<string, unknown>)
        : undefined;
    const employer = privateEmployer
      ? {
          id: String(existingEmployer?.id || randomUUID()),
          name: "Employeur particulier",
          slug: "employeur-particulier",
          employerTypeId: "employment.fr.employer_type.private",
          description: readString(raw, "employerDescription") || undefined,
          verificationLevel: "self_declared" as const,
          isPubliclyVerified: false,
        }
      : selectedEmployer;
    const labelFor = (id: string) =>
      catalog.dictionaries.find((entry) => entry.id === id)?.label || id;
    const skillIdFor = (label: string) =>
      catalog.dictionaries.find(
        (entry) =>
          entry.kind === "skill" &&
          entry.label.toLocaleLowerCase("fr") === label.toLocaleLowerCase("fr"),
      )?.id;
    const requiredSkills = splitPublicationValues(raw.requiredSkills);
    const preferredSkills = splitPublicationValues(raw.preferredSkills);
    const currentStep = Math.min(
      EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount,
      Math.max(
        EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
        Number(
          body.currentStep || EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
        ),
      ),
    );
    const completionTarget = body.markAllPreviousStepsComplete
      ? EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount
      : currentStep;
    const completedSteps = Array.from(
      {
        length: Math.max(
          0,
          completionTarget - EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
        ),
      },
      (_, index) => index + EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
    );
    const countryCode = (body.countryCode || marketCode).toUpperCase();
    const city = readString(raw, "city");
    const postalCode = readString(raw, "postalCode");
    const salaryFrequencyId = readString(raw, "salaryFrequencyId");
    const publishSalary = raw.publishSalary === true;
    const data: Record<string, unknown> = {
      ...raw,
      employerId: employer?.id || "",
      employer,
      professionLabel: labelFor(readString(raw, "professionId")),
      industryLabel: labelFor(readString(raw, "industryId")),
      specializationId: readString(raw, "specializationId") || undefined,
      specializationLabel: readString(raw, "specializationId")
        ? labelFor(readString(raw, "specializationId"))
        : undefined,
      contractTypeLabel: labelFor(readString(raw, "contractTypeId")),
      workingArrangementLabel: labelFor(
        readString(raw, "workingArrangementId"),
      ),
      responsibilities: splitPublicationValues(raw.responsibilities),
      requiredSkills,
      requiredSkillIds: requiredSkills
        .map(skillIdFor)
        .filter((id): id is string => Boolean(id)),
      preferredSkills,
      preferredSkillIds: preferredSkills
        .map(skillIdFor)
        .filter((id): id is string => Boolean(id)),
      city,
      locationLabel: `${city}${postalCode ? ` (${postalCode})` : ""}`,
      countryCode,
      positionsCount: Math.max(1, Number(raw.positionsCount || 1)),
      reference: readString(raw, "internalReference") || undefined,
      contractDuration: readString(raw, "contractDuration") || undefined,
      weeklyHours: readString(raw, "weeklyHours")
        ? Number(readString(raw, "weeklyHours").replace(",", "."))
        : undefined,
      requiredExperienceId:
        readString(raw, "requiredExperienceId") || undefined,
      educationLevelId: readString(raw, "educationLevelId") || undefined,
      qualificationSummary:
        readString(raw, "qualificationSummary") || undefined,
      certifications: splitPublicationValues(raw.certifications),
      additionalLocations: splitPublicationValues(raw.additionalLocations).map(
        (location, index) => ({
          id: `additional-location-${index + 1}-${draftId}`,
          label: location,
          city: location,
          countryCode,
          isPrimary: false,
          isPublic: true,
        }),
      ),
      travelRequirementId: readString(raw, "travelRequirement") || undefined,
      accessibilityInformation:
        readString(raw, "accessibilityInformation") || undefined,
      benefits: splitPublicationValues(raw.benefits),
      trialPeriodInformation:
        readString(raw, "trialPeriodInformation") || undefined,
      desiredStartDate: readString(raw, "desiredStartDate") || undefined,
      applicationDeadline: readString(raw, "applicationDeadline")
        ? new Date(
            `${readString(raw, "applicationDeadline")}T23:59:59`,
          ).toISOString()
        : undefined,
      recruitmentProcess: splitPublicationValues(raw.recruitmentProcess),
      workScheduleIds: [readString(raw, "workingTimeId")].filter(Boolean),
      contactPreferences: ["messaging"],
      salary:
        publishSalary && salaryFrequencyId
          ? {
              minimum: {
                amountMinor: parseMoneyMinor(raw.salaryMinimum),
                currency: catalog.config.currency,
              },
              maximum: readString(raw, "salaryMaximum")
                ? {
                    amountMinor: parseMoneyMinor(raw.salaryMaximum),
                    currency: catalog.config.currency,
                  }
                : undefined,
              frequencyId: salaryFrequencyId,
              presentationId: "gross",
              isPublic: true,
              bonusDescription:
                readString(raw, "bonusDescription") || undefined,
            }
          : undefined,
    };
    const screeningLabel = readString(raw, "screeningQuestion");
    return this.saveOwnDraft(userId, draftId, {
      employerId: privateEmployer ? undefined : selectedEmployer?.id,
      privateEmployer,
      marketCode,
      schemaVersion: catalog.config.schemaVersion,
      currentStep,
      completedSteps,
      data,
      screeningQuestions: screeningLabel
        ? [
            {
              id: `question-${draftId}`,
              questionTypeId:
                "employment.fr.screening_question_type.short_text",
              label: screeningLabel,
              isRequired: false,
              options: [],
              disqualifyingAnswerIds: [],
            },
          ]
        : [],
      selectedOfferId: body.selectedOfferId,
      selectedAddOnIds: body.selectedAddOnIds || [],
      validationIssues: [],
      duplicateCandidateIds: body.duplicateCandidateIds || [],
    });
  }

  async checkDuplicateDraft(userId: string, draftId: string) {
    const draft = await this.getOwnDraft(userId, draftId);
    const data = draft.data;
    const employerId =
      draft.employerId || getRequiredString(data, "employerId");
    const matches = await this.repo.findDuplicateJob({
      employerId,
      title: getRequiredString(data, "title"),
      professionId: getRequiredString(data, "professionId"),
      city: getRequiredString(data, "city"),
    });
    const updated = await this.repo.saveDraft({
      ...draft,
      duplicateCandidateIds: matches.map((job) => job.id),
      updatedAt: currentIso(),
    });
    return { duplicateCandidateIds: updated.duplicateCandidateIds };
  }

  async flagProhibitedLanguage(input: unknown, marketCode: string) {
    const content = String(input || "");
    const normalized = content.toLocaleLowerCase("fr");
    const catalog = await this.resolveCatalog(requireMarketCode(marketCode));
    return catalog.config.prohibitedLanguageRules.flatMap((rule) =>
      rule.terms.flatMap((term, index) =>
        normalized.includes(term.toLocaleLowerCase("fr"))
          ? [
              {
                id: `${rule.id}-${index}`,
                field: "content",
                excerpt: term,
                policyRuleId: rule.id,
                explanation: rule.explanation,
                neutralSuggestion: rule.neutralSuggestion,
                requiresHumanReview: true as const,
                isLegalDecision: false as const,
              },
            ]
          : [],
      ),
    );
  }

  async submitOwnDraft(userId: string, draftId: string) {
    const draft = await this.getOwnDraft(userId, draftId);
    const catalog = await this.resolveCatalog(draft.marketCode);
    const offer = catalog.offers.find(
      (candidate) =>
        candidate.id === draft.selectedOfferId && candidate.isActive,
    );
    if (!offer)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "L’offre de publication sélectionnée n’est plus disponible.",
      });
    if (
      offer.kind !== "free" &&
      offer.prices.some((price) => price.amount.amountMinor > 0)
    ) {
      const entitlements =
        await this.commercialRules.getActiveEntitlements(userId);
      if (!entitlements.some((entry) => entry.productId === offer.id)) {
        throw new AppError({
          code: "PAYMENT_FAILED",
          message:
            "Finalisez le paiement facultatif avant de publier avec cette offre.",
        });
      }
    }
    if (!draft.completedSteps.includes(10))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Prévisualisez l’offre avant de l’envoyer.",
      });
    const data = draft.data;
    if (data.applicationMethod === "external") {
      let externalUrl: URL;
      try {
        externalUrl = new URL(
          getRequiredString(data, "externalApplicationUrl"),
        );
      } catch {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Le lien de candidature externe est invalide.",
        });
      }
      const blocked = catalog.config.riskRules.blockedExternalHostPatterns.some(
        (pattern) =>
          externalUrl.hostname === pattern ||
          externalUrl.hostname.endsWith(pattern),
      );
      if (externalUrl.protocol !== "https:" || blocked)
        throw new AppError({
          code: "VALIDATION_ERROR",
          message:
            "Utilisez un lien HTTPS public et vérifiable pour les candidatures externes.",
        });
    }
    const employer = data.employer;
    if (!employer || typeof employer !== "object")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Sélectionnez un employeur.",
      });
    let employerSummary = employer as JobPostingDetail["employer"];
    let employerId = employerSummary.id;
    let employerStatus = await this.repo.getEmployerStatus(employerId);
    if (draft.privateEmployer && !employerStatus) {
      employerSummary = await this.repo.createPrivateEmployer(userId, {
        ...employerSummary,
        id: randomUUID(),
        verificationLevel: "self_declared",
        isPubliclyVerified: false,
      });
      employerId = employerSummary.id;
      employerStatus = "active";
    }
    if (!draft.privateEmployer && !employerStatus)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Sélectionnez un employeur auquel votre compte est rattaché.",
      });
    if (
      ["suspended", "closed"].includes(String(employerStatus)) ||
      ["rejected", "expired"].includes(employerSummary.verificationLevel)
    )
      throw new AppError({
        code: "FORBIDDEN",
        message:
          "Cet employeur ne peut pas publier tant que la restriction du compte n’est pas levée.",
      });
    const duplicates = await this.repo.findDuplicateJob({
      employerId,
      title: getRequiredString(data, "title"),
      professionId: getRequiredString(data, "professionId"),
      city: getRequiredString(data, "city"),
    });
    if (duplicates.length)
      throw new AppError({
        code: "CONFLICT",
        message: "Une offre active très similaire existe déjà.",
        details: { duplicateJobIds: duplicates.map((job) => job.id) },
      });
    const quota = Number(offer.entitlements.maxActiveJobs || 1);
    if ((await this.repo.countActiveJobs({ employerId })) >= quota)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Le quota d’offres actives est atteint.",
      });
    const title = getRequiredString(data, "title");
    const now = currentIso();
    const id = randomUUID();
    const responsibilities = Array.isArray(data.responsibilities)
      ? data.responsibilities.map(String).filter(Boolean)
      : [];
    const location = {
      id: `location-${id}`,
      label: String(data.locationLabel || data.city || ""),
      city: getRequiredString(data, "city"),
      postalCode:
        typeof data.postalCode === "string" ? data.postalCode : undefined,
      countryCode: String(data.countryCode || draft.marketCode),
      isPrimary: true,
      isPublic: true,
    };
    const job = jobPostingDetailSchema.parse({
      id,
      slug: `${slugify(title)}-${id.slice(0, 8)}`,
      schemaVersion: draft.schemaVersion,
      title,
      employer: employerSummary,
      professionId: getRequiredString(data, "professionId"),
      professionLabel: getRequiredString(data, "professionLabel"),
      specializationId: data.specializationId,
      specializationLabel: data.specializationLabel,
      industryId: getRequiredString(data, "industryId"),
      industryLabel: getRequiredString(data, "industryLabel"),
      contractTypeId: getRequiredString(data, "contractTypeId"),
      contractTypeLabel: getRequiredString(data, "contractTypeLabel"),
      workingArrangementId: getRequiredString(data, "workingArrangementId"),
      workingArrangementLabel: getRequiredString(
        data,
        "workingArrangementLabel",
      ),
      workingTimeId: getRequiredString(data, "workingTimeId"),
      primaryLocation: location,
      salary: data.salary,
      publishedAt: now,
      expiresAt: addDays(now, catalog.config.defaultPublicationDurationDays),
      applicationDeadline: data.applicationDeadline,
      isUrgent: false,
      isFeatured: false,
      isSponsored: false,
      saved: false,
      lifecycle: "pending_review",
      marketCode: draft.marketCode,
      reference: data.reference,
      positionsCount: Number(data.positionsCount || 1),
      contractDuration: data.contractDuration,
      responsibilities,
      requiredSkillIds: data.requiredSkillIds || [],
      requiredSkills: data.requiredSkills || [],
      preferredSkillIds: data.preferredSkillIds || [],
      preferredSkills: data.preferredSkills || [],
      requiredExperienceId: data.requiredExperienceId,
      educationLevelId: data.educationLevelId,
      qualificationSummary: data.qualificationSummary,
      certifications: data.certifications || [],
      languages: data.languages || [],
      weeklyHours: data.weeklyHours,
      workScheduleIds: data.workScheduleIds || [],
      travelRequirementId: data.travelRequirementId,
      additionalLocations: data.additionalLocations || [],
      accessibilityInformation: data.accessibilityInformation,
      benefits: data.benefits || [],
      trialPeriodInformation: data.trialPeriodInformation,
      desiredStartDate: data.desiredStartDate,
      recruitmentProcess: data.recruitmentProcess || [],
      employerDescription: employerSummary.description,
      applicationMethod: data.applicationMethod || "shongre",
      externalApplicationUrl: data.externalApplicationUrl,
      contactPreferences: data.contactPreferences || ["messaging"],
      screeningQuestions: draft.screeningQuestions,
      safetyNotice:
        "Aucun paiement ne peut être demandé à un candidat pour postuler sur Shongre.",
      candidateFeeRequired: false,
    });
    const flags = await this.flagProhibitedLanguage(
      `${job.title}\n${job.responsibilities.join("\n")}`,
      job.marketCode,
    );
    const salaryMaximum =
      job.salary?.maximum?.amountMinor || job.salary?.minimum?.amountMinor;
    const salaryThreshold = job.salary?.frequencyId
      ? catalog.config.riskRules.salaryReviewMaximumMinorByFrequency[
          job.salary.frequencyId
        ]
      : undefined;
    if (salaryMaximum && salaryThreshold && salaryMaximum > salaryThreshold) {
      flags.push({
        id: "salary-anomaly-0",
        field: "salary",
        excerpt: String(salaryMaximum),
        policyRuleId: "salary-review-threshold",
        explanation:
          "La rémunération déclarée dépasse le seuil de revue configuré pour cette fréquence.",
        neutralSuggestion:
          "Vérifiez le montant, la fréquence et la devise avant publication.",
        requiresHumanReview: true,
        isLegalDecision: false,
      });
    }
    const saved = await this.repo.saveJob(job, userId);
    await this.repo.saveModerationFlags(saved.id, flags);
    await this.repo.trackAnalyticsEvent({
      eventName: "job_submitted",
      marketCode: saved.marketCode,
      jobId: saved.id,
      employerId: saved.employer.id,
      dimensions: {
        privateEmployer: draft.privateEmployer,
        complianceFlagCount: flags.length,
        freePublication: offer.kind === "free",
      },
    });
    return {
      jobId: saved.id,
      lifecycle: saved.lifecycle,
      complianceFlags: flags,
    };
  }

  async getOwnCandidateWorkspace(userId: string) {
    const workspace = await this.repo.getCandidateWorkspace(userId);
    if (!workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace candidat introuvable.",
      });
    return workspace;
  }

  async saveOwnCandidateProfile(userId: string, input: unknown) {
    const existing = await this.repo.getCandidateProfileForUser(userId);
    const body = (input || {}) as Partial<CandidateProfile>;
    if (body.userId && body.userId !== userId)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Ce profil appartient à un autre compte.",
      });
    const wantsRecruiterVisibility = body.visibility === "verified_recruiters";
    let recruiterSearchConsentId = existing?.recruiterSearchConsentId;
    if (wantsRecruiterVisibility && !recruiterSearchConsentId) {
      const consent = await this.repo.saveConsentRecord({
        id: randomUUID(),
        subjectUserId: userId,
        purposeId: "employment.recruiter_search",
        policyVersion: "employment-recruiter-search-v1",
        status: "granted",
        grantedAt: currentIso(),
        expiresAt: addDays(currentIso(), 365),
      });
      recruiterSearchConsentId = consent.id;
    } else if (!wantsRecruiterVisibility && recruiterSearchConsentId) {
      const current = await this.repo.getConsentRecord(
        recruiterSearchConsentId,
      );
      if (
        current &&
        current.subjectUserId === userId &&
        current.status === "granted"
      ) {
        await this.repo.saveConsentRecord({
          ...current,
          status: "withdrawn",
          withdrawnAt: currentIso(),
        });
      }
      recruiterSearchConsentId = undefined;
    }
    const profile = candidateProfileSchema.parse({
      ...existing,
      ...body,
      id: existing?.id || body.id || randomUUID(),
      userId,
      marketCode: requireMarketCode(body.marketCode || existing?.marketCode),
      visibility: body.visibility || existing?.visibility || "private",
      recruiterSearchConsentId,
      updatedAt: currentIso(),
    });
    return this.repo.saveCandidateProfile(profile);
  }

  async apply(userId: string, jobId: string, input: unknown) {
    const job = await this.repo.getJob(jobId);
    if (
      !job ||
      job.lifecycle !== "published" ||
      Date.parse(job.expiresAt) <= Date.now()
    )
      throw new AppError({
        code: "CONFLICT",
        message: "Cette offre n’accepte plus de candidatures.",
      });
    if (job.applicationMethod !== "shongre")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette offre utilise un autre mode de candidature.",
      });
    const workspace = await this.repo.getCandidateWorkspace(userId);
    if (!workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Créez votre profil candidat avant de postuler.",
      });
    const body = (input || {}) as {
      cvId?: string;
      coverMessage?: string;
      screeningAnswers?: Array<{ questionId: string; answer: unknown }>;
      privacyConsent?: boolean;
      privacyPolicyVersion?: string;
    };
    if (!body.privacyConsent || !body.privacyPolicyVersion)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Votre accord de confidentialité est requis pour envoyer la candidature.",
      });
    const cv = workspace.cvs.find(
      (item) => item.id === body.cvId && item.malwareScanStatus === "clean",
    );
    if (!cv)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Sélectionnez un CV valide et analysé.",
      });
    const answers = body.screeningAnswers || [];
    const knownQuestionIds = new Set(
      job.screeningQuestions.map((question) => question.id),
    );
    if (answers.some((answer) => !knownQuestionIds.has(answer.questionId)))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une réponse correspond à une question inconnue.",
      });
    const unansweredRequired = job.screeningQuestions.filter((question) => {
      if (!question.isRequired) return false;
      const answer = answers.find(
        (candidate) => candidate.questionId === question.id,
      )?.answer;
      return (
        answer === undefined || answer === null || String(answer).trim() === ""
      );
    });
    if (unansweredRequired.length)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Répondez aux questions obligatoires avant d’envoyer votre candidature.",
        details: {
          questionIds: unansweredRequired.map((question) => question.id),
        },
      });
    const duplicate = await this.repo.findActiveApplication(
      job.id,
      workspace.profile.id,
    );
    if (duplicate)
      throw new AppError({
        code: "CONFLICT",
        message: "Vous avez déjà une candidature active pour cette offre.",
        details: { applicationId: duplicate.id },
      });
    const catalog = await this.resolveCatalog(job.marketCode);
    const received = catalog.defaultPipelineStages.find(
      (stage) => stage.systemState === "received",
    )!;
    const now = currentIso();
    const consent = await this.repo.saveConsentRecord({
      id: randomUUID(),
      subjectUserId: userId,
      purposeId: "employment.application.processing",
      policyVersion: body.privacyPolicyVersion,
      status: "granted",
      grantedAt: now,
      expiresAt: addDays(now, catalog.config.applicationRetentionDays),
    });
    const application = await this.repo.saveApplication({
      id: randomUUID(),
      jobId: job.id,
      candidateId: workspace.profile.id,
      cvId: cv.id,
      coverMessage: body.coverMessage,
      screeningAnswers: answers,
      pipelineId: received.pipelineId,
      stageId: received.id,
      systemState: received.systemState,
      candidateVisibleStatus: received.candidateVisibleLabel,
      assignedRecruiterIds: [],
      privacyPolicyVersion: body.privacyPolicyVersion,
      consentRecordId: consent.id,
      submittedAt: now,
      updatedAt: now,
      retentionExpiresAt: addDays(now, catalog.config.applicationRetentionDays),
    });
    await this.repo.saveApplicationEvent({
      id: randomUUID(),
      applicationId: application.id,
      actorUserId: userId,
      eventType: "application_submitted",
      nextStageId: received.id,
      candidateNotified: true,
      occurredAt: now,
    });
    await this.repo.trackAnalyticsEvent({
      eventName: "application_submitted",
      marketCode: job.marketCode,
      jobId: job.id,
      employerId: job.employer.id,
      dimensions: { screeningAnswerCount: application.screeningAnswers.length },
    });
    await this.notify(
      userId,
      "employment_application_submitted",
      "Candidature envoyée",
      `Votre candidature pour « ${job.title} » a été transmise.`,
      job.marketCode,
      "/compte/emploi",
    );
    return application;
  }

  async withdrawOwnApplication(userId: string, applicationId: string) {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    const application = await this.repo.getApplication(applicationId);
    if (!application || application.candidateId !== workspace.profile.id)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Candidature introuvable.",
      });
    if (["hired", "withdrawn", "archived"].includes(application.systemState))
      throw new AppError({
        code: "CONFLICT",
        message: "Cette candidature ne peut plus être retirée.",
      });
    const now = currentIso();
    const saved = await this.repo.saveApplication(
      {
        ...application,
        systemState: "withdrawn",
        candidateVisibleStatus: "Candidature retirée",
        withdrawnAt: now,
        updatedAt: now,
      },
      application.stageId,
    );
    await this.repo.saveApplicationEvent({
      id: randomUUID(),
      applicationId,
      actorUserId: userId,
      eventType: "application_withdrawn",
      previousStageId: application.stageId,
      candidateNotified: false,
      occurredAt: now,
    });
    const job = await this.repo.getJob(application.jobId);
    if (!job)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Offre d’emploi introuvable.",
      });
    await this.notify(
      userId,
      "employment_application_withdrawn",
      "Candidature retirée",
      "Votre candidature a été retirée. Son historique reste disponible selon la durée de conservation applicable.",
      job.marketCode,
      "/compte/emploi",
    );
    return saved;
  }

  async toggleSavedJob(userId: string, jobId: string) {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    await this.getPublicJob(jobId);
    const saved = await this.repo.toggleSavedJob(workspace.profile.id, jobId);
    await this.repo.trackAnalyticsEvent({
      eventName: "job_saved",
      marketCode: workspace.profile.marketCode,
      jobId,
      dimensions: { saved },
    });
    return { saved };
  }

  async reportJob(userId: string, jobId: string, input: unknown) {
    await this.getPublicJob(jobId);
    const body = (input || {}) as Record<string, unknown>;
    return this.repo.saveJobReport(
      employmentJobReportSchema.parse({
        id: randomUUID(),
        jobId,
        reporterUserId: userId,
        reason: body.reason,
        details:
          typeof body.details === "string" && body.details.trim()
            ? body.details.trim()
            : undefined,
        status: "submitted",
        createdAt: currentIso(),
      }),
    );
  }

  async saveOwnJobAlert(userId: string, input: unknown) {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    const body = (input || {}) as {
      label?: string;
      query?: EmploymentSearchQuery;
      frequency?: JobAlert["frequency"];
    };
    const parsedQuery = employmentSearchQuerySchema.parse(
      body.query || { marketCode: "FR" },
    );
    const { cursor: _cursor, ...query } = parsedQuery;
    const frequency = body.frequency || "daily";
    if (!["instant", "daily", "weekly"].includes(frequency))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Fréquence d’alerte invalide.",
      });
    const alert = await this.repo.saveJobAlert({
      id: randomUUID(),
      candidateId: workspace.profile.id,
      label: getRequiredString(body as Record<string, unknown>, "label"),
      query,
      frequency,
      enabled: true,
      createdAt: currentIso(),
    });
    await this.repo.trackAnalyticsEvent({
      eventName: "alert_created",
      marketCode: alert.query.marketCode,
      dimensions: {
        frequency: alert.frequency,
        hasKeywords: Boolean(alert.query.keywords),
      },
    });
    return alert;
  }

  async deleteOwnJobAlert(userId: string, alertId: string) {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    if (!(await this.repo.deleteJobAlert(workspace.profile.id, alertId)))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Alerte Emploi introuvable.",
      });
  }

  async exportOwnCandidateData(userId: string): Promise<CandidateDataExport> {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    const applications = await Promise.all(
      workspace.applications.map((application) =>
        this.repo.getApplication(application.id),
      ),
    );
    return {
      fileName: "shongre-emploi-donnees-candidat.json",
      generatedAt: currentIso(),
      mediaType: "application/json",
      data: {
        profile: workspace.profile,
        cvs: workspace.cvs.map(({ downloadUrl: _downloadUrl, ...cv }) => cv),
        applications: applications.filter(Boolean),
        interviews: workspace.interviews,
        savedJobIds: workspace.savedJobs.map((job) => job.id),
        alerts: workspace.alerts,
        consentHistory: workspace.consentHistory,
      },
    };
  }

  async requestOwnCandidateDeletion(
    userId: string,
  ): Promise<EmploymentDataSubjectRequest> {
    await this.getOwnCandidateWorkspace(userId);
    const existing = await this.repo.getOpenDataSubjectRequest(
      userId,
      "delete",
    );
    if (existing) return existing;
    return this.repo.saveDataSubjectRequest({
      id: randomUUID(),
      subjectUserId: userId,
      requestType: "delete",
      status: "accepted",
      requestedAt: currentIso(),
    });
  }

  async respondToOwnInterview(
    userId: string,
    interviewId: string,
    input: unknown,
  ) {
    const workspace = await this.getOwnCandidateWorkspace(userId);
    const interview = await this.repo.getInterview(interviewId);
    const application = interview
      ? await this.repo.getApplication(interview.applicationId)
      : null;
    if (
      !interview ||
      !application ||
      application.candidateId !== workspace.profile.id
    )
      throw new AppError({
        code: "NOT_FOUND",
        message: "Entretien introuvable.",
      });
    const status = (input as { status?: unknown } | undefined)?.status;
    if (status !== "confirmed" && status !== "cancelled")
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Réponse à l’entretien invalide.",
      });
    if (!["proposed", "confirmed", "rescheduled"].includes(interview.status))
      throw new AppError({
        code: "CONFLICT",
        message: "Cet entretien ne peut plus être modifié.",
      });
    const saved = await this.repo.saveInterview(
      { ...interview, status, updatedAt: currentIso() },
      userId,
    );
    const job = await this.repo.getJob(application.jobId);
    if (!job)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Offre d’emploi introuvable.",
      });
    await Promise.all(
      saved.participantUserIds
        .filter((participantId) => participantId !== userId)
        .map((participantId) =>
          this.notify(
            participantId,
            "employment_interview_updated",
            "Entretien mis à jour",
            status === "confirmed"
              ? "Le candidat a confirmé l’entretien."
              : "Le candidat a annulé l’entretien.",
            job.marketCode,
            "/compte/emploi/recruteur",
          ),
        ),
    );
    return saved;
  }

  async getOwnRecruiterWorkspace(userId: string, employerId: string) {
    if (!(await this.repo.isRecruiterMember(userId, employerId)))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace recruteur introuvable.",
      });
    const workspace = await this.repo.getRecruiterWorkspace(employerId);
    if (!workspace)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace recruteur introuvable.",
      });
    const activeEntitlements =
      await this.commercialRules.getActiveEntitlements(userId);
    const employmentEntitlements = activeEntitlements.filter((entry) =>
      entry.productId.startsWith("employment."),
    );
    if (!employmentEntitlements.length) return workspace;
    const activeOfferId =
      employmentEntitlements.find((entry) =>
        entry.productId.startsWith("employment.employer."),
      )?.productId || workspace.activeOfferId;
    return {
      ...workspace,
      activeOfferId,
      entitlements: {
        ...workspace.entitlements,
        ...Object.fromEntries(
          employmentEntitlements.map((entry) => [entry.key, entry.value]),
        ),
      },
    };
  }

  listOwnRecruiterEmployers(userId: string) {
    return this.repo.listRecruiterEmployers(userId);
  }

  async duplicateOwnJob(userId: string, employerId: string, jobId: string) {
    if (!(await this.repo.isRecruiterMember(userId, employerId)))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace recruteur introuvable.",
      });
    const job = await this.repo.getJob(jobId);
    if (!job || job.employer.id !== employerId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Offre d’emploi introuvable.",
      });
    const draft = jobDraftSchema.parse({
      id: randomUUID(),
      ownerUserId: userId,
      employerId,
      branchId: job.employer.branchId,
      privateEmployer: !job.employer.organizationId,
      marketCode: job.marketCode,
      schemaVersion: job.schemaVersion,
      currentStep: 1,
      completedSteps: [],
      data: {
        ...job,
        employerId,
        title: `${job.title} — copie à vérifier`,
        city: job.primaryLocation.city,
        postalCode: job.primaryLocation.postalCode,
        locationLabel: job.primaryLocation.label,
        reference: undefined,
        publishedAt: undefined,
        expiresAt: undefined,
      },
      screeningQuestions: job.screeningQuestions,
      selectedOfferId: "employment.employer.free",
      selectedAddOnIds: [],
      validationIssues: [
        {
          field: "title",
          code: "duplicate_review_required",
          message:
            "Vérifiez l’intitulé, les dates et la référence avant publication.",
        },
      ],
      duplicateCandidateIds: [job.id],
      updatedAt: currentIso(),
    });
    return this.repo.saveDraft(draft);
  }

  async moveApplication(
    userId: string,
    employerId: string,
    applicationId: string,
    input: unknown,
  ) {
    if (!(await this.repo.canManageApplications(userId, employerId)))
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous ne pouvez pas modifier ce pipeline.",
      });
    const application = await this.repo.getApplication(applicationId);
    const job = application ? await this.repo.getJob(application.jobId) : null;
    if (!application || !job || job.employer.id !== employerId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Candidature introuvable.",
      });
    const body = (input || {}) as {
      stageId?: string;
      reason?: string;
      notifyCandidate?: boolean;
    };
    const workspace = await this.getOwnRecruiterWorkspace(userId, employerId);
    const stage = workspace.stages.find(
      (candidate) => candidate.id === body.stageId,
    );
    if (!stage)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Étape de recrutement inconnue.",
      });
    if (
      ["rejected", "archived"].includes(stage.systemState) &&
      !body.reason?.trim()
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Un motif interne est requis pour cette transition.",
      });
    const previousStageId = application.stageId;
    let saved;
    try {
      saved = await this.repo.saveApplication(
        {
          ...application,
          stageId: stage.id,
          systemState: stage.systemState,
          candidateVisibleStatus: stage.candidateVisibleLabel,
          updatedAt: currentIso(),
        },
        previousStageId,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "EMPLOYMENT_STAGE_CONFLICT"
      )
        throw new AppError({
          code: "CONFLICT",
          message: "La candidature a déjà évolué. Rechargez le pipeline.",
        });
      throw error;
    }
    await this.repo.saveApplicationEvent({
      id: randomUUID(),
      applicationId,
      actorUserId: userId,
      eventType: "stage_changed",
      previousStageId,
      nextStageId: stage.id,
      reason: body.reason,
      candidateNotified: Boolean(
        body.notifyCandidate && stage.candidateNotificationEnabled,
      ),
      occurredAt: currentIso(),
    });
    await this.repo.trackAnalyticsEvent({
      eventName: "application_stage_changed",
      marketCode: job.marketCode,
      jobId: job.id,
      employerId,
      dimensions: {
        fromStageId: previousStageId,
        toSystemState: stage.systemState,
      },
    });
    if (body.notifyCandidate && stage.candidateNotificationEnabled) {
      const candidate = await this.repo.getCandidateProfile(
        application.candidateId,
      );
      if (candidate) {
        await this.notify(
          candidate.userId,
          "employment_application_status_changed",
          "Votre candidature évolue",
          stage.candidateVisibleLabel,
          job.marketCode,
          "/compte/emploi",
        );
      }
    }
    return saved;
  }

  async addRecruiterNote(
    userId: string,
    employerId: string,
    applicationId: string,
    body: string,
  ) {
    if (!(await this.repo.canManageApplications(userId, employerId)))
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous ne pouvez pas ajouter de note.",
      });
    const application = await this.repo.getApplication(applicationId);
    const job = application ? await this.repo.getJob(application.jobId) : null;
    if (!job || job.employer.id !== employerId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Candidature introuvable.",
      });
    return this.repo.saveRecruiterNote({
      id: randomUUID(),
      applicationId,
      authorUserId: userId,
      body,
      visibility: "recruiters_only",
      createdAt: currentIso(),
    });
  }

  async scheduleInterview(
    userId: string,
    employerId: string,
    applicationId: string,
    input: unknown,
  ) {
    if (!(await this.repo.canManageApplications(userId, employerId)))
      throw new AppError({
        code: "FORBIDDEN",
        message: "Vous ne pouvez pas planifier cet entretien.",
      });
    const application = await this.repo.getApplication(applicationId);
    const job = application ? await this.repo.getJob(application.jobId) : null;
    if (!application || !job || job.employer.id !== employerId)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Candidature introuvable.",
      });
    const candidate = await this.repo.getCandidateProfile(
      application.candidateId,
    );
    const body = (input || {}) as Partial<EmploymentInterview>;
    const startsAt = new Date(String(body.startsAt || ""));
    const endsAt = new Date(String(body.endsAt || ""));
    if (
      !Number.isFinite(startsAt.valueOf()) ||
      !Number.isFinite(endsAt.valueOf()) ||
      endsAt <= startsAt
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le créneau d’entretien est invalide.",
      });
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: body.timezone }).format(
        startsAt,
      );
    } catch {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le fuseau horaire est invalide.",
      });
    }
    const interview = interviewSchema.parse({
      id: body.id || randomUUID(),
      applicationId,
      modeId: body.modeId,
      timezone: body.timezone,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      status: body.status || "proposed",
      locationLabel: body.locationLabel,
      privateMeetingLink: body.privateMeetingLink,
      participantUserIds: Array.from(
        new Set([
          ...(body.participantUserIds || []),
          userId,
          ...(candidate ? [candidate.userId] : []),
        ]),
      ),
      candidateMessage: body.candidateMessage,
      createdAt: currentIso(),
      updatedAt: currentIso(),
    });
    const saved = await this.repo.saveInterview(interview, userId);
    await this.repo.trackAnalyticsEvent({
      eventName: "interview_scheduled",
      marketCode: job.marketCode,
      jobId: job.id,
      employerId,
      dimensions: { modeId: saved.modeId, timezone: saved.timezone },
    });
    await Promise.all(
      saved.participantUserIds
        .filter((participantId) => participantId !== userId)
        .map((participantId) =>
          this.notify(
            participantId,
            "employment_interview_requested",
            "Entretien proposé",
            `Un entretien vous est proposé le ${new Intl.DateTimeFormat(
              "fr-FR",
              {
                dateStyle: "long",
                timeStyle: "short",
                timeZone: saved.timezone,
              },
            ).format(new Date(saved.startsAt))}.`,
            job.marketCode,
            "/compte/emploi",
          ),
        ),
    );
    return saved;
  }

  async requestImport(userId: string, employerId: string, input: unknown) {
    if (!(await this.repo.isRecruiterMember(userId, employerId)))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace recruteur introuvable.",
      });
    const workspace = await this.getOwnRecruiterWorkspace(userId, employerId);
    const body = (input || {}) as {
      sourceType?: EmploymentImport["sourceType"];
      sourceIdentifier?: string;
      idempotencyKey?: string;
    };
    if (!body.idempotencyKey || body.idempotencyKey.length < 8)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise.",
      });
    const allowed =
      (body.sourceType === "csv" &&
        workspace.entitlements.csvImport === true) ||
      (body.sourceType === "xml" &&
        workspace.entitlements.xmlImport === true) ||
      (["json_api", "ats", "career_site"].includes(String(body.sourceType)) &&
        workspace.entitlements.apiSync === true);
    if (!allowed)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Votre offre ne comprend pas ce mode d’import.",
      });
    const organizationId = workspace.employer.organizationId!;
    const existing = await this.repo.getImportByIdempotency(
      organizationId,
      body.idempotencyKey,
    );
    if (existing) return existing;
    const imported = await this.repo.saveImport(
      {
        id: randomUUID(),
        organizationId,
        sourceType: body.sourceType!,
        sourceIdentifier: getRequiredString(
          body as Record<string, unknown>,
          "sourceIdentifier",
        ),
        idempotencyKey: body.idempotencyKey,
        status: "queued",
        createdCount: 0,
        updatedCount: 0,
        expiredCount: 0,
        duplicateCount: 0,
        errorCount: 0,
        createdAt: currentIso(),
      },
      userId,
    );
    return imported;
  }

  async previewImport(userId: string, employerId: string, input: unknown) {
    if (!(await this.repo.isRecruiterMember(userId, employerId)))
      throw new AppError({
        code: "NOT_FOUND",
        message: "Espace recruteur introuvable.",
      });
    const workspace = await this.getOwnRecruiterWorkspace(userId, employerId);
    const body = (input || {}) as {
      sourceType?: EmploymentImport["sourceType"];
      sourceIdentifier?: string;
      idempotencyKey?: string;
    };
    if (!body.idempotencyKey || body.idempotencyKey.length < 8)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise.",
      });
    const allowed =
      (body.sourceType === "csv" &&
        workspace.entitlements.csvImport === true) ||
      (body.sourceType === "xml" &&
        workspace.entitlements.xmlImport === true) ||
      (["json_api", "ats", "career_site"].includes(String(body.sourceType)) &&
        workspace.entitlements.apiSync === true);
    if (!allowed)
      throw new AppError({
        code: "FORBIDDEN",
        message: "Votre offre ne comprend pas ce mode d’import.",
      });
    return {
      id: randomUUID(),
      organizationId: workspace.employer.organizationId!,
      sourceType: body.sourceType!,
      sourceIdentifier: getRequiredString(
        body as Record<string, unknown>,
        "sourceIdentifier",
      ),
      idempotencyKey: body.idempotencyKey,
      status: "preview" as const,
      createdCount: 0,
      updatedCount: 0,
      expiredCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      createdAt: currentIso(),
    };
  }

  async createCheckout(
    userId: string,
    input: unknown,
  ): Promise<VerticalCheckout> {
    const body = (input || {}) as {
      marketCode?: string;
      offerId?: string;
      addOnIds?: string[];
      idempotencyKey?: string;
    };
    if (!body.idempotencyKey || body.idempotencyKey.length < 8)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Une clé d’idempotence est requise.",
      });
    const catalog = await this.resolveCatalog(
      requireMarketCode(body.marketCode),
    );
    const offer = body.offerId
      ? catalog.offers.find(
          (candidate) => candidate.id === body.offerId && candidate.isActive,
        )
      : undefined;
    const addOns = catalog.addOns.filter(
      (candidate) =>
        body.addOnIds?.includes(candidate.id) && candidate.isActive,
    );
    if (body.offerId && !offer)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Cette offre n’est plus disponible.",
      });
    const activePrice = offer?.prices.find((price) => price.isActive);
    const productIds = [offer?.id, ...addOns.map((addOn) => addOn.id)].filter(
      (id): id is string => Boolean(id),
    );
    if (!productIds.length)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Sélectionnez une offre ou une option.",
      });
    const totalMinor =
      (activePrice?.amount.amountMinor || 0) +
      addOns.reduce((sum, addOn) => sum + addOn.price.amountMinor, 0);
    const now = currentIso();
    if (totalMinor === 0) {
      return verticalCheckoutSchema.parse({
        id: randomUUID(),
        verticalType: "employment",
        marketCode: catalog.config.marketCode,
        accountId: userId,
        offerId: offer?.id,
        addOnIds: addOns.map((addOn) => addOn.id),
        total: { amountMinor: 0, currency: catalog.config.currency },
        tax: { amountMinor: 0, currency: catalog.config.currency },
        status: "paid",
        provider: "demo",
        idempotencyKey: body.idempotencyKey,
        createdAt: now,
        updatedAt: now,
      });
    }
    const quote = await this.commercialRules.createQuote(userId, {
      productIds,
      priceIds:
        offer && activePrice ? { [offer.id]: activePrice.id } : undefined,
      marketCode: catalog.config.marketCode,
      categoryId: CANONICAL_TAXONOMY_IDS.jobs,
      idempotencyKey: `employment-quote:${body.idempotencyKey}`,
    });
    const order = await this.commercialRules.createCheckout(
      userId,
      quote.id,
      `employment-checkout:${body.idempotencyKey}`,
    );
    const status =
      order.status === "partially_refunded" ? "refunded" : order.status;
    return verticalCheckoutSchema.parse({
      id: order.id,
      verticalType: "employment",
      marketCode: catalog.config.marketCode,
      accountId: userId,
      offerId: offer?.id,
      addOnIds: addOns.map((addOn) => addOn.id),
      total: { amountMinor: quote.totalMinor, currency: quote.currency },
      tax: { amountMinor: quote.taxMinor, currency: quote.currency },
      status,
      provider: order.provider === "stripe" ? "stripe" : "demo",
      providerCheckoutId: order.providerCheckoutId,
      providerCheckoutUrl: order.providerCheckoutUrl,
      providerPaymentId: order.providerPaymentId,
      invoiceId: order.invoiceId,
      idempotencyKey: body.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    });
  }

  getAdminOverview(marketCode: string) {
    return this.repo.getAdminOverview(marketCode.toUpperCase());
  }

  updateMarketConfig(
    userId: string,
    marketCode: string,
    patch: Partial<EmploymentMarketConfig>,
  ) {
    return this.repo.updateMarketConfig(
      marketCode.toUpperCase(),
      patch,
      userId,
    );
  }

  updateOffer(
    userId: string,
    offerId: string,
    patch: Partial<EmploymentCatalog["offers"][number]>,
  ) {
    return this.repo.updateOffer(offerId, patch, userId);
  }
}

export const employmentService = new EmploymentService();
