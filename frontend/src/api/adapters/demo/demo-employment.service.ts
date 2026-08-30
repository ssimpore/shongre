import type {
  CandidateDataExport,
  CandidateProfile,
  CandidateWorkspace,
  EmploymentDataSubjectRequest,
  EmploymentApplication,
  EmploymentImport,
  EmploymentInterview,
  EmploymentJobReport,
  EmploymentSearchQuery,
  EmployerSummary,
  JobDraft,
  JobAlert,
  JobPostingDetail,
  ProhibitedLanguageFlag,
  RecruiterWorkspace,
  RecruiterNote,
} from "@shongre/contracts/employment";
import {
  candidateProfileSchema,
  EMPLOYMENT_PUBLICATION_CONSTRAINTS,
  employmentSearchQuerySchema,
  jobDraftSchema,
} from "@shongre/contracts/employment";
import { DEFAULT_MARKET_CODE } from "../../../configuration/market-baseline";
import { DEFAULT_EMPLOYMENT_CATALOG } from "@shongre/contracts/employment-catalog";
import {
  EMPLOYMENT_DEMO_APPLICATIONS,
  EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE,
  EMPLOYMENT_DEMO_INTERVIEWS,
  EMPLOYMENT_DEMO_JOBS,
  EMPLOYMENT_DEMO_RECRUITER_NOTES,
  EMPLOYMENT_DEMO_RECRUITER_USER_ID,
  EMPLOYMENT_DEMO_RECRUITER_WORKSPACE,
} from "@shongre/contracts/employment-demo";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { applyMonetizationToEmploymentCatalog } from "@shongre/contracts/vertical-monetization-adapters";
import type { VerticalCheckout } from "@shongre/contracts/vertical";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type {
  EmploymentApplicationDraft,
  EmploymentPublicationDraftData,
  EmploymentServiceContract,
  SaveEmploymentPublicationDraftInput,
} from "../../contracts/employment.contract";
import { EMPTY_EMPLOYMENT_PUBLICATION_DRAFT } from "../../contracts/employment.contract";
import { AppError } from "../../errors/app-error";
import { storageService } from "../../../services/storage.service";
import {
  requireDemoAnyCapability,
  requireDemoCapability,
} from "./demo-authorization";

const clone = <T>(value: T): T => structuredClone(value);
const employmentDraftKey = (draftId: string) =>
  `shongre_employment_draft_v2:${draftId}`;
const activeEmploymentDraftKey = (ownerUserId: string) =>
  `shongre_employment_active_draft_v2:${ownerUserId}`;
const now = () => new Date().toISOString();
const fail = (
  code: ConstructorParameters<typeof AppError>[0]["code"],
  message: string,
) => new AppError({ code, message });

const asCard = (job: JobPostingDetail) => {
  const {
    lifecycle: _lifecycle,
    marketCode: _marketCode,
    reference: _reference,
    positionsCount: _positionsCount,
    responsibilities: _responsibilities,
    requiredSkillIds: _requiredSkillIds,
    requiredSkills: _requiredSkills,
    preferredSkillIds: _preferredSkillIds,
    preferredSkills: _preferredSkills,
    requiredExperienceId: _requiredExperienceId,
    educationLevelId: _educationLevelId,
    qualificationSummary: _qualificationSummary,
    certifications: _certifications,
    languages: _languages,
    weeklyHours: _weeklyHours,
    workScheduleIds: _workScheduleIds,
    travelRequirementId: _travelRequirementId,
    additionalLocations: _additionalLocations,
    accessibilityInformation: _accessibilityInformation,
    benefits: _benefits,
    desiredStartDate: _desiredStartDate,
    recruitmentProcess: _recruitmentProcess,
    employerDescription: _employerDescription,
    applicationMethod: _applicationMethod,
    externalApplicationUrl: _externalApplicationUrl,
    contactPreferences: _contactPreferences,
    safetyNotice: _safetyNotice,
    candidateFeeRequired: _candidateFeeRequired,
    ...card
  } = job;
  return card;
};

const includes = (value: string, query?: string) =>
  !query ||
  value.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr"));

