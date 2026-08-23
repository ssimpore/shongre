import type {
  CandidateProfile,
  CandidateWorkspace,
  EmploymentApplication,
  EmploymentInterview,
  EmployerSummary,
  JobPostingDetail,
  RecruiterNote,
  RecruiterWorkspace,
} from "../schemas/employment";
import { EMPLOYMENT_DEFAULT_PIPELINE_STAGES } from "./employment-catalog";

export const EMPLOYMENT_DEMO_NOW = "2026-08-22T10:00:00.000Z";
export const EMPLOYMENT_DEMO_RECRUITER_USER_ID = "user_employment_clara";

const employers: Record<string, EmployerSummary> = {
  technova: {
    id: "employer-technova",
    organizationId: "organization-technova",
    branchId: "branch-technova-lyon",
    name: "TechNova",
    slug: "technova",
    employerTypeId: "employment.fr.employer_type.company",
    description:
      "Éditeur logiciel lyonnais développant des services numériques accessibles.",
    verificationLevel: "domain_verified",
    isPubliclyVerified: true,
  },
  atelier: {
    id: "employer-atelier-vert",
    organizationId: "organization-atelier-vert",
    name: "Atelier Vert",
    slug: "atelier-vert",
    employerTypeId: "employment.fr.employer_type.small_business",
    description:
      "Petite entreprise spécialisée dans la distribution responsable.",
    verificationLevel: "manually_verified",
    isPubliclyVerified: true,
  },
  horizon: {
    id: "employer-horizon-talents",
    organizationId: "organization-horizon-talents",
    name: "Horizon Talents",
    slug: "horizon-talents",
    employerTypeId: "employment.fr.employer_type.agency",
    description:
      "Agence de recrutement généraliste avec mandats employeurs identifiés.",
    verificationLevel: "provider_verified",
    isPubliclyVerified: true,
  },
  private: {
    id: "employer-private-martin",
    name: "Famille Martin",
    slug: "famille-martin-lyon",
    employerTypeId: "employment.fr.employer_type.private",
    description:
      "Employeur particulier recrutant une aide à domicile déclarée.",
    verificationLevel: "self_declared",
    isPubliclyVerified: false,
  },
};

type JobSeed = {
  id: string;
  title: string;
  employer: EmployerSummary;
  profession: [string, string];
  industry: [string, string];
  contract: [string, string];
  arrangement: [string, string];
  workingTime: string;
  city: string;
  postalCode: string;
  salary?: [number, number, "hour" | "month" | "year"];
  daysAgo: number;
  urgent?: boolean;
  featured?: boolean;
  sponsored?: boolean;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills?: string[];
  benefits?: string[];
  accessibility?: string;
  applicationMethod?: JobPostingDetail["applicationMethod"];
  screeningQuestions?: JobPostingDetail["screeningQuestions"];
};

const isoDays = (offset: number) =>
  new Date(Date.parse(EMPLOYMENT_DEMO_NOW) + offset * 86_400_000).toISOString();

const CITY_COORDINATES: Record<string, [number, number]> = {
  Lyon: [45.764, 4.8357],
  Paris: [48.8566, 2.3522],
  Bordeaux: [44.8378, -0.5792],
  Nice: [43.7102, 7.262],
  France: [46.6034, 1.8883],
  "Saint-Priest": [45.696, 4.9447],
};

