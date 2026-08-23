import { z } from "zod";
import { marketCodeSchema, moneySchema } from "./primitives";
import {
  verticalActivationSchema,
  verticalAddOnSchema,
  verticalOfferSchema,
} from "./vertical";

/** Public, versioned contracts for the employment vertical. */
export const employmentVerticalSchema = z.literal("employment");

export const employmentLifecycleSchema = z.enum([
  "draft",
  "pending_review",
  "published",
  "closed",
  "expired",
  "suspended",
  "rejected",
  "archived",
]);

export const employmentSystemStageSchema = z.enum([
  "received",
  "active",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
  "archived",
]);

export const candidateVisibilitySchema = z.enum([
  "private",
  "applications_only",
  "verified_recruiters",
  "hidden",
  "deleted",
]);

export const employmentDictionaryKindSchema = z.enum([
  "sector",
  "job_family",
  "profession",
  "specialization",
  "skill",
  "seniority",
  "contract_type",
  "salary_frequency",
  "working_arrangement",
  "work_schedule",
  "education_level",
  "language_level",
  "employer_type",
  "screening_question_type",
]);

export const employmentDictionaryEntrySchema = z.object({
  id: z.string().min(1),
  marketCode: marketCodeSchema,
  kind: employmentDictionaryKindSchema,
  parentId: z.string().optional(),
  code: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  aliases: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  version: z.number().int().positive(),
});
export type EmploymentDictionaryEntry = z.infer<
  typeof employmentDictionaryEntrySchema
>;

export const employmentFeatureFlagsSchema = z.object({
  verticalEnabled: z.boolean(),
  privateEmployersEnabled: z.boolean(),
  directApplicationsEnabled: z.boolean(),
  externalApplicationsEnabled: z.boolean(),
  candidateSearchEnabled: z.boolean(),
  talentPoolEnabled: z.boolean(),
  interviewsEnabled: z.boolean(),
  paidVisibilityEnabled: z.boolean(),
  importsEnabled: z.boolean(),
  apiSyncEnabled: z.boolean(),
  aiAssistanceEnabled: z.boolean(),
});

export const employmentMarketConfigSchema = z.object({
  marketCode: marketCodeSchema,
  schemaVersion: z.number().int().positive(),
  locale: z.string().min(2),
  currency: z.string().length(3),
  timezone: z.string().min(1),
  isEnabled: z.boolean(),
  defaultPublicationDurationDays: z.number().int().positive(),
  draftRetentionDays: z.number().int().positive(),
  applicationRetentionDays: z.number().int().positive(),
  talentPoolRetentionDays: z.number().int().positive(),
  applicationResubmissionCooldownDays: z.number().int().nonnegative(),
  regulatoryContentVersion: z.string().min(1),
  prohibitedLanguagePolicyVersion: z.string().min(1),
  prohibitedLanguageRules: z.array(
    z.object({
      id: z.string().min(1),
      terms: z.array(z.string().min(2)).min(1),
      explanation: z.string().min(1),
      neutralSuggestion: z.string().min(1),
    }),
  ),
  riskRules: z.object({
    blockedExternalHostPatterns: z.array(z.string().min(1)).default([]),
    salaryReviewMaximumMinorByFrequency: z
      .record(z.string(), z.number().int().positive())
      .default({}),
  }),
  requiredFieldIds: z.array(z.string()).default([]),
  featureFlags: employmentFeatureFlagsSchema,
});
export type EmploymentMarketConfig = z.infer<
  typeof employmentMarketConfigSchema
>;

export const employerVerificationLevelSchema = z.enum([
  "self_declared",
  "domain_verified",
  "document_submitted",
  "manually_verified",
  "provider_verified",
  "expired",
  "rejected",
]);

export const employerSummarySchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().optional(),
  branchId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  employerTypeId: z.string().min(1),
  logoUrl: z.string().url().optional(),
  description: z.string().optional(),
  verificationLevel: employerVerificationLevelSchema,
  verificationExpiresAt: z.string().optional(),
  isPubliclyVerified: z.boolean(),
});
export type EmployerSummary = z.infer<typeof employerSummarySchema>;

export const employmentLocationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().optional(),
  countryCode: z.string().length(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isPrimary: z.boolean(),
  isPublic: z.boolean(),
});