const distanceKm = (
  from: { latitude?: number; longitude?: number },
  to: { latitude?: number; longitude?: number },
) => {
  if (
    from.latitude === undefined ||
    from.longitude === undefined ||
    to.latitude === undefined ||
    to.longitude === undefined
  )
    return Number.POSITIVE_INFINITY;
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) *
      Math.cos(radians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const relevanceScore = (
  job: JobPostingDetail,
  query: EmploymentSearchQuery,
) => {
  const needle = query.keywords?.trim().toLocaleLowerCase("fr");
  if (!needle) return 0;
  return (
    (job.title.toLocaleLowerCase("fr").includes(needle) ? 100 : 0) +
    (job.professionLabel.toLocaleLowerCase("fr").includes(needle) ? 60 : 0) +
    (job.requiredSkills.some((skill) =>
      skill.toLocaleLowerCase("fr").includes(needle),
    )
      ? 30
      : 0)
  );
};

const splitPublicationValues = (value: string) =>
  value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const parseMoneyMinor = (value: string) =>
  Math.round(Number(value.replace(",", ".") || 0) * 100);

export class DemoEmploymentService implements EmploymentServiceContract {
  private catalog = clone(DEFAULT_EMPLOYMENT_CATALOG);
  private jobs = new Map(
    EMPLOYMENT_DEMO_JOBS.map((job) => [job.id, clone(job)]),
  );
  private drafts = new Map<string, JobDraft>();
  private applications = new Map(
    EMPLOYMENT_DEMO_APPLICATIONS.map((item) => [item.id, clone(item)]),
  );
  private candidateWorkspaces = new Map<string, CandidateWorkspace>([
    ["user_thomas", clone(EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE)],
  ]);
  private recruiterWorkspace = clone(EMPLOYMENT_DEMO_RECRUITER_WORKSPACE);
  private notes = new Map(
    EMPLOYMENT_DEMO_RECRUITER_NOTES.map((item) => [item.id, clone(item)]),
  );
  private interviews = new Map(
    EMPLOYMENT_DEMO_INTERVIEWS.map((item) => [item.id, clone(item)]),
  );
  private imports = new Map(
    EMPLOYMENT_DEMO_RECRUITER_WORKSPACE.imports.map((item) => [
      item.id,
      clone(item),
    ]),
  );
  private checkouts = new Map<string, VerticalCheckout>();
  private privacyRequests = new Map<string, EmploymentDataSubjectRequest>();
  private jobReports = new Map<string, EmploymentJobReport>();
  private sequence = 100;

  private next(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  private currentUser() {
    const user = storageService.getCurrentUser();
    if (!user)
      throw fail(
        "UNAUTHENTICATED",
        "Connectez-vous pour utiliser Shongre Emploi.",
      );
    return user;
  }

  private currentCandidateWorkspace() {
    const user = this.currentUser();
    const existing = this.candidateWorkspaces.get(user.id);
    if (existing) return existing;
    const candidateId = `candidate-${user.id}`;
    const workspace: CandidateWorkspace = {
      profile: {
        id: candidateId,
        userId: user.id,
        marketCode: user.country || DEFAULT_MARKET_CODE,
        skillIds: [],
        experiences: [],
        education: [],
        certifications: [],
        languages: [],
        desiredProfessionIds: [],
        desiredContractTypeIds: [],
        preferredLocationIds: [],
        professionalLinks: [],
        visibility: "private",
        updatedAt: now(),
      },
      cvs: [
        {
          id: `cv-${user.id}`,
          candidateId,
          label: `CV de ${user.name}`,
          fileName: `cv-${user.slug || user.id}.pdf`,
          mimeType: "application/pdf",
          malwareScanStatus: "clean",
          isDefault: true,
          createdAt: now(),
        },
      ],
      savedJobs: [],
      applications: [],
      interviews: [],
      consentHistory: [],
      alerts: [],
    };
    this.candidateWorkspaces.set(user.id, workspace);
    return workspace;
  }

  private recruiterEmployersForCurrentUser(): EmployerSummary[] {
    const user = this.currentUser();
    const privateEmployer = EMPLOYMENT_DEMO_JOBS.find(
      (job) => job.employer.id === "employer-private-martin",
    )!.employer;
    if (["admin", "super_admin"].includes(user.primaryRole || ""))
      return [this.recruiterWorkspace.employer, privateEmployer];
    // Keep the original general-purpose Pro account compatible with older
    // demo journeys while making the dedicated recruiter persona the canonical
    // organization member for the employment workspace.
    if (
      [EMPLOYMENT_DEMO_RECRUITER_USER_ID, "user_pro_atelier"].includes(user.id)
    )
      return [this.recruiterWorkspace.employer];
    if (user.id === "user_camille") return [privateEmployer];
    return [];
  }

  private assertRecruiterEmployer(employerId: string) {
    if (
      !this.recruiterEmployersForCurrentUser().some(
        (employer) => employer.id === employerId,
      )
    )
      throw fail("NOT_FOUND", "Espace recruteur introuvable.");
  }

  async getCatalog(marketCode: string) {
    requireDemoAnyCapability(["employment.read", "employment.admin.manage"]);
    await simulateNetworkDelay();
    const resolved = applyMonetizationToEmploymentCatalog(
      this.catalog,
      BASELINE_MONETIZATION_CATALOG,
    );
    return clone({
      ...resolved,
      activation: {
        ...resolved.activation,
        marketCode: marketCode.toUpperCase(),
      },
      config: { ...resolved.config, marketCode: marketCode.toUpperCase() },
      dictionaries: resolved.dictionaries.filter((entry) => entry.isActive),
      offers: resolved.offers.filter((offer) => offer.isActive),
      addOns: resolved.addOns.filter((addOn) => addOn.isActive),
    });
  }

  async searchJobs(input: EmploymentSearchQuery) {
    requireDemoCapability("employment.read");
    await simulateNetworkDelay();
    const query = employmentSearchQuerySchema.parse(input);
    const locationOrigin = query.location
      ? Array.from(this.jobs.values()).find((job) =>
          includes(
            `${job.primaryLocation.city} ${job.primaryLocation.label}`,
            query.location,
          ),
        )?.primaryLocation
      : undefined;
    const jobs = Array.from(this.jobs.values()).filter((job) => {
      if (job.marketCode !== query.marketCode || job.lifecycle !== "published")
        return false;
      const haystack = `${job.title} ${job.employer.name} ${job.professionLabel} ${job.industryLabel} ${job.requiredSkills.join(" ")}`;
      if (!includes(haystack, query.keywords)) return false;
      if (
        query.professionIds.length &&
        !query.professionIds.includes(job.professionId)
      )
        return false;
      if (query.jobFamilyIds.length) {
        const profession = this.catalog.dictionaries.find(
          (entry) => entry.id === job.professionId,
        );
        if (
          !profession?.parentId ||
          !query.jobFamilyIds.includes(profession.parentId)
        )
          return false;
      }
      if (
        query.industryIds.length &&
        !query.industryIds.includes(job.industryId)
      )
        return false;
      if (query.location) {
        const withinRadius =
          query.radiusKm && locationOrigin
            ? distanceKm(locationOrigin, job.primaryLocation) <= query.radiusKm
            : includes(
                `${job.primaryLocation.city} ${job.primaryLocation.label}`,
                query.location,
              );
        if (!withinRadius) return false;
      }
      if (
        query.workingArrangementIds.length &&
        !query.workingArrangementIds.includes(job.workingArrangementId)
      )
        return false;
      if (
        query.contractTypeIds.length &&
        !query.contractTypeIds.includes(job.contractTypeId)
      )
        return false;
      if (
        query.workingTimeIds.length &&
        !query.workingTimeIds.includes(job.workingTimeId)
      )
        return false;
      if (
        query.salaryMinimumMinor !== undefined &&
        (job.salary?.maximum?.amountMinor || 0) < query.salaryMinimumMinor
      )
        return false;
      if (
        query.salaryFrequencyId &&
        job.salary?.frequencyId !== query.salaryFrequencyId
      )
        return false;
      if (
        query.experienceLevelIds.length &&
        (!job.requiredExperienceId ||
          !query.experienceLevelIds.includes(job.requiredExperienceId))
      )
        return false;
      if (
        query.educationLevelIds.length &&
        (!job.educationLevelId ||
          !query.educationLevelIds.includes(job.educationLevelId))
      )
        return false;
      if (
        query.languageIds.length &&
        !job.languages.some((language) =>
          query.languageIds.includes(language.levelId),
        )
      )
        return false;
      if (
        query.scheduleIds.length &&
        !job.workScheduleIds.some((scheduleId) =>
          query.scheduleIds.includes(scheduleId),
        )
      )
        return false;
      if (query.publishedSince && job.publishedAt < query.publishedSince)
        return false;
      if (query.verifiedEmployerOnly && !job.employer.isPubliclyVerified)
        return false;
      if (query.accessibilityOnly && !job.accessibilityInformation)
        return false;
      if (
        query.employerTypeIds.length &&
        !query.employerTypeIds.includes(job.employer.employerTypeId)
      )
        return false;
      return true;
    });
    jobs.sort((a, b) => {
      if (query.sort === "salary")
        return (
          (b.salary?.maximum?.amountMinor || 0) -
          (a.salary?.maximum?.amountMinor || 0)
        );
      if (query.sort === "deadline")
        return (a.applicationDeadline || a.expiresAt).localeCompare(
          b.applicationDeadline || b.expiresAt,
        );
      if (query.sort === "distance" && locationOrigin)
        return (
          distanceKm(locationOrigin, a.primaryLocation) -
          distanceKm(locationOrigin, b.primaryLocation)
        );
      if (query.sort === "promoted") {
        const placement =
          Number(b.isFeatured || b.isSponsored) -
          Number(a.isFeatured || a.isSponsored);
        if (placement) return placement;
      }
      if (query.sort === "relevance") {
        const score = relevanceScore(b, query) - relevanceScore(a, query);
        if (score) return score;
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    });
    const offset = Number(query.cursor || 0);
    return {
      items: jobs
        .slice(offset, offset + query.limit)
        .map(asCard)
        .map(clone),
      total: jobs.length,
      organicResultCount: jobs.filter((job) => !job.isSponsored).length,
      recommendationFactors: [
        "profession",
        "compétences",
        "localisation",
        "préférences de travail",
      ],
      pageInfo: {
        hasNextPage: offset + query.limit < jobs.length,
        nextCursor:
          offset + query.limit < jobs.length
            ? String(offset + query.limit)
            : undefined,
      },
    };
  }

  async getJob(idOrSlug: string) {
    requireDemoCapability("employment.read");
    await simulateNetworkDelay();
    const job =
      this.jobs.get(idOrSlug) ||
      Array.from(this.jobs.values()).find((item) => item.slug === idOrSlug);
    if (!job) throw fail("NOT_FOUND", "Offre d’emploi introuvable.");
    return clone(job);
  }

  async getSimilarJobs(idOrSlug: string) {
    requireDemoCapability("employment.read");
    const job = await this.getJob(idOrSlug);
    return Array.from(this.jobs.values())
      .filter(
        (item) =>
          item.id !== job.id &&
          (item.professionId === job.professionId ||
            item.industryId === job.industryId),
      )
      .slice(0, 3)
      .map(asCard)
      .map(clone);
  }

  async getOrCreateDraft(
    ownerUserId: string,
    marketCode: string,
    preferredDraftId?: string,
  ) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const draftId =
      preferredDraftId ||
      storageService.get(
        activeEmploymentDraftKey(ownerUserId),
        `demo-employment-draft-${ownerUserId}`,
      );
    const existing = await this.getDraft(draftId);
    if (existing)
      return this.saveDraft({ ...existing, ownerUserId, marketCode });

    const defaultOffer =
      this.catalog.offers.find(
        (offer) => offer.isActive && offer.kind === "free",
      ) || this.catalog.offers.find((offer) => offer.isActive);
    const data: EmploymentPublicationDraftData = {
      ...EMPTY_EMPLOYMENT_PUBLICATION_DRAFT,
      positionsCount: "1",
      publishSalary: true,
    };
    return this.saveDraft({
      id: draftId,
      ownerUserId,
      privateEmployer: false,
      marketCode,
      schemaVersion: 1,
      currentStep: EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
      completedSteps: [],
      data,
      screeningQuestions: [],
      selectedOfferId: defaultOffer?.id,
      selectedAddOnIds: [],
      validationIssues: [],
      duplicateCandidateIds: [],
      updatedAt: now(),
    });
  }

  async getDraft(draftId: string) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const draft =
      this.drafts.get(draftId) ||
      storageService.get<JobDraft | null>(employmentDraftKey(draftId), null);
    return draft ? clone(draft) : null;
  }

  async saveDraft(draft: JobDraft) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const parsed = jobDraftSchema.parse({ ...draft, updatedAt: now() });
    this.drafts.set(parsed.id, clone(parsed));
    storageService.set(employmentDraftKey(parsed.id), parsed);
    storageService.set(activeEmploymentDraftKey(parsed.ownerUserId), parsed.id);
    return clone(parsed);
  }

  async savePublicationDraft(input: SaveEmploymentPublicationDraftInput) {
    requireDemoCapability("employment.job.manage.own");
    const selectedEmployer = this.recruiterEmployersForCurrentUser().find(
      (employer) => employer.id === input.data.employerId,
    );
    const employerId = input.privateEmployer
      ? `private-employer-${input.ownerUserId}`
      : selectedEmployer?.id || "";
    const labelFor = (id: string) =>
      this.catalog.dictionaries.find((entry) => entry.id === id)?.label || id;
    const skillIdFor = (label: string) =>
      this.catalog.dictionaries.find(
        (entry) =>
          entry.kind === "skill" &&
          entry.label.toLocaleLowerCase("fr") === label.toLocaleLowerCase("fr"),
      )?.id;
    const requiredSkills = splitPublicationValues(input.data.requiredSkills);
    const preferredSkills = splitPublicationValues(input.data.preferredSkills);
    const completedSteps = Array.from(
      {
        length: Math.max(
          0,
          (input.markAllPreviousStepsComplete
            ? EMPLOYMENT_PUBLICATION_CONSTRAINTS.stepCount
            : input.currentStep) - EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
        ),
      },
      (_, index) => index + EMPLOYMENT_PUBLICATION_CONSTRAINTS.firstStep,
    );
    const currency = this.catalog.config.currency;
    const data = {
      ...input.data,
      employerId,
      employer: input.privateEmployer
        ? {
            id: employerId,
            name: "Employeur particulier",
            slug: "employeur-particulier",
            employerTypeId: "employment.fr.employer_type.private",
            description: input.data.employerDescription || undefined,
            verificationLevel: "self_declared" as const,
            isPubliclyVerified: false,
          }
        : selectedEmployer,
      professionLabel: labelFor(input.data.professionId),
      industryLabel: labelFor(input.data.industryId),
      specializationId: input.data.specializationId || undefined,
      specializationLabel: input.data.specializationId
        ? labelFor(input.data.specializationId)
        : undefined,
      contractTypeLabel: labelFor(input.data.contractTypeId),
      workingArrangementLabel: labelFor(input.data.workingArrangementId),
      responsibilities: splitPublicationValues(input.data.responsibilities),
      requiredSkills,
      requiredSkillIds: requiredSkills
        .map(skillIdFor)
        .filter((id): id is string => Boolean(id)),
      preferredSkills,
      preferredSkillIds: preferredSkills
        .map(skillIdFor)
        .filter((id): id is string => Boolean(id)),
      city: input.data.city,
      locationLabel: `${input.data.city}${input.data.postalCode ? ` (${input.data.postalCode})` : ""}`,
      countryCode: input.countryCode,
      positionsCount: Math.max(1, Number(input.data.positionsCount || 1)),
      reference: input.data.internalReference || undefined,
      contractDuration: input.data.contractDuration || undefined,
      weeklyHours: input.data.weeklyHours
        ? Number(input.data.weeklyHours.replace(",", "."))
        : undefined,
      requiredExperienceId: input.data.requiredExperienceId || undefined,
      educationLevelId: input.data.educationLevelId || undefined,
      qualificationSummary: input.data.qualificationSummary || undefined,
      certifications: splitPublicationValues(input.data.certifications),
      additionalLocations: splitPublicationValues(
        input.data.additionalLocations,
      ).map((location, index) => ({
        id: `additional-location-${index + 1}-${input.draftId}`,
        label: location,
        city: location,
        countryCode: input.countryCode,
        isPrimary: false,
        isPublic: true,
      })),
      travelRequirementId: input.data.travelRequirement || undefined,
      accessibilityInformation:
        input.data.accessibilityInformation || undefined,
      benefits: splitPublicationValues(input.data.benefits),
      trialPeriodInformation: input.data.trialPeriodInformation || undefined,
      desiredStartDate: input.data.desiredStartDate || undefined,
      applicationDeadline: input.data.applicationDeadline
        ? new Date(`${input.data.applicationDeadline}T23:59:59`).toISOString()
        : undefined,
      recruitmentProcess: splitPublicationValues(input.data.recruitmentProcess),
      workScheduleIds: [input.data.workingTimeId].filter(Boolean),
      contactPreferences: ["messaging"],
      salary:
        input.data.publishSalary && input.data.salaryFrequencyId
          ? {
              minimum: {
                amountMinor: parseMoneyMinor(input.data.salaryMinimum),
                currency,
              },
              maximum: input.data.salaryMaximum
                ? {
                    amountMinor: parseMoneyMinor(input.data.salaryMaximum),
                    currency,
                  }
                : undefined,
              frequencyId: input.data.salaryFrequencyId,
              presentationId: "gross",
              isPublic: true,
              bonusDescription: input.data.bonusDescription || undefined,
            }
          : undefined,
    };
    return this.saveDraft({
      id: input.draftId,
      ownerUserId: input.ownerUserId,
      employerId: input.privateEmployer ? undefined : input.data.employerId,
      privateEmployer: input.privateEmployer,
      marketCode: input.marketCode,
      schemaVersion: this.catalog.config.schemaVersion,
      currentStep: input.currentStep,
      completedSteps,
      data,
      screeningQuestions: input.data.screeningQuestion.trim()
        ? [
            {
              id: `question-${input.draftId}`,
              questionTypeId:
                "employment.fr.screening_question_type.short_text",
              label: input.data.screeningQuestion.trim(),
              isRequired: false,
              options: [],
              disqualifyingAnswerIds: [],
            },
          ]
        : [],
      selectedOfferId: input.selectedOfferId,
      selectedAddOnIds: input.selectedAddOnIds,
      validationIssues: [],
      duplicateCandidateIds: input.duplicateCandidateIds,
      updatedAt: now(),
    });
  }

  async checkDuplicateDraft(draftId: string) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const draft = this.drafts.get(draftId);
    if (!draft) throw fail("NOT_FOUND", "Brouillon Emploi introuvable.");
    const data = draft.data;
    const duplicateCandidateIds = Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.employer.id === draft.employerId &&
          job.title.toLocaleLowerCase("fr") ===
            String(data.title || "").toLocaleLowerCase("fr") &&
          job.primaryLocation.city.toLocaleLowerCase("fr") ===
            String(data.city || "").toLocaleLowerCase("fr"),
      )
      .map((job) => job.id);
    this.drafts.set(draftId, {
      ...draft,
      duplicateCandidateIds,
      updatedAt: now(),
    });
    return { duplicateCandidateIds };
  }

  async submitDraft(draftId: string) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const draft = this.drafts.get(draftId);
    if (!draft) throw fail("NOT_FOUND", "Brouillon Emploi introuvable.");
    const flags = await this.flagProhibitedLanguage(
      `${String(draft.data.title || "")} ${String(draft.data.responsibilities || "")}`,
    );
    const result = {
      jobId: this.next("job"),
      lifecycle: "pending_review" as const,
      complianceFlags: flags,
    };
    this.drafts.delete(draftId);
    storageService.remove(employmentDraftKey(draftId));
    storageService.remove(activeEmploymentDraftKey(draft.ownerUserId));
    return result;
  }

  async flagProhibitedLanguage(
    content: string,
  ): Promise<ProhibitedLanguageFlag[]> {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    const normalized = content.toLocaleLowerCase("fr");
    return this.catalog.config.prohibitedLanguageRules.flatMap((rule) =>
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
                requiresHumanReview: true,
                isLegalDecision: false,
              },
            ]
          : [],
      ),
    );
  }

  async getCandidateWorkspace() {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    return clone({
      ...workspace,
      applications: Array.from(this.applications.values())
        .filter(
          (application) => application.candidateId === workspace.profile.id,
        )
        .map(({ screeningAnswers: _answers, ...item }) => item),
      interviews: Array.from(this.interviews.values()).filter((interview) =>
        Array.from(this.applications.values()).some(
          (application) =>
            application.id === interview.applicationId &&
            application.candidateId === workspace.profile.id,
        ),
      ),
    });
  }

  async saveCandidateProfile(profile: CandidateProfile) {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    if (
      profile.userId !== workspace.profile.userId ||
      profile.id !== workspace.profile.id
    )
      throw fail(
        "FORBIDDEN",
        "Vous ne pouvez modifier que votre profil candidat.",
      );
    const wasVisible = workspace.profile.visibility === "verified_recruiters";
    const isVisible = profile.visibility === "verified_recruiters";
    let recruiterSearchConsentId = workspace.profile.recruiterSearchConsentId;
    if (isVisible && !wasVisible) {
      recruiterSearchConsentId = this.next("consent-recruiter-search");
      workspace.consentHistory.unshift({
        id: recruiterSearchConsentId,
        subjectUserId: profile.userId,
        purposeId: "employment.recruiter_search",
        policyVersion: "employment-recruiter-search-v1",
        status: "granted",
        grantedAt: now(),
        expiresAt: "2027-08-22T10:00:00.000Z",
      });
    } else if (!isVisible && wasVisible && recruiterSearchConsentId) {
      workspace.consentHistory = workspace.consentHistory.map((consent) =>
        consent.id === recruiterSearchConsentId
          ? { ...consent, status: "withdrawn" as const, withdrawnAt: now() }
          : consent,
      );
      recruiterSearchConsentId = undefined;
    }
    const parsed = candidateProfileSchema.parse({
      ...profile,
      recruiterSearchConsentId,
      updatedAt: now(),
    });
    workspace.profile = clone(parsed);
    return clone(parsed);
  }

  async apply(jobId: string, input: EmploymentApplicationDraft) {
    requireDemoCapability("employment.application.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const job = await this.getJob(jobId);
    if (job.lifecycle !== "published")
      throw fail("CONFLICT", "Cette offre n’accepte plus de candidatures.");
    const duplicate = Array.from(this.applications.values()).find(
      (item) =>
        item.jobId === jobId &&
        item.candidateId === workspace.profile.id &&
        !["withdrawn", "rejected", "archived"].includes(item.systemState),
    );
    if (duplicate)
      throw fail(
        "CONFLICT",
        "Vous avez déjà une candidature active pour cette offre.",
      );
    const cv = workspace.cvs.find(
      (item) => item.id === input.cvId && item.malwareScanStatus === "clean",
    );
    if (!cv || !input.privacyConsent)
      throw fail(
        "VALIDATION_ERROR",
        "Sélectionnez un CV valide et acceptez la notice de confidentialité.",
      );
    const knownQuestionIds = new Set(
      job.screeningQuestions.map((question) => question.id),
    );
    if (
      input.screeningAnswers.some(
        (answer) => !knownQuestionIds.has(answer.questionId),
      )
    )
      throw fail(
        "VALIDATION_ERROR",
        "Une réponse correspond à une question inconnue.",
      );
    if (
      job.screeningQuestions.some(
        (question) =>
          question.isRequired &&
          !String(
            input.screeningAnswers.find(
              (answer) => answer.questionId === question.id,
            )?.answer || "",
          ).trim(),
      )
    )
      throw fail("VALIDATION_ERROR", "Répondez aux questions obligatoires.");
    const stage = this.catalog.defaultPipelineStages.find(
      (item) => item.systemState === "received",
    )!;
    const timestamp = now();
    const application: EmploymentApplication = {
      id: this.next("application"),
      jobId,
      candidateId: workspace.profile.id,
      cvId: cv.id,
      coverMessage: input.coverMessage,
      screeningAnswers: input.screeningAnswers,
      pipelineId: stage.pipelineId,
      stageId: stage.id,
      systemState: stage.systemState,
      candidateVisibleStatus: stage.candidateVisibleLabel,
      assignedRecruiterIds: [],
      privacyPolicyVersion: input.privacyPolicyVersion,
      consentRecordId: this.next("consent-application"),
      submittedAt: timestamp,
      updatedAt: timestamp,
      retentionExpiresAt: "2028-08-22T10:00:00.000Z",
    };
    this.applications.set(application.id, clone(application));
    return clone(application);
  }

  async withdrawApplication(applicationId: string) {
    requireDemoCapability("employment.application.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const application = this.applications.get(applicationId);
    if (!application || application.candidateId !== workspace.profile.id)
      throw fail("NOT_FOUND", "Candidature introuvable.");
    const updated: EmploymentApplication = {
      ...application,
      systemState: "withdrawn",
      candidateVisibleStatus: "Candidature retirée",
      withdrawnAt: now(),
      updatedAt: now(),
    };
    this.applications.set(updated.id, clone(updated));
    return clone(updated);
  }

  async toggleSavedJob(jobId: string) {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const index = workspace.savedJobs.findIndex((job) => job.id === jobId);
    if (index >= 0) workspace.savedJobs.splice(index, 1);
    else workspace.savedJobs.push(asCard(await this.getJob(jobId)));
    return { saved: index < 0 };
  }

  async reportJob(
    jobId: string,
    input: Pick<EmploymentJobReport, "reason" | "details">,
  ) {
    requireDemoCapability("report.create");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    await this.getJob(jobId);
    const existing = Array.from(this.jobReports.values()).find(
      (report) => report.jobId === jobId && report.reason === input.reason,
    );
    if (existing) return clone(existing);
    const report: EmploymentJobReport = {
      id: this.next("job-report"),
      jobId,
      reporterUserId: workspace.profile.userId,
      reason: input.reason,
      details: input.details?.trim() || undefined,
      status: "submitted",
      createdAt: now(),
    };
    this.jobReports.set(report.id, clone(report));
    return clone(report);
  }

  async saveJobAlert(input: {
    label: string;
    query: EmploymentSearchQuery;
    frequency: JobAlert["frequency"];
  }) {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const alert: JobAlert = {
      id: this.next("alert"),
      candidateId: workspace.profile.id,
      label: input.label.trim() || "Ma recherche Emploi",
      query: employmentSearchQuerySchema
        .omit({ cursor: true })
        .parse(input.query),
      frequency: input.frequency,
      enabled: true,
      createdAt: now(),
    };
    workspace.alerts = [alert, ...workspace.alerts];
    return clone(alert);
  }

  async deleteJobAlert(alertId: string) {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const index = workspace.alerts.findIndex((alert) => alert.id === alertId);
    if (index < 0) throw fail("NOT_FOUND", "Alerte Emploi introuvable.");
    workspace.alerts.splice(index, 1);
  }

  async exportCandidateData(): Promise<CandidateDataExport> {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    return {
      fileName: "shongre-emploi-donnees-candidat.json",
      generatedAt: now(),
      mediaType: "application/json",
      data: clone({
        profile: workspace.profile,
        cvs: workspace.cvs.map(({ downloadUrl: _downloadUrl, ...cv }) => cv),
        applications: Array.from(this.applications.values()).filter(
          (application) => application.candidateId === workspace.profile.id,
        ),
        interviews: Array.from(this.interviews.values()).filter((interview) =>
          Array.from(this.applications.values()).some(
            (application) =>
              application.id === interview.applicationId &&
              application.candidateId === workspace.profile.id,
          ),
        ),
        savedJobs: workspace.savedJobs.map((job) => job.id),
        alerts: workspace.alerts,
        consentHistory: workspace.consentHistory,
      }),
    };
  }

  async requestCandidateDeletion(): Promise<EmploymentDataSubjectRequest> {
    requireDemoCapability("employment.candidate.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const existing = Array.from(this.privacyRequests.values()).find(
      (request) =>
        request.subjectUserId === workspace.profile.userId &&
        request.requestType === "delete" &&
        request.status !== "cancelled",
    );
    if (existing) return clone(existing);
    const request: EmploymentDataSubjectRequest = {
      id: this.next("privacy-request"),
      subjectUserId: workspace.profile.userId,
      requestType: "delete",
      status: "accepted",
      requestedAt: now(),
    };
    this.privacyRequests.set(request.id, request);
    return clone(request);
  }

  async respondToInterview(
    interviewId: string,
    status: "confirmed" | "cancelled",
  ) {
    requireDemoCapability("employment.application.manage.own");
    await simulateNetworkDelay();
    const workspace = this.currentCandidateWorkspace();
    const interview = this.interviews.get(interviewId);
    const application = interview
      ? this.applications.get(interview.applicationId)
      : undefined;
    if (
      !interview ||
      !application ||
      application.candidateId !== workspace.profile.id
    )
      throw fail("NOT_FOUND", "Entretien introuvable.");
    if (!["proposed", "confirmed", "rescheduled"].includes(interview.status))
      throw fail("CONFLICT", "Cet entretien ne peut plus être modifié.");
    const updated = { ...interview, status, updatedAt: now() };
    this.interviews.set(updated.id, clone(updated));
    return clone(updated);
  }

  async listRecruiterEmployers() {
    requireDemoAnyCapability([
      "employment.job.manage.own",
      "employment.recruiter.manage.own",
    ]);
    await simulateNetworkDelay();
    return clone(this.recruiterEmployersForCurrentUser());
  }

  async getRecruiterWorkspace(employerId: string): Promise<RecruiterWorkspace> {
    requireDemoCapability("employment.recruiter.manage.own");
    await simulateNetworkDelay();
    this.assertRecruiterEmployer(employerId);
    if (employerId === "employer-private-martin") {
      const employer = this.recruiterEmployersForCurrentUser().find(
        (candidate) => candidate.id === employerId,
      )!;
      return clone({
        employer,
        jobs: Array.from(this.jobs.values())
          .filter((job) => job.employer.id === employerId)
          .map(asCard),
        applications: Array.from(this.applications.values()).filter(
          (application) =>
            this.jobs.get(application.jobId)?.employer.id === employerId,
        ),
        stages: this.recruiterWorkspace.stages,
        interviews: [],
        recruiterNotes: [],
        imports: [],
        members: [
          {
            id: "membership-private-camille",
            userId: "user_camille",
            displayName: "Camille Martin",
            role: "owner",
            branchIds: [],
            clientEmployerIds: [],
            permissions: [
              "job.manage",
              "application.manage",
              "interview.manage",
            ],
            status: "active",
          },
        ],
        activeOfferId: "employment.employer.free",
        entitlements: {
          maxActiveJobs: 1,
          maxRecruiterSeats: 1,
          candidateAssignment: false,
          privateRecruiterNotes: true,
          interviewScheduling: true,
          advancedAnalytics: false,
          csvImport: false,
          apiSync: false,
        },
      });
    }
    return clone({
      ...this.recruiterWorkspace,
      applications: Array.from(this.applications.values()).filter(
        (application) =>
          this.jobs.get(application.jobId)?.employer.id === employerId,
      ),
      recruiterNotes: Array.from(this.notes.values()),
      interviews: Array.from(this.interviews.values()),
      imports: Array.from(this.imports.values()),
    });
  }

  async duplicateJob(employerId: string, jobId: string) {
    requireDemoCapability("employment.job.manage.own");
    await simulateNetworkDelay();
    await this.getRecruiterWorkspace(employerId);
    const job = await this.getJob(jobId);
    if (job.employer.id !== employerId)
      throw fail("NOT_FOUND", "Offre d’emploi introuvable.");
    const draft: JobDraft = {
      id: this.next("draft-employment-copy"),
      ownerUserId: this.currentUser().id,
      employerId,
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
      updatedAt: now(),
    };
    this.drafts.set(draft.id, clone(draft));
    return clone(draft);
  }

  async moveApplication(
    employerId: string,
    applicationId: string,
    input: { stageId: string; reason?: string; notifyCandidate?: boolean },
  ) {
    requireDemoCapability("employment.application.manage.own");
    await simulateNetworkDelay();
    await this.getRecruiterWorkspace(employerId);
    const application = this.applications.get(applicationId);
    const stage = this.recruiterWorkspace.stages.find(
      (item) => item.id === input.stageId,
    );
    if (!application || !stage)
      throw fail("NOT_FOUND", "Candidature ou étape introuvable.");
    if (["rejected", "archived"].includes(stage.systemState) && !input.reason)
      throw fail("VALIDATION_ERROR", "Un motif est requis.");
    const updated = {
      ...application,
      stageId: stage.id,
      systemState: stage.systemState,
      candidateVisibleStatus: stage.candidateVisibleLabel,
      updatedAt: now(),
    };
    this.applications.set(updated.id, clone(updated));
    return clone(updated);
  }

  async addRecruiterNote(
    employerId: string,
    applicationId: string,
    body: string,
  ) {
    requireDemoCapability("employment.recruiter.manage.own");
    await simulateNetworkDelay();
    await this.getRecruiterWorkspace(employerId);
    const note: RecruiterNote = {
      id: this.next("note"),
      applicationId,
      authorUserId: this.currentUser().id,
      body,
      visibility: "recruiters_only",
      createdAt: now(),
    };
    this.notes.set(note.id, clone(note));
    return clone(note);
  }

  async scheduleInterview(
    employerId: string,
    applicationId: string,
    input: Omit<
      EmploymentInterview,
      "id" | "applicationId" | "createdAt" | "updatedAt"
    >,
  ) {
    requireDemoCapability("employment.recruiter.manage.own");
    await simulateNetworkDelay();
    await this.getRecruiterWorkspace(employerId);
    if (Date.parse(input.endsAt) <= Date.parse(input.startsAt))
      throw fail("VALIDATION_ERROR", "Le créneau d’entretien est invalide.");
    try {
      new Intl.DateTimeFormat("fr-FR", { timeZone: input.timezone }).format(
        new Date(input.startsAt),
      );
    } catch {
      throw fail("VALIDATION_ERROR", "Le fuseau horaire est invalide.");
    }
    const interview: EmploymentInterview = {
      ...input,
      id: this.next("interview"),
      applicationId,
      participantUserIds: Array.from(
        new Set([
          ...input.participantUserIds,
          this.currentUser().id,
          ...Array.from(this.candidateWorkspaces.values())
            .filter(
              (workspace) =>
                workspace.profile.id ===
                this.applications.get(applicationId)?.candidateId,
            )
            .map((workspace) => workspace.profile.userId),
        ]),
      ),
      createdAt: now(),
      updatedAt: now(),
    };
    this.interviews.set(interview.id, clone(interview));
    return clone(interview);
  }

  async requestImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ) {
    requireDemoCapability("employment.import.own");
    await simulateNetworkDelay();
    await this.getRecruiterWorkspace(employerId);
    const employer = this.recruiterEmployersForCurrentUser().find(
      (item) => item.id === employerId,
    )!;
    if (!employer.organizationId)
      throw fail(
        "FORBIDDEN",
        "Les imports sont réservés aux organisations autorisées.",
      );
    const organizationId = employer.organizationId;
    const existing = Array.from(this.imports.values()).find(
      (item) =>
        item.organizationId === organizationId &&
        item.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return clone(existing);
    const job: EmploymentImport = {
      id: this.next("import"),
      organizationId,
      ...input,
      status: "queued",
      createdCount: 0,
      updatedCount: 0,
      expiredCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      createdAt: now(),
    };
    this.imports.set(job.id, clone(job));
    return clone(job);
  }

  async previewImport(
    employerId: string,
    input: {
      sourceType: EmploymentImport["sourceType"];
      sourceIdentifier: string;
      idempotencyKey: string;
    },
  ) {
    requireDemoCapability("employment.import.own");
    await simulateNetworkDelay();
    const workspace = await this.getRecruiterWorkspace(employerId);
    if (
      (input.sourceType === "csv" &&
        workspace.entitlements.csvImport !== true) ||
      (input.sourceType === "xml" &&
        workspace.entitlements.xmlImport !== true) ||
      (["json_api", "ats", "career_site"].includes(input.sourceType) &&
        workspace.entitlements.apiSync !== true)
    )
      throw fail("FORBIDDEN", "Votre offre ne comprend pas ce mode d’import.");
    return {
      id: this.next("import-preview"),
      organizationId: workspace.employer.organizationId!,
      ...input,
      status: "preview" as const,
      createdCount: 2,
      updatedCount: 1,
      expiredCount: 0,
      duplicateCount: 1,
      errorCount: 0,
      createdAt: now(),
    };
  }

  async createCheckout(input: {
    marketCode: string;
    offerId?: string;
    addOnIds?: string[];
    idempotencyKey: string;
    scenario?: "success" | "pending" | "failed" | "requires_action";
  }) {
    requireDemoCapability("marketplace.customer.access");
    await simulateNetworkDelay();
    const existing = this.checkouts.get(input.idempotencyKey);
    if (existing) return clone(existing);
    const catalog = await this.getCatalog(input.marketCode);
    const offer = catalog.offers.find((item) => item.id === input.offerId);
    const addOns = catalog.addOns.filter((item) =>
      input.addOnIds?.includes(item.id),
    );
    const price = offer?.prices.find((item) => item.isActive);
    const total =
      (price?.amount.amountMinor || 0) +
      addOns.reduce((sum, item) => sum + item.price.amountMinor, 0);
    const scenario = input.scenario || "success";
    const status =
      total === 0
        ? "paid"
        : scenario === "success"
          ? "paid"
          : scenario === "pending"
            ? "pending"
            : scenario === "requires_action"
              ? "requires_action"
              : "failed";
    const checkout: VerticalCheckout = {
      id: this.next("checkout"),
      verticalType: "employment",
      marketCode: input.marketCode,
      accountId: this.currentUser().id,
      offerId: offer?.id,
      addOnIds: addOns.map((item) => item.id),
      total: { amountMinor: total, currency: catalog.config.currency },
      tax: {
        amountMinor: Math.round(total - total / 1.2),
        currency: catalog.config.currency,
      },
      status,
      provider: "demo",
      providerPaymentId:
        status === "paid" && total > 0 ? this.next("demo-payment") : undefined,
      invoiceId:
        status === "paid" && total > 0 ? this.next("demo-invoice") : undefined,
      idempotencyKey: input.idempotencyKey,
      createdAt: now(),
      updatedAt: now(),
    };
    this.checkouts.set(input.idempotencyKey, clone(checkout));
    return clone(checkout);
  }

  async getAdminOverview(marketCode: string) {
    requireDemoCapability("employment.admin.manage");
    await simulateNetworkDelay();
    return {
      catalog: await this.getCatalog(marketCode),
      employerCounts: { active: 483, verified: 296, suspended: 7, private: 82 },
      jobCounts: {
        published: 2841,
        pending_review: 37,
        expired: 416,
        flagged: 12,
      },
      applicationCounts: {
        received: 6820,
        interview: 614,
        offer: 103,
        hired: 72,
      },
      importErrorCount: 3,
      moderationQueueCount: 37,
      prohibitedLanguageReviewCount: 9,
    };
  }

  async updateMarketConfig(
    marketCode: string,
    patch: Partial<(typeof this.catalog)["config"]>,
  ) {
    requireDemoCapability("employment.admin.manage");
    await simulateNetworkDelay();
    if (marketCode.toUpperCase() !== this.catalog.config.marketCode)
      throw fail("NOT_FOUND", "Marché Emploi introuvable.");
    this.catalog.config = { ...this.catalog.config, ...clone(patch) };
    this.catalog.activation.isActive = this.catalog.config.isEnabled;
    return clone(this.catalog.config);
  }

  async updateOffer(
    offerId: string,
    patch: Partial<(typeof this.catalog)["offers"][number]>,
  ) {
    requireDemoCapability("employment.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.offers.findIndex(
      (offer) => offer.id === offerId,
    );
    if (index < 0) throw fail("NOT_FOUND", "Offre Emploi introuvable.");
    this.catalog.offers[index] = {
      ...this.catalog.offers[index],
      ...clone(patch),
      verticalType: "employment",
    };
    return clone(this.catalog.offers[index]);
  }
}

export const demoEmploymentService = new DemoEmploymentService();