const makeJob = (seed: JobSeed): JobPostingDetail => ({
  id: seed.id,
  slug: `${seed.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${seed.id}`,
  schemaVersion: 1,
  title: seed.title,
  employer: seed.employer,
  professionId: `employment.fr.profession.${seed.profession[0]}`,
  professionLabel: seed.profession[1],
  industryId: `employment.fr.sector.${seed.industry[0]}`,
  industryLabel: seed.industry[1],
  contractTypeId: `employment.fr.contract_type.${seed.contract[0]}`,
  contractTypeLabel: seed.contract[1],
  workingArrangementId: `employment.fr.working_arrangement.${seed.arrangement[0]}`,
  workingArrangementLabel: seed.arrangement[1],
  workingTimeId: `employment.fr.work_schedule.${seed.workingTime}`,
  primaryLocation: {
    id: `location-${seed.id}`,
    label:
      seed.arrangement[0] === "remote"
        ? `Télétravail — ${seed.city}`
        : seed.city,
    city: seed.city,
    postalCode: seed.postalCode,
    countryCode: "FR",
    latitude: CITY_COORDINATES[seed.city]?.[0],
    longitude: CITY_COORDINATES[seed.city]?.[1],
    isPrimary: true,
    isPublic: true,
  },
  salary: seed.salary
    ? {
        minimum: { amountMinor: seed.salary[0], currency: "EUR" },
        maximum: { amountMinor: seed.salary[1], currency: "EUR" },
        frequencyId: `employment.fr.salary_frequency.${seed.salary[2]}`,
        presentationId: "gross",
        isPublic: true,
      }
    : undefined,
  publishedAt: isoDays(-seed.daysAgo),
  expiresAt: isoDays(30 - seed.daysAgo),
  applicationDeadline: isoDays(26 - seed.daysAgo),
  isUrgent: Boolean(seed.urgent),
  isFeatured: Boolean(seed.featured),
  isSponsored: Boolean(seed.sponsored),
  saved: seed.id === "job-react-lyon",
  lifecycle: "published",
  marketCode: "FR",
  reference: `EMP-${seed.id.toUpperCase()}`,
  positionsCount: seed.id === "job-seasonal-nice" ? 4 : 1,
  contractDuration: seed.contract[0] === "fixed_term" ? "6 mois" : undefined,
  responsibilities: seed.responsibilities,
  requiredSkillIds: seed.requiredSkills.map(
    (skill) => `employment.fr.skill.${skill}`,
  ),
  requiredSkills: seed.requiredSkills.map(
    (skill) =>
      ({
        typescript: "TypeScript",
        react: "React",
        sql: "SQL",
        figma: "Figma",
        customer_service: "Relation client",
        care_support: "Accompagnement",
      })[skill] || skill,
  ),
  preferredSkillIds: (seed.preferredSkills || []).map(
    (skill) => `employment.fr.skill.${skill}`,
  ),
  preferredSkills: seed.preferredSkills || [],
  requiredExperienceId: "employment.fr.seniority.intermediate",
  educationLevelId: "employment.fr.education_level.bachelor",
  certifications: [],
  languages: [
    {
      languageId: "fr",
      levelId: "employment.fr.language_level.professional",
      label: "Français professionnel",
    },
  ],
  workScheduleIds: [`employment.fr.work_schedule.${seed.workingTime}`],
  additionalLocations: [],
  accessibilityInformation: seed.accessibility,
  benefits: seed.benefits || [],
  trialPeriodInformation:
    seed.contract[0] === "permanent"
      ? "Selon la convention et le contrat applicables."
      : undefined,
  desiredStartDate: "2026-09-15",
  recruitmentProcess: [
    "Échange de 30 minutes",
    "Entretien avec l’équipe",
    "Réponse sous une semaine",
  ],
  employerDescription: seed.employer.description,
  applicationMethod: seed.applicationMethod || "shongre",
  externalApplicationUrl:
    seed.applicationMethod === "external"
      ? "https://careers.example.test/apply"
      : undefined,
  contactPreferences: ["messaging"],
  screeningQuestions: seed.screeningQuestions || [],
  safetyNotice:
    "Aucun paiement ne peut être demandé à un candidat pour postuler sur Shongre.",
  candidateFeeRequired: false,
});