export const salaryRangeSchema = z
  .object({
    minimum: moneySchema.optional(),
    maximum: moneySchema.optional(),
    frequencyId: z.string().min(1),
    presentationId: z.string().min(1),
    isPublic: z.boolean(),
    bonusDescription: z.string().optional(),
  })
  .refine(
    (value) =>
      !value.minimum ||
      !value.maximum ||
      value.minimum.currency === value.maximum.currency,
    {
      message:
        "La rémunération minimale et maximale doivent utiliser la même devise.",
    },
  )
  .refine(
    (value) =>
      !value.minimum ||
      !value.maximum ||
      value.minimum.amountMinor <= value.maximum.amountMinor,
    { message: "La rémunération minimale doit précéder la maximale." },
  );
export type SalaryRange = z.infer<typeof salaryRangeSchema>;

export const screeningQuestionSchema = z.object({
  id: z.string().min(1),
  questionTypeId: z.string().min(1),
  label: z.string().min(1),
  helpText: z.string().optional(),
  isRequired: z.boolean(),
  options: z.array(z.string()).default([]),
  disqualifyingAnswerIds: z.array(z.string()).default([]),
});
export type ScreeningQuestion = z.infer<typeof screeningQuestionSchema>;

export const jobPostingCardSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  title: z.string().min(1),
  employer: employerSummarySchema,
  professionId: z.string().min(1),
  professionLabel: z.string().min(1),
  specializationId: z.string().optional(),
  specializationLabel: z.string().optional(),
  industryId: z.string().min(1),
  industryLabel: z.string().min(1),
  contractTypeId: z.string().min(1),
  contractTypeLabel: z.string().min(1),
  workingArrangementId: z.string().min(1),
  workingArrangementLabel: z.string().min(1),
  workingTimeId: z.string().min(1),
  primaryLocation: employmentLocationSchema,
  salary: salaryRangeSchema.optional(),
  publishedAt: z.string(),
  expiresAt: z.string(),
  applicationDeadline: z.string().optional(),
  isUrgent: z.boolean(),
  isFeatured: z.boolean(),
  isSponsored: z.boolean(),
  saved: z.boolean().default(false),
});
export type JobPostingCard = z.infer<typeof jobPostingCardSchema>;

export const jobPostingDetailSchema = jobPostingCardSchema.extend({
  lifecycle: employmentLifecycleSchema,
  marketCode: marketCodeSchema,
  reference: z.string().optional(),
  positionsCount: z.number().int().positive(),
  contractDuration: z.string().optional(),
  responsibilities: z.array(z.string().min(1)).min(1),
  requiredSkillIds: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkillIds: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  requiredExperienceId: z.string().optional(),
  educationLevelId: z.string().optional(),
  qualificationSummary: z.string().optional(),
  certifications: z.array(z.string()).default([]),
  languages: z.array(
    z.object({
      languageId: z.string(),
      levelId: z.string(),
      label: z.string(),
    }),
  ),
  weeklyHours: z.number().positive().optional(),
  workScheduleIds: z.array(z.string()).default([]),
  travelRequirementId: z.string().optional(),
  additionalLocations: z.array(employmentLocationSchema).default([]),
  accessibilityInformation: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  trialPeriodInformation: z.string().optional(),
  desiredStartDate: z.string().optional(),
  recruitmentProcess: z.array(z.string()).default([]),
  employerDescription: z.string().optional(),
  applicationMethod: z.enum(["shongre", "external", "contact_recruiter"]),
  externalApplicationUrl: z.string().url().optional(),
  contactPreferences: z.array(z.string()).default([]),
  screeningQuestions: z.array(screeningQuestionSchema).default([]),
  safetyNotice: z.string().min(1),
  candidateFeeRequired: z.literal(false),
});
export type JobPostingDetail = z.infer<typeof jobPostingDetailSchema>;