export const EMPLOYMENT_DEMO_JOBS: JobPostingDetail[] = [
  makeJob({
    id: "job-react-lyon",
    title: "Développeur·se front-end React",
    employer: employers.technova,
    profession: ["frontend_engineer", "Développeur·se front-end"],
    industry: ["technology", "Technologie & Numérique"],
    contract: ["permanent", "Emploi permanent"],
    arrangement: ["hybrid", "Hybride"],
    workingTime: "full_time",
    city: "Lyon",
    postalCode: "69002",
    salary: [4_500_000, 5_500_000, "year"],
    daysAgo: 1,
    featured: true,
    responsibilities: [
      "Concevoir des interfaces accessibles",
      "Faire évoluer le design system",
      "Participer aux revues de code",
    ],
    requiredSkills: ["typescript", "react"],
    preferredSkills: ["figma"],
    benefits: [
      "Deux jours de télétravail",
      "Budget formation",
      "Titres-restaurant",
    ],
    accessibility:
      "Locaux accessibles et aménagement du poste possible sur demande.",
    screeningQuestions: [
      {
        id: "question-react-typescript",
        questionTypeId: "employment.fr.screening_question_type.yes_no",
        label:
          "Avez-vous déjà travaillé avec TypeScript dans un produit en production ?",
        helpText: "Une réponse négative n’entraîne pas de rejet automatique.",
        isRequired: true,
        options: ["Oui", "Non"],
        disqualifyingAnswerIds: [],
      },
      {
        id: "question-react-motivation",
        questionTypeId: "employment.fr.screening_question_type.long_text",
        label: "Quel aspect de ce poste vous motive le plus ?",
        isRequired: false,
        options: [],
        disqualifyingAnswerIds: [],
      },
    ],
  }),
  makeJob({
    id: "job-data-paris",
    title: "Data analyst commerce",
    employer: employers.technova,
    profession: ["data_analyst", "Data analyst"],
    industry: ["technology", "Technologie & Numérique"],
    contract: ["fixed_term", "Emploi à durée déterminée"],
    arrangement: ["hybrid", "Hybride"],
    workingTime: "full_time",
    city: "Paris",
    postalCode: "75011",
    salary: [3_800_000, 4_400_000, "year"],
    daysAgo: 3,
    responsibilities: [
      "Construire les tableaux de bord",
      "Documenter les indicateurs",
      "Accompagner les équipes métier",
    ],
    requiredSkills: ["sql"],
    preferredSkills: ["customer_service"],
  }),
  makeJob({
    id: "job-product-intern-bordeaux",
    title: "Stage Product design",
    employer: employers.technova,
    profession: ["product_designer", "Product designer"],
    industry: ["technology", "Technologie & Numérique"],
    contract: ["internship", "Stage"],
    arrangement: ["hybrid", "Hybride"],
    workingTime: "full_time",
    city: "Bordeaux",
    postalCode: "33000",
    salary: [80_000, 95_000, "month"],
    daysAgo: 5,
    responsibilities: [
      "Préparer des prototypes",
      "Mener des tests utilisateurs",
      "Contribuer à la bibliothèque Figma",
    ],
    requiredSkills: ["figma"],
    preferredSkills: ["customer_service"],
  }),
  makeJob({
    id: "job-sales-apprentice-lille",
    title: "Conseiller·ère de vente en alternance",
    employer: employers.atelier,
    profession: ["sales_advisor", "Conseiller·ère de vente"],
    industry: ["commerce", "Commerce & Vente"],
    contract: ["apprenticeship", "Apprentissage / alternance"],
    arrangement: ["onsite", "Sur site"],
    workingTime: "full_time",
    city: "Lille",
    postalCode: "59000",
    daysAgo: 2,
    responsibilities: [
      "Accueillir et conseiller",
      "Mettre en valeur les produits",
      "Participer au suivi des commandes",
    ],
    requiredSkills: ["customer_service"],
  }),
  makeJob({
    id: "job-seasonal-nice",
    title: "Équipier·ère polyvalent·e saisonnier",
    employer: employers.atelier,
    profession: ["sales_advisor", "Conseiller·ère de vente"],
    industry: ["hospitality", "Hôtellerie & Restauration"],
    contract: ["seasonal", "Emploi saisonnier"],
    arrangement: ["onsite", "Sur site"],
    workingTime: "weekend",
    city: "Nice",
    postalCode: "06000",
    salary: [1_250, 1_450, "hour"],
    daysAgo: 0,
    urgent: true,
    responsibilities: [
      "Préparer l’ouverture",
      "Accueillir les visiteurs",
      "Assurer le rangement de l’espace",
    ],
    requiredSkills: ["customer_service"],
  }),
  makeJob({
    id: "job-freelance-remote",
    title: "Mission Product designer senior",
    employer: employers.horizon,
    profession: ["product_designer", "Product designer"],
    industry: ["technology", "Technologie & Numérique"],
    contract: ["freelance", "Mission freelance"],
    arrangement: ["remote", "Télétravail"],
    workingTime: "full_time",
    city: "France",
    postalCode: "75000",
    salary: [55_000, 70_000, "hour"],
    daysAgo: 4,
    sponsored: true,
    responsibilities: [
      "Cadrer une refonte de parcours",
      "Animer des ateliers",
      "Livrer et documenter les composants",
    ],
    requiredSkills: ["figma"],
  }),
  makeJob({
    id: "job-private-care-lyon",
    title: "Auxiliaire de vie à temps partiel",
    employer: employers.private,
    profession: ["care_assistant", "Auxiliaire de vie"],
    industry: ["health_social", "Santé & Social"],
    contract: ["permanent", "Emploi permanent"],
    arrangement: ["onsite", "Sur site"],
    workingTime: "part_time",
    city: "Lyon",
    postalCode: "69005",
    salary: [1_450, 1_700, "hour"],
    daysAgo: 6,
    responsibilities: [
      "Accompagner les gestes du quotidien",
      "Préparer des repas simples",
      "Assurer un relais avec la famille",
    ],
    requiredSkills: ["care_support"],
    accessibility: "Logement accessible par ascenseur.",
  }),
  makeJob({
    id: "job-temp-warehouse-lyon",
    title: "Opérateur·rice logistique",
    employer: employers.horizon,
    profession: ["warehouse_operator", "Opérateur·rice logistique"],
    industry: ["transport", "Transport & Logistique"],
    contract: ["temporary", "Travail temporaire"],
    arrangement: ["onsite", "Sur site"],
    workingTime: "shift",
    city: "Saint-Priest",
    postalCode: "69800",
    salary: [1_320, 1_480, "hour"],
    daysAgo: 1,
    urgent: true,
    responsibilities: [
      "Préparer les commandes",
      "Contrôler les expéditions",
      "Appliquer les règles de sécurité",
    ],
    requiredSkills: [],
  }),
];

export const EMPLOYMENT_DEMO_CANDIDATE_PROFILE: CandidateProfile = {
  id: "candidate-thomas",
  userId: "user_thomas",
  marketCode: "FR",
  professionalTitle: "Développeur front-end React",
  summary:
    "Développeur front-end attentif à l’accessibilité, aux performances et à la qualité produit.",
  skillIds: ["employment.fr.skill.typescript", "employment.fr.skill.react"],
  experiences: [
    {
      id: "experience-1",
      title: "Développeur front-end",
      organization: "Studio Lumen",
      startsAt: "2023-01-01",
    },
  ],
  education: [
    {
      id: "education-1",
      label: "Master informatique",
      completedAt: "2022-06-30",
    },
  ],
  certifications: [],
  languages: [
    { languageId: "fr", levelId: "fluent" },
    { languageId: "en", levelId: "professional" },
  ],
  desiredProfessionIds: ["employment.fr.profession.frontend_engineer"],
  desiredContractTypeIds: ["employment.fr.contract_type.permanent"],
  preferredLocationIds: ["lyon"],
  remotePreferenceId: "employment.fr.working_arrangement.hybrid",
  salaryExpectation: {
    minimum: { amountMinor: 4_500_000, currency: "EUR" },
    frequencyId: "employment.fr.salary_frequency.year",
    presentationId: "gross",
    isPublic: false,
  },
  availabilityDate: "2026-10-01",
  professionalLinks: ["https://portfolio.example.test/thomas"],
  visibility: "applications_only",
  updatedAt: EMPLOYMENT_DEMO_NOW,
};