export const employmentSearchQuerySchema = z.object({
  marketCode: marketCodeSchema.default("FR"),
  keywords: z.string().optional(),
  professionIds: z.array(z.string()).default([]),
  jobFamilyIds: z.array(z.string()).default([]),
  industryIds: z.array(z.string()).default([]),
  location: z.string().optional(),
  radiusKm: z.number().positive().optional(),
  workingArrangementIds: z.array(z.string()).default([]),
  contractTypeIds: z.array(z.string()).default([]),
  workingTimeIds: z.array(z.string()).default([]),
  salaryMinimumMinor: z.number().int().nonnegative().optional(),
  salaryFrequencyId: z.string().optional(),
  experienceLevelIds: z.array(z.string()).default([]),
  educationLevelIds: z.array(z.string()).default([]),
  languageIds: z.array(z.string()).default([]),
  scheduleIds: z.array(z.string()).default([]),
  publishedSince: z.string().optional(),
  employerTypeIds: z.array(z.string()).default([]),
  verifiedEmployerOnly: z.boolean().default(false),
  accessibilityOnly: z.boolean().default(false),
  sort: z
    .enum(["relevance", "newest", "salary", "distance", "deadline", "promoted"])
    .default("relevance"),
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(24),
});
export type EmploymentSearchQuery = z.infer<typeof employmentSearchQuerySchema>;

export const employmentSearchResultSchema = z.object({
  items: z.array(jobPostingCardSchema),
  pageInfo: z.object({
    hasNextPage: z.boolean(),
    nextCursor: z.string().optional(),
  }),
  total: z.number().int().nonnegative(),
  organicResultCount: z.number().int().nonnegative(),
  recommendationFactors: z.array(z.string()).default([]),
});
export type EmploymentSearchResult = z.infer<
  typeof employmentSearchResultSchema
>;

export const jobDraftSchema = z.object({
  id: z.string().min(1),
  ownerUserId: z.string().min(1),
  employerId: z.string().optional(),
  branchId: z.string().optional(),
  privateEmployer: z.boolean(),
  marketCode: marketCodeSchema,
  schemaVersion: z.number().int().positive(),
  currentStep: z.number().int().min(1).max(13),
  completedSteps: z.array(z.number().int()).default([]),
  data: z.record(z.string(), z.unknown()),
  screeningQuestions: z.array(screeningQuestionSchema).default([]),
  selectedOfferId: z.string().optional(),
  selectedAddOnIds: z.array(z.string()).default([]),
  validationIssues: z.array(
    z.object({ field: z.string(), code: z.string(), message: z.string() }),
  ),
  duplicateCandidateIds: z.array(z.string()).default([]),
  updatedAt: z.string(),
});
export type JobDraft = z.infer<typeof jobDraftSchema>;

export const candidateCvSchema = z.object({
  id: z.string().min(1),
  candidateId: z.string().min(1),
  label: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  downloadUrl: z.string().url().optional(),
  malwareScanStatus: z.enum(["pending", "clean", "rejected"]),
  isDefault: z.boolean(),
  createdAt: z.string(),
});
export type CandidateCv = z.infer<typeof candidateCvSchema>;

export const candidateProfileSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  marketCode: marketCodeSchema,
  professionalTitle: z.string().optional(),
  summary: z.string().optional(),
  skillIds: z.array(z.string()).default([]),
  experiences: z.array(z.record(z.string(), z.unknown())).default([]),
  education: z.array(z.record(z.string(), z.unknown())).default([]),
  certifications: z.array(z.string()).default([]),
  languages: z.array(z.record(z.string(), z.string())).default([]),
  desiredProfessionIds: z.array(z.string()).default([]),
  desiredContractTypeIds: z.array(z.string()).default([]),
  preferredLocationIds: z.array(z.string()).default([]),
  remotePreferenceId: z.string().optional(),
  salaryExpectation: salaryRangeSchema.optional(),
  availabilityDate: z.string().optional(),
  professionalLinks: z.array(z.string().url()).default([]),
  visibility: candidateVisibilitySchema,
  recruiterSearchConsentId: z.string().optional(),
  updatedAt: z.string(),
});
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;

export const applicationStageSchema = z.object({
  id: z.string().min(1),
  pipelineId: z.string().min(1),
  label: z.string().min(1),
  systemState: employmentSystemStageSchema,
  candidateVisibleLabel: z.string().min(1),
  sortOrder: z.number().int(),
  candidateNotificationEnabled: z.boolean(),
  isRequiredSystemStage: z.boolean(),
});
export type ApplicationStage = z.infer<typeof applicationStageSchema>;