const application = (
  id: string,
  jobId: string,
  stageIndex: number,
  submittedAt: string,
): EmploymentApplication => {
  const stage = EMPLOYMENT_DEFAULT_PIPELINE_STAGES[stageIndex];
  return {
    id,
    jobId,
    candidateId: EMPLOYMENT_DEMO_CANDIDATE_PROFILE.id,
    cvId: "cv-thomas-2026",
    coverMessage:
      "Je souhaite contribuer à une équipe attentive à la qualité et à l’accessibilité.",
    screeningAnswers: [],
    pipelineId: "employment.pipeline.default",
    stageId: stage.id,
    systemState: stage.systemState,
    candidateVisibleStatus: stage.candidateVisibleLabel,
    assignedRecruiterIds:
      stageIndex > 0 ? [EMPLOYMENT_DEMO_RECRUITER_USER_ID] : [],
    privacyPolicyVersion: "employment-candidate-v1",
    consentRecordId: "consent-application-react",
    submittedAt,
    updatedAt: EMPLOYMENT_DEMO_NOW,
    retentionExpiresAt: "2028-08-22T10:00:00.000Z",
  };
};

export const EMPLOYMENT_DEMO_APPLICATIONS: EmploymentApplication[] = [
  application(
    "application-react",
    "job-react-lyon",
    3,
    "2026-08-20T09:30:00.000Z",
  ),
  application(
    "application-data",
    "job-data-paris",
    1,
    "2026-08-18T14:15:00.000Z",
  ),
  application(
    "application-design",
    "job-product-intern-bordeaux",
    0,
    "2026-08-21T16:45:00.000Z",
  ),
];

export const EMPLOYMENT_DEMO_INTERVIEWS: EmploymentInterview[] = [
  {
    id: "interview-react",
    applicationId: "application-react",
    modeId: "video",
    timezone: "Europe/Paris",
    startsAt: "2026-08-26T12:00:00.000Z",
    endsAt: "2026-08-26T12:45:00.000Z",
    status: "confirmed",
    privateMeetingLink: "https://meet.example.test/private/interview-react",
    participantUserIds: ["user_thomas", EMPLOYMENT_DEMO_RECRUITER_USER_ID],
    candidateMessage: "Échange avec Clara, responsable recrutement.",
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: EMPLOYMENT_DEMO_NOW,
  },
];

export const EMPLOYMENT_DEMO_RECRUITER_NOTES: RecruiterNote[] = [
  {
    id: "note-react-1",
    applicationId: "application-react",
    authorUserId: EMPLOYMENT_DEMO_RECRUITER_USER_ID,
    body: "Parcours cohérent avec le besoin. Préparer les questions accessibilité et design system.",
    visibility: "recruiters_only",
    createdAt: "2026-08-21T11:00:00.000Z",
  },
];