export const recruitmentPipelineSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  clientOrganizationId: z.string().optional(),
  label: z.string().min(1),
  isDefault: z.boolean(),
  stages: z.array(applicationStageSchema).min(1),
  version: z.number().int().positive(),
  updatedAt: z.string(),
});
export type RecruitmentPipeline = z.infer<typeof recruitmentPipelineSchema>;

export const applicationSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  candidateId: z.string().min(1),
  cvId: z.string().min(1),
  coverMessage: z.string().max(4000).optional(),
  screeningAnswers: z.array(
    z.object({ questionId: z.string(), answer: z.unknown() }),
  ),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  systemState: employmentSystemStageSchema,
  candidateVisibleStatus: z.string().min(1),
  assignedRecruiterIds: z.array(z.string()).default([]),
  privacyPolicyVersion: z.string().min(1),
  consentRecordId: z.string().optional(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  withdrawnAt: z.string().optional(),
  retentionExpiresAt: z.string(),
});
export type EmploymentApplication = z.infer<typeof applicationSchema>;

export const recruiterNoteSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  authorUserId: z.string().min(1),
  body: z.string().min(1).max(4000),
  visibility: z.literal("recruiters_only"),
  createdAt: z.string(),
});
export type RecruiterNote = z.infer<typeof recruiterNoteSchema>;

export const applicationEventSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  actorUserId: z.string().optional(),
  eventType: z.string().min(1),
  previousStageId: z.string().optional(),
  nextStageId: z.string().optional(),
  reason: z.string().optional(),
  candidateNotified: z.boolean(),
  occurredAt: z.string(),
});
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;

export const interviewSchema = z.object({
  id: z.string().min(1),
  applicationId: z.string().min(1),
  modeId: z.string().min(1),
  timezone: z.string().min(1),
  startsAt: z.string(),
  endsAt: z.string(),
  status: z.enum([
    "proposed",
    "confirmed",
    "rescheduled",
    "cancelled",
    "completed",
  ]),
  locationLabel: z.string().optional(),
  privateMeetingLink: z.string().url().optional(),
  participantUserIds: z.array(z.string()).min(1),
  candidateMessage: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EmploymentInterview = z.infer<typeof interviewSchema>;

export const consentRecordSchema = z.object({
  id: z.string().min(1),
  subjectUserId: z.string().min(1),
  purposeId: z.string().min(1),
  policyVersion: z.string().min(1),
  status: z.enum(["granted", "withdrawn", "expired"]),
  grantedAt: z.string(),
  withdrawnAt: z.string().optional(),
  expiresAt: z.string().optional(),
});
export type ConsentRecord = z.infer<typeof consentRecordSchema>;

export const jobAlertSchema = z.object({
  id: z.string().min(1),
  candidateId: z.string().min(1),
  label: z.string().min(1),
  query: employmentSearchQuerySchema.omit({ cursor: true }),
  frequency: z.enum(["instant", "daily", "weekly"]),
  enabled: z.boolean(),
  lastSentAt: z.string().optional(),
  createdAt: z.string(),
});
export type JobAlert = z.infer<typeof jobAlertSchema>;

export const employmentDataSubjectRequestSchema = z.object({
  id: z.string().min(1),
  subjectUserId: z.string().min(1),
  requestType: z.enum(["export", "delete"]),
  status: z.enum(["accepted", "processing", "completed", "cancelled"]),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
});
export type EmploymentDataSubjectRequest = z.infer<
  typeof employmentDataSubjectRequestSchema
>;

export const employmentJobReportSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  reporterUserId: z.string().min(1),
  reason: z.enum([
    "fraud",
    "discrimination",
    "candidate_fee",
    "misleading",
    "malicious_link",
    "other",
  ]),
  details: z.string().max(2000).optional(),
  status: z.enum(["submitted", "reviewing", "resolved", "dismissed"]),
  createdAt: z.string(),
});
export type EmploymentJobReport = z.infer<typeof employmentJobReportSchema>;

export const candidateDataExportSchema = z.object({
  fileName: z.string().min(1),
  generatedAt: z.string(),
  mediaType: z.literal("application/json"),
  data: z.record(z.string(), z.unknown()),
});
export type CandidateDataExport = z.infer<typeof candidateDataExportSchema>;