export const EMPLOYMENT_DEMO_CANDIDATE_WORKSPACE: CandidateWorkspace = {
  profile: EMPLOYMENT_DEMO_CANDIDATE_PROFILE,
  cvs: [
    {
      id: "cv-thomas-2026",
      candidateId: "candidate-thomas",
      label: "CV Produit & Front-end — 2026",
      fileName: "cv-thomas-laurent-2026.pdf",
      mimeType: "application/pdf",
      malwareScanStatus: "clean",
      isDefault: true,
      createdAt: "2026-07-03T08:00:00.000Z",
    },
  ],
  savedJobs: EMPLOYMENT_DEMO_JOBS.filter((job) => job.saved),
  applications: EMPLOYMENT_DEMO_APPLICATIONS.map(
    ({ screeningAnswers: _answers, ...item }) => item,
  ),
  interviews: EMPLOYMENT_DEMO_INTERVIEWS,
  consentHistory: [
    {
      id: "consent-application-react",
      subjectUserId: "user_thomas",
      purposeId: "employment.application.processing",
      policyVersion: "fr-employment-2026-08",
      status: "granted",
      grantedAt: "2026-08-20T09:29:00.000Z",
      expiresAt: "2028-08-20T09:29:00.000Z",
    },
  ],
  alerts: [
    {
      id: "alert-react-lyon",
      candidateId: "candidate-thomas",
      label: "React à Lyon ou hybride",
      query: {
        marketCode: "FR",
        keywords: "React",
        professionIds: ["employment.fr.profession.frontend_engineer"],
        jobFamilyIds: [],
        industryIds: [],
        location: "Lyon",
        workingArrangementIds: ["employment.fr.working_arrangement.hybrid"],
        contractTypeIds: [],
        workingTimeIds: [],
        experienceLevelIds: [],
        educationLevelIds: [],
        languageIds: [],
        scheduleIds: [],
        employerTypeIds: [],
        verifiedEmployerOnly: false,
        accessibilityOnly: false,
        sort: "relevance",
        limit: 24,
      },
      frequency: "daily",
      enabled: true,
      createdAt: "2026-08-01T08:00:00.000Z",
    },
  ],
};

export const EMPLOYMENT_DEMO_RECRUITER_WORKSPACE: RecruiterWorkspace = {
  employer: employers.technova,
  jobs: EMPLOYMENT_DEMO_JOBS.filter(
    (job) => job.employer.id === employers.technova.id,
  ),
  applications: EMPLOYMENT_DEMO_APPLICATIONS,
  stages: EMPLOYMENT_DEFAULT_PIPELINE_STAGES,
  interviews: EMPLOYMENT_DEMO_INTERVIEWS,
  recruiterNotes: EMPLOYMENT_DEMO_RECRUITER_NOTES,
  imports: [
    {
      id: "import-technova-json-1",
      organizationId: "organization-technova",
      sourceType: "json_api",
      sourceIdentifier: "technova-careers-v1",
      idempotencyKey: "technova-2026-08-22T0600",
      status: "completed",
      createdCount: 2,
      updatedCount: 4,
      expiredCount: 1,
      duplicateCount: 0,
      errorCount: 0,
      createdAt: "2026-08-22T06:00:00.000Z",
      completedAt: "2026-08-22T06:00:11.000Z",
    },
  ],
  members: [
    {
      id: "membership-technova-owner",
      userId: EMPLOYMENT_DEMO_RECRUITER_USER_ID,
      displayName: "Clara Martin",
      role: "recruitment_admin",
      branchIds: ["branch-technova-lyon"],
      clientEmployerIds: [],
      permissions: [
        "job.manage",
        "application.manage",
        "pipeline.manage",
        "team.manage",
      ],
      status: "active",
    },
    {
      id: "membership-technova-manager",
      userId: "user-hiring-marc",
      displayName: "Marc Legrand",
      role: "hiring_manager",
      branchIds: ["branch-technova-lyon"],
      clientEmployerIds: [],
      permissions: ["application.manage", "interview.manage"],
      status: "active",
    },
  ],
  activeOfferId: "employment.employer.growth",
  entitlements: {
    maxActiveJobs: 25,
    maxRecruiterSeats: 12,
    candidateAssignment: true,
    privateRecruiterNotes: true,
    interviewScheduling: true,
    advancedAnalytics: true,
    csvImport: true,
    apiSync: true,
  },
};