export const employmentImportSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  sourceType: z.enum(["csv", "xml", "json_api", "ats", "career_site"]),
  sourceIdentifier: z.string().min(1),
  idempotencyKey: z.string().min(8),
  status: z.enum([
    "preview",
    "queued",
    "processing",
    "completed",
    "partial",
    "failed",
  ]),
  createdCount: z.number().int().nonnegative(),
  updatedCount: z.number().int().nonnegative(),
  expiredCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type EmploymentImport = z.infer<typeof employmentImportSchema>;

export const recruiterMemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1).optional(),
  role: z.enum([
    "owner",
    "billing_admin",
    "recruitment_admin",
    "recruiter",
    "hiring_manager",
    "interviewer",
    "analyst",
  ]),
  branchIds: z.array(z.string()).default([]),
  clientEmployerIds: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  status: z.enum(["invited", "active", "suspended", "revoked"]),
});
export type RecruiterMember = z.infer<typeof recruiterMemberSchema>;

export const employmentCatalogSchema = z.object({
  activation: verticalActivationSchema.extend({
    verticalType: employmentVerticalSchema,
  }),
  config: employmentMarketConfigSchema,
  dictionaries: z.array(employmentDictionaryEntrySchema),
  defaultPipelineStages: z.array(applicationStageSchema),
  offers: z.array(
    verticalOfferSchema.extend({ verticalType: employmentVerticalSchema }),
  ),
  addOns: z.array(
    verticalAddOnSchema.extend({ verticalType: employmentVerticalSchema }),
  ),
  complianceNotices: z.array(
    z.object({ id: z.string(), severity: z.string(), message: z.string() }),
  ),
});
export type EmploymentCatalog = z.infer<typeof employmentCatalogSchema>;

export const candidateWorkspaceSchema = z.object({
  profile: candidateProfileSchema,
  cvs: z.array(candidateCvSchema),
  savedJobs: z.array(jobPostingCardSchema),
  applications: z.array(applicationSchema.omit({ screeningAnswers: true })),
  interviews: z.array(interviewSchema),
  consentHistory: z.array(consentRecordSchema),
  alerts: z.array(jobAlertSchema),
});
export type CandidateWorkspace = z.infer<typeof candidateWorkspaceSchema>;

export const recruiterWorkspaceSchema = z.object({
  employer: employerSummarySchema,
  jobs: z.array(jobPostingCardSchema),
  applications: z.array(applicationSchema),
  stages: z.array(applicationStageSchema),
  interviews: z.array(interviewSchema),
  recruiterNotes: z.array(recruiterNoteSchema),
  imports: z.array(employmentImportSchema),
  members: z.array(recruiterMemberSchema),
  activeOfferId: z.string().min(1),
  entitlements: z.record(
    z.string(),
    z.union([z.boolean(), z.number(), z.string(), z.array(z.string())]),
  ),
});
export type RecruiterWorkspace = z.infer<typeof recruiterWorkspaceSchema>;

export const employmentAdminOverviewSchema = z.object({
  catalog: employmentCatalogSchema,
  employerCounts: z.record(z.string(), z.number().int().nonnegative()),
  jobCounts: z.record(z.string(), z.number().int().nonnegative()),
  applicationCounts: z.record(z.string(), z.number().int().nonnegative()),
  importErrorCount: z.number().int().nonnegative(),
  moderationQueueCount: z.number().int().nonnegative(),
  prohibitedLanguageReviewCount: z.number().int().nonnegative(),
});
export type EmploymentAdminOverview = z.infer<
  typeof employmentAdminOverviewSchema
>;

export const prohibitedLanguageFlagSchema = z.object({
  id: z.string().min(1),
  field: z.string().min(1),
  excerpt: z.string().min(1),
  policyRuleId: z.string().min(1),
  explanation: z.string().min(1),
  neutralSuggestion: z.string().min(1),
  requiresHumanReview: z.literal(true),
  isLegalDecision: z.literal(false),
});
export type ProhibitedLanguageFlag = z.infer<
  typeof prohibitedLanguageFlagSchema
>;
