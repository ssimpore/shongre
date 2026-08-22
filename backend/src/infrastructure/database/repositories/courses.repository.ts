import type {
  CourseCatalog,
  CourseLead,
  CourseMarketConfig,
  CourseOffer,
  CoursePublicOffer,
  CourseOrganization,
  CourseOrganizationMember,
  CourseOrganizationWorkspace,
  CoursePlan,
  CourseSubject,
  LearnerRequest,
  TutorProfile,
  TutorPublicProfile,
  TutorSearchItem,
  TutorSearchQuery,
  TutorSearchResponse,
  TutorWorkspace,
} from '@shongre/contracts/courses';
import {
  courseLeadSchema,
  courseMarketConfigSchema,
  courseOfferSchema,
  courseOrganizationSchema,
  coursePlanSchema,
  courseSubjectSchema,
  learnerRequestSchema,
  tutorProfileSchema,
} from '@shongre/contracts/courses';
import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

const NOW = '2026-08-22T10:00:00.000Z';
const FAR_FUTURE = '2027-08-22T10:00:00.000Z';

const clone = <T>(value: T): T => structuredClone(value);

export const DEFAULT_COURSE_MARKET_CONFIG: CourseMarketConfig = {
  vertical: 'tutoring',
  schemaVersion: 1,
  marketCode: 'FR',
  locale: 'fr-FR',
  currency: 'EUR',
  timezone: 'Europe/Paris',
  isEnabled: true,
  minimumMeaningfulReviewCount: 5,
  minorAgeThreshold: 18,
  learnerRequestValidityDays: 14,
  leadValidityHours: 72,
  defaultLeadCreditCost: 1,
  commissionRateBps: 1200,
  cancellationWindowHours: 24,
  featureFlags: {
    learnerRequestsEnabled: true,
    qualifiedLeadsEnabled: true,
    bookingEnabled: false,
    paymentsEnabled: false,
    payoutsEnabled: false,
    packagesEnabled: false,
    recurringLessonsEnabled: false,
  },
  taxEligibilityWording:
    "L’éligibilité éventuelle aux services à la personne dépend du statut vérifié du prestataire et des règles applicables au moment de la prestation.",
  safetyGuidance: [
    'Pour un mineur, un responsable légal reste l’interlocuteur du professeur.',
    'Pour un premier cours en présentiel, privilégiez un lieu connu et informez un proche.',
    'Conservez les échanges dans la messagerie Shongre et ne partagez pas de données sensibles.',
  ],
  updatedAt: NOW,
};

const DEFAULT_ENTITLEMENTS = {
  maxActiveOffers: 1,
  maxMonthlyLeads: 5,
  teamMembers: 1,
  locations: 1,
  visibilityCreditsMonthly: 0,
  featuredProfile: false,
  priorityPlacement: false,
  advancedAvailability: false,
  detailedAnalytics: false,
  profileMedia: false,
  introVideo: false,
  leadManagement: false,
  bookingTools: false,
  recurringPackages: false,
  bulkCourseManagement: false,
  centralLeadInbox: false,
};

export const DEFAULT_COURSE_PLANS: CoursePlan[] = [
  {
    id: 'tutor_free',
    marketCode: 'FR',
    name: 'Professeur Gratuit',
    audience: 'individual',
    description: 'Un profil public, un cours actif et les outils essentiels pour démarrer.',
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: DEFAULT_ENTITLEMENTS,
  },
  {
    id: 'tutor_pro',
    marketCode: 'FR',
    name: 'Professeur Pro',
    audience: 'individual',
    description: 'Plus de cours, un calendrier avancé et des outils de suivi des demandes.',
    monthlyPrice: { amountMinor: 1990, currency: 'EUR' },
    annualPrice: { amountMinor: 19900, currency: 'EUR' },
    taxRateBps: 2000,
    isActive: true,
    isRecommended: true,
    entitlements: {
      ...DEFAULT_ENTITLEMENTS,
      maxActiveOffers: 8,
      maxMonthlyLeads: 30,
      visibilityCreditsMonthly: 5,
      featuredProfile: true,
      advancedAvailability: true,
      detailedAnalytics: true,
      profileMedia: true,
      introVideo: true,
      leadManagement: true,
    },
  },
  {
    id: 'tutor_premium',
    marketCode: 'FR',
    name: 'Professeur Premium',
    audience: 'individual',
    description: 'Capacité renforcée, priorité encadrée et outils de fidélisation.',
    monthlyPrice: { amountMinor: 3990, currency: 'EUR' },
    annualPrice: { amountMinor: 39900, currency: 'EUR' },
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: {
      ...DEFAULT_ENTITLEMENTS,
      maxActiveOffers: 20,
      maxMonthlyLeads: 80,
      visibilityCreditsMonthly: 15,
      featuredProfile: true,
      priorityPlacement: true,
      advancedAvailability: true,
      detailedAnalytics: true,
      profileMedia: true,
      introVideo: true,
      leadManagement: true,
      bookingTools: true,
      recurringPackages: true,
    },
  },
  {
    id: 'school_organization',
    marketCode: 'FR',
    name: 'École ou organisme',
    audience: 'organization',
    description: 'Équipe, lieux, cours et demandes centralisés avec facturation unique.',
    monthlyPrice: { amountMinor: 9900, currency: 'EUR' },
    annualPrice: { amountMinor: 99000, currency: 'EUR' },
    taxRateBps: 2000,
    isActive: true,
    isRecommended: false,
    entitlements: {
      ...DEFAULT_ENTITLEMENTS,
      maxActiveOffers: 250,
      maxMonthlyLeads: 500,
      teamMembers: 25,
      locations: 10,
      visibilityCreditsMonthly: 30,
      advancedAvailability: true,
      detailedAnalytics: true,
      profileMedia: true,
      introVideo: true,
      leadManagement: true,
      bookingTools: true,
      recurringPackages: true,
      bulkCourseManagement: true,
      centralLeadInbox: true,
    },
  },
];

const LEVELS: CourseCatalog['levels'] = [
  { id: 'primary', label: 'Primaire', sortOrder: 10, isActive: true },
  { id: 'middle_school', label: 'Collège', sortOrder: 20, isActive: true },
  { id: 'high_school', label: 'Lycée', sortOrder: 30, isActive: true },
  { id: 'higher_education', label: 'Études supérieures', sortOrder: 40, isActive: true },
  { id: 'adult', label: 'Adulte / Professionnel', sortOrder: 50, isActive: true },
];

const SUBJECT_LABELS: Array<[string, string]> = [
  ['primary-support', 'Soutien scolaire primaire'],
  ['secondary-support', 'Soutien scolaire secondaire'],
  ['mathematics', 'Mathématiques'],
  ['physics-chemistry', 'Physique et chimie'],
  ['languages', 'Langues'],
  ['french', 'Français'],
  ['computer-science', 'Informatique et programmation'],
  ['data-ai', 'Data et intelligence artificielle'],
  ['music', 'Musique'],
  ['arts', 'Arts'],
  ['exam-preparation', 'Préparation aux examens'],
  ['higher-education', 'Études supérieures'],
  ['professional-skills', 'Compétences professionnelles'],
  ['sports-coaching', 'Sport et coaching'],
  ['other', 'Autres matières'],
];

const SUBJECTS: CourseCatalog['subjects'] = SUBJECT_LABELS.map(([slug, label], index) => ({
  id: `subject_${slug.replaceAll('-', '_')}`,
  slug,
  marketCode: 'FR',
  label,
  levelIds: LEVELS.map((level) => level.id),
  sortOrder: (index + 1) * 10,
  isActive: true,
}));

const QUALIFIED = {
  id: 'qualification_math_degree',
  type: 'degree' as const,
  label: 'Master MEEF Mathématiques',
  issuer: 'Université de Lyon',
  issuedYear: 2016,
  evidenceStatus: 'shongre_verified' as const,
  verificationStatus: 'verified' as const,
  verifiedAt: '2026-05-30T08:00:00.000Z',
  publicLabel: 'Diplôme vérifié par Shongre',
  publicDetailsAllowed: true,
};

const makeProfile = (
  input: Partial<TutorProfile> & Pick<TutorProfile, 'id' | 'userId' | 'slug' | 'displayName' | 'avatarUrl' | 'headline' | 'biography' | 'teachingApproach'>,
): TutorProfile => ({
  schemaVersion: 1,
  vertical: 'tutoring',
  profileType: 'individual',
  experienceYears: 5,
  subjectIds: ['subject_mathematics'],
  levelIds: ['middle_school', 'high_school'],
  languages: ['fr'],
  deliveryModes: ['online', 'in_person'],
  serviceArea: {
    marketCode: 'FR',
    cityLabel: 'Toulouse',
    postalCodePrefix: '31',
    region: 'Occitanie',
    radiusKm: 15,
    publicLocationLabel: 'Toulouse et alentours',
  },
  availabilityRules: [
    {
      id: `availability_${input.id}`,
      dayOfWeek: 6,
      startsAtLocal: '09:00',
      endsAtLocal: '18:00',
      timezone: 'Europe/Paris',
      deliveryModes: ['online', 'in_person'],
    },
  ],
  availabilityExceptions: [],
  responseTimeMinutes: 120,
  responseRatePercent: 96,
  rating: 4.9,
  reviewCount: 24,
  ratingIsStatisticallyMeaningful: true,
  mediaUrls: [],
  qualifications: [QUALIFIED],
  verifications: {
    email: 'verified',
    phone: 'verified',
    identity: 'verified',
    qualifications: 'verified',
    business: 'not_submitted',
    representative: 'not_submitted',
    payment: 'not_submitted',
    payout: 'not_submitted',
    personalServicesEligibility: 'not_submitted',
  },
  taxEligibility: {
    status: 'not_submitted',
    publicWording: 'Éligibilité services à la personne non vérifiée.',
  },
  planId: 'tutor_pro',
  moderationStatus: 'approved',
  profileCompletionPercent: 88,
  isFeatured: false,
  createdAt: '2025-09-12T08:00:00.000Z',
  updatedAt: NOW,
  ...input,
});

export const DEMO_TUTOR_PROFILES: TutorProfile[] = [
  makeProfile({
    id: 'tutor_thomas',
    userId: 'user_tutor_thomas',
    slug: 'thomas-bernard-mathematiques',
    displayName: 'Thomas Bernard',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=85',
    headline: 'Professeur de mathématiques au collège et au lycée',
    biography: 'Enseignant attentif, je construis chaque séance autour des acquis et du rythme de l’élève.',
    teachingApproach: 'Diagnostic court, explications concrètes, exercices progressifs et bilan partagé.',
    rating: 4.9,
    reviewCount: 87,
    responseTimeMinutes: 120,
    experienceYears: 5,
    isFeatured: true,
  }),
  makeProfile({
    id: 'tutor_ines',
    userId: 'user_tutor_ines',
    slug: 'ines-martin-mathematiques',
    displayName: 'Inès Martin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=85',
    headline: 'Ingénieure, cours de mathématiques en ligne',
    biography: 'J’aide les élèves à retrouver de la méthode et de la confiance sans apprendre par cœur.',
    teachingApproach: 'Exemples visuels, raisonnement guidé puis autonomie progressive.',
    deliveryModes: ['online'],
    rating: 4.8,
    reviewCount: 64,
    responseTimeMinutes: 60,
    experienceYears: 3,
    qualifications: [{ ...QUALIFIED, id: 'qualification_ines', label: 'Diplôme d’ingénieure', evidenceStatus: 'uploaded_private', verificationStatus: 'pending', publicLabel: 'Justificatif transmis, vérification en cours' }],
    verifications: { ...makeProfile({ id: 'x', userId: 'x', slug: 'x', displayName: 'x', avatarUrl: 'https://example.com/x.jpg', headline: 'x', biography: 'x', teachingApproach: 'x' }).verifications, qualifications: 'pending' },
  }),
  makeProfile({
    id: 'tutor_julien',
    userId: 'user_tutor_julien',
    slug: 'julien-robert-mathematiques-physique',
    displayName: 'Julien Robert',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=85',
    headline: 'Mathématiques et physique, préparation aux examens',
    biography: 'Professeur certifié, j’accompagne les élèves vers des objectifs mesurables et réalistes.',
    teachingApproach: 'Plan de travail partagé, annales ciblées et retours après chaque séance.',
    subjectIds: ['subject_mathematics', 'subject_physics_chemistry', 'subject_exam_preparation'],
    rating: 4.7,
    reviewCount: 112,
    responseTimeMinutes: 180,
    experienceYears: 10,
  }),
  makeProfile({
    id: 'tutor_clara',
    userId: 'user_tutor_clara',
    slug: 'clara-dubois-mathematiques',
    displayName: 'Clara Dubois',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=480&q=85',
    headline: 'Soutien en mathématiques au collège',
    biography: 'Étudiante en master, je propose des séances structurées et rassurantes.',
    teachingApproach: 'Reprise du cours, exercices gradués et fiche de synthèse.',
    levelIds: ['middle_school'],
    deliveryModes: ['in_person'],
    rating: 4.6,
    reviewCount: 3,
    ratingIsStatisticallyMeaningful: false,
    responseTimeMinutes: 90,
    experienceYears: 2,
    planId: 'tutor_free',
    qualifications: [{ ...QUALIFIED, id: 'qualification_clara', label: 'Master en cours', evidenceStatus: 'self_declared', verificationStatus: 'not_submitted', publicLabel: 'Formation déclarée par Clara' }],
    verifications: { ...makeProfile({ id: 'y', userId: 'y', slug: 'y', displayName: 'y', avatarUrl: 'https://example.com/y.jpg', headline: 'y', biography: 'y', teachingApproach: 'y' }).verifications, qualifications: 'not_submitted' },
  }),
  makeProfile({
    id: 'tutor_sophie',
    userId: 'user_tutor_sophie',
    organizationId: 'org_college_lumiere',
    profileType: 'organization_member',
    slug: 'sophie-martin-lyon',
    displayName: 'Sophie Martin',
    avatarUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=480&q=85',
    headline: 'Professeure de mathématiques à Lyon',
    biography: 'Professeure de mathématiques, je suis les collégiens et lycéens en petits groupes ou individuellement.',
    teachingApproach: 'Objectifs définis avec la famille, séance active et synthèse après le cours.',
    serviceArea: {
      marketCode: 'FR', cityLabel: 'Lyon', postalCodePrefix: '69', region: 'Auvergne-Rhône-Alpes', radiusKm: 12, publicLocationLabel: 'Lyon et proche métropole',
    },
    planId: 'school_organization',
    profileCompletionPercent: 78,
    rating: 4.9,
    reviewCount: 42,
  }),
];

const makeOffer = (tutor: TutorProfile, index: number): CourseOffer => ({
  id: `course_offer_${tutor.id}`,
  listingId: `listing_course_${tutor.id}`,
  tutorProfileId: tutor.id,
  organizationId: tutor.organizationId,
  schemaVersion: 1,
  vertical: 'tutoring',
  slug: `${tutor.slug}-cours-${index + 1}`,
  title: tutor.headline,
  description: tutor.biography,
  subjectId: tutor.subjectIds[0],
  levelIds: tutor.levelIds,
  goalIds: ['build_confidence', 'improve_grades'],
  languages: tutor.languages,
  deliveryModes: tutor.deliveryModes,
  serviceArea: tutor.serviceArea,
  pricingOptions: [
    {
      id: `price_${tutor.id}`,
      type: 'hourly',
      label: 'Cours individuel',
      price: { amountMinor: [2800, 2400, 3200, 2000, 2500][index] || 2500, currency: 'EUR' },
      durationMinutes: 60,
      isActive: true,
    },
  ],
  availabilitySummary: index % 2 === 0 ? 'Soirs et week-ends' : 'Soirs en semaine',
  trialLessonAvailable: index < 2,
  status: 'published',
  marketCodes: ['FR'],
  capacityStatus: index === 2 ? 'limited' : 'available',
  createdAt: '2026-05-10T08:00:00.000Z',
  updatedAt: NOW,
  publishedAt: '2026-05-12T08:00:00.000Z',
});

export const DEMO_COURSE_OFFERS = DEMO_TUTOR_PROFILES.map(makeOffer);

export const DEMO_LEARNER_REQUESTS: LearnerRequest[] = [
  {
    id: 'learner_request_julie', requesterUserId: 'learner_julie', marketCode: 'FR', subjectId: 'subject_mathematics', levelId: 'middle_school',
    objective: 'Reprendre les bases en mathématiques et préparer le brevet avec une méthode régulière.',
    preferredSchedule: ['mercredi_apres_midi', 'samedi_matin'], deliveryModes: ['in_person'], city: 'Lyon', radiusKm: 10,
    budgetMin: { amountMinor: 2000, currency: 'EUR' }, budgetMax: { amountMinor: 3000, currency: 'EUR' }, desiredStartDate: '2026-09-02',
    context: 'Élève de 3e motivée, quelques lacunes en calcul littéral.', learnerAgeBand: '13_15',
    guardianContact: { guardianUserId: 'learner_julie', guardianName: 'Julie Durand', relationship: 'Mère', consentConfirmedAt: NOW },
    status: 'matched', createdAt: '2026-08-20T08:24:00.000Z', expiresAt: '2026-09-03T08:24:00.000Z',
  },
  {
    id: 'learner_request_marc', requesterUserId: 'learner_marc', marketCode: 'FR', subjectId: 'subject_mathematics', levelId: 'high_school',
    objective: 'Préparer la rentrée en première et consolider les fonctions pendant les dernières semaines d’août.',
    preferredSchedule: ['soir_semaine'], deliveryModes: ['online'], city: 'Villeurbanne', radiusKm: 15,
    budgetMin: { amountMinor: 2500, currency: 'EUR' }, budgetMax: { amountMinor: 3500, currency: 'EUR' }, desiredStartDate: '2026-08-27',
    context: 'Cours en visioconférence privilégiés.', learnerAgeBand: '16_17',
    guardianContact: { guardianUserId: 'learner_marc', guardianName: 'Marc Lefèvre', relationship: 'Père', consentConfirmedAt: NOW },
    status: 'matched', createdAt: '2026-08-19T13:10:00.000Z', expiresAt: '2026-09-02T13:10:00.000Z',
  },
];

export const DEMO_COURSE_LEADS: CourseLead[] = DEMO_LEARNER_REQUESTS.map((request, index) => ({
  id: `lead_${request.id}`,
  learnerRequestId: request.id,
  tutorProfileId: 'tutor_sophie',
  organizationId: 'org_college_lumiere',
  state: index === 0 ? 'offered' : 'viewed',
  relevanceScore: index === 0 ? 0.94 : 0.88,
  relevanceReasons: ['Matière et niveau compatibles', 'Créneau compatible', 'Zone de cours compatible'],
  contactReleaseStatus: 'withheld',
  creditCost: 1,
  expiresAt: index === 0 ? '2026-08-23T10:00:00.000Z' : '2026-08-24T10:00:00.000Z',
  createdAt: index === 0 ? '2026-08-20T08:25:00.000Z' : '2026-08-19T13:12:00.000Z',
}));

export const DEMO_COURSE_ORGANIZATIONS: CourseOrganization[] = [
  {
    id: 'org_college_lumiere', marketCode: 'FR', slug: 'college-lumiere', legalName: 'Collège Lumière SAS', publicName: 'Collège Lumière',
    description: 'Organisme lyonnais de soutien scolaire en petits groupes et en cours individuels.', verificationStatus: 'verified',
    locationLabels: ['Lyon 3e', 'Villeurbanne'], memberCount: 8, activeOfferCount: 18, planId: 'school_organization', createdAt: '2024-04-12T08:00:00.000Z',
  },
];

const DEMO_COURSE_ORGANIZATION_MEMBERS: CourseOrganizationMember[] = [
  {
    id: 'course_member_owner', organizationId: 'org_college_lumiere', userId: 'user_tutor_sophie', tutorProfileId: 'tutor_sophie',
    displayName: 'Sophie Martin', role: 'owner', permissions: ['team.manage', 'courses.manage', 'leads.manage', 'billing.manage'], status: 'active',
  },
  {
    id: 'course_member_tutor_1', organizationId: 'org_college_lumiere', userId: 'user_course_member_1',
    displayName: 'Alexandre Morel', role: 'tutor', permissions: ['courses.manage.own', 'leads.respond.own'], status: 'active',
  },
  {
    id: 'course_member_coordinator', organizationId: 'org_college_lumiere', userId: 'user_course_coordinator',
    displayName: 'Nadia Benali', role: 'lead_coordinator', permissions: ['leads.manage'], status: 'active',
  },
];

export const DEFAULT_COURSE_CATALOG: CourseCatalog = {
  config: DEFAULT_COURSE_MARKET_CONFIG,
  subjects: SUBJECTS,
  levels: LEVELS,
  plans: DEFAULT_COURSE_PLANS,
  addOns: [
    { id: 'addon_featured_subject', marketCode: 'FR', type: 'featured_subject', name: 'Mise en avant matière', price: { amountMinor: 990, currency: 'EUR' }, validityDays: 7, isActive: true },
    { id: 'addon_local_spotlight', marketCode: 'FR', type: 'local_spotlight', name: 'Visibilité locale', price: { amountMinor: 790, currency: 'EUR' }, validityDays: 7, isActive: true },
    { id: 'addon_search_bump', marketCode: 'FR', type: 'search_bump', name: 'Remonter le profil', price: { amountMinor: 390, currency: 'EUR' }, validityDays: 1, isActive: true },
    { id: 'addon_qualified_lead', marketCode: 'FR', type: 'qualified_lead', name: 'Crédit demande qualifiée', price: { amountMinor: 250, currency: 'EUR' }, creditQuantity: 1, isActive: true },
    { id: 'addon_verification', marketCode: 'FR', type: 'profile_verification', name: 'Vérification de justificatif', price: { amountMinor: 1200, currency: 'EUR' }, isActive: true },
  ],
};

export interface ICoursesRepository {
  getCatalog(marketCode: string, includeInactive?: boolean): Promise<CourseCatalog>;
  saveMarketConfig(marketCode: string, config: CourseMarketConfig): Promise<CourseMarketConfig>;
  saveSubject(subject: CourseSubject): Promise<CourseSubject>;
  savePlan(plan: CoursePlan): Promise<CoursePlan>;
  searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse>;
  getTutorProfile(idOrSlug: string): Promise<TutorProfile | null>;
  saveTutorProfile(profile: TutorProfile): Promise<TutorProfile>;
  getCourseOffers(tutorProfileId: string): Promise<CourseOffer[]>;
  saveCourseOffer(offer: CourseOffer): Promise<CourseOffer>;
  createLearnerRequest(request: LearnerRequest): Promise<LearnerRequest>;
  getLearnerRequest(id: string): Promise<LearnerRequest | null>;
  getTutorLeads(tutorProfileId: string): Promise<CourseLead[]>;
  saveLead(lead: CourseLead): Promise<CourseLead>;
  getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace | null>;
  getOrganization(idOrSlug: string): Promise<CourseOrganization | null>;
  getOrganizationWorkspace(organizationId: string): Promise<CourseOrganizationWorkspace | null>;
}

function matchesTutor(query: TutorSearchQuery, tutor: TutorProfile, offer: CourseOffer): boolean {
  if (query.subjectId && offer.subjectId !== query.subjectId) return false;
  if (query.levelIds?.length && !query.levelIds.some((level) => offer.levelIds.includes(level))) return false;
  if (query.deliveryModes?.length && !query.deliveryModes.some((mode) => offer.deliveryModes.includes(mode))) return false;
  if (query.languages?.length && !query.languages.some((language) => offer.languages.includes(language))) return false;
  if (query.city && !tutor.serviceArea?.cityLabel.toLowerCase().includes(query.city.toLowerCase())) return false;
  if (query.verifiedOnly && tutor.verifications.identity !== 'verified') return false;
  if (query.minRating && (!tutor.ratingIsStatisticallyMeaningful || (tutor.rating || 0) < query.minRating)) return false;
  const hourly = offer.pricingOptions.find((price) => price.type === 'hourly')?.price.amountMinor || 0;
  if (query.minPriceMinor !== undefined && hourly < query.minPriceMinor) return false;
  if (query.maxPriceMinor !== undefined && hourly > query.maxPriceMinor) return false;
  if (query.tutorType === 'individual' && tutor.profileType !== 'individual') return false;
  if (query.tutorType === 'organization' && !tutor.organizationId) return false;
  if (query.query) {
    const haystack = `${tutor.displayName} ${tutor.headline} ${offer.title} ${offer.description}`.toLowerCase();
    if (!haystack.includes(query.query.toLowerCase())) return false;
  }
  return true;
}

function relevanceScore(query: TutorSearchQuery, tutor: TutorProfile, offer: CourseOffer): number {
  let score = 0.35;
  if (!query.subjectId || offer.subjectId === query.subjectId) score += 0.25;
  if (!query.levelIds?.length || query.levelIds.some((level) => offer.levelIds.includes(level))) score += 0.15;
  if (!query.deliveryModes?.length || query.deliveryModes.some((mode) => offer.deliveryModes.includes(mode))) score += 0.1;
  if (!query.city || tutor.serviceArea?.cityLabel.toLowerCase().includes(query.city.toLowerCase())) score += 0.08;
  if (offer.capacityStatus === 'available') score += 0.04;
  // Paid visibility is deliberately capped: relevance, availability and safety
  // remain the overwhelming ranking inputs.
  if (tutor.isFeatured) score += 0.03;
  return Math.min(1, score);
}

function toPublicTutor(tutor: TutorProfile): TutorPublicProfile {
  const {
    userId: _userId,
    availabilityRules: _availabilityRules,
    availabilityExceptions: _availabilityExceptions,
    planId: _planId,
    moderationStatus: _moderationStatus,
    profileCompletionPercent: _profileCompletionPercent,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...publicTutor
  } = tutor;
  return {
    ...publicTutor,
    qualifications: publicTutor.qualifications.map((qualification) => ({
      ...qualification,
      issuer: qualification.publicDetailsAllowed ? qualification.issuer : undefined,
    })),
    serviceArea: publicTutor.serviceArea
      ? (({ latitude: _latitude, longitude: _longitude, postalCodePrefix: _postalCodePrefix, ...publicArea }) => publicArea)(publicTutor.serviceArea)
      : undefined,
  };
}

function toPublicOffer(offer: CourseOffer): CoursePublicOffer {
  const { moderationReason: _moderationReason, ...publicOffer } = offer;
  return publicOffer;
}

function toSearchItem(tutor: TutorProfile, offer: CourseOffer): TutorSearchItem {
  const subject = SUBJECTS.find((item) => item.id === offer.subjectId);
  const fromPrice = offer.pricingOptions
    .filter((price) => price.isActive)
    .sort((a, b) => a.price.amountMinor - b.price.amountMinor)[0]?.price || { amountMinor: 0, currency: 'EUR' };
  return {
    tutor: clone(toPublicTutor(tutor)), offer: clone(toPublicOffer(offer)), subjectLabel: subject?.label || offer.subjectId,
    levelLabels: offer.levelIds.map((id) => LEVELS.find((level) => level.id === id)?.label || id), fromPrice,
    distanceKm: tutor.serviceArea?.cityLabel === 'Toulouse' ? Number((3 + DEMO_TUTOR_PROFILES.indexOf(tutor) * 1.7).toFixed(1)) : undefined,
    relevanceReasons: ['Matière et niveau compatibles', offer.availabilitySummary, tutor.verifications.identity === 'verified' ? 'Identité vérifiée' : 'Identité non vérifiée'],
    isSaved: false,
  };
}

export class DemoCoursesRepository implements ICoursesRepository {
  private catalog = clone(DEFAULT_COURSE_CATALOG);
  private tutors = new Map(DEMO_TUTOR_PROFILES.map((item) => [item.id, clone(item)]));
  private offers = new Map(DEMO_COURSE_OFFERS.map((item) => [item.id, clone(item)]));
  private requests = new Map(DEMO_LEARNER_REQUESTS.map((item) => [item.id, clone(item)]));
  private leads = new Map(DEMO_COURSE_LEADS.map((item) => [item.id, clone(item)]));

  async getCatalog(marketCode: string, includeInactive = false): Promise<CourseCatalog> {
    const catalog = clone({ ...this.catalog, config: { ...this.catalog.config, marketCode: marketCode.toUpperCase() } });
    if (includeInactive) return catalog;
    return {
      ...catalog,
      subjects: catalog.subjects.filter((subject) => subject.isActive),
      levels: catalog.levels.filter((level) => level.isActive),
      plans: catalog.plans.filter((plan) => plan.isActive),
      addOns: catalog.addOns.filter((addOn) => addOn.isActive),
    };
  }

  async saveMarketConfig(marketCode: string, config: CourseMarketConfig): Promise<CourseMarketConfig> {
    const next = courseMarketConfigSchema.parse({ ...config, marketCode: marketCode.toUpperCase(), updatedAt: new Date().toISOString() });
    this.catalog.config = next;
    return clone(next);
  }

  async saveSubject(subject: CourseSubject): Promise<CourseSubject> {
    const parsed = courseSubjectSchema.parse(subject);
    const index = this.catalog.subjects.findIndex((item) => item.id === parsed.id);
    if (index < 0) throw new Error('Course subject not found');
    this.catalog.subjects[index] = clone(parsed);
    return clone(parsed);
  }

  async savePlan(plan: CoursePlan): Promise<CoursePlan> {
    const parsed = coursePlanSchema.parse(plan);
    const index = this.catalog.plans.findIndex((item) => item.id === parsed.id);
    if (index < 0) throw new Error('Course plan not found');
    this.catalog.plans[index] = clone(parsed);
    return clone(parsed);
  }

  async searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse> {
    let matched = Array.from(this.offers.values())
      .filter((offer) => offer.status === 'published')
      .map((offer) => ({ offer, tutor: this.tutors.get(offer.tutorProfileId) }))
      .filter((pair): pair is { offer: CourseOffer; tutor: TutorProfile } => Boolean(pair.tutor))
      .filter(({ tutor, offer }) => matchesTutor(query, tutor, offer));
    matched.sort((a, b) => {
      if (query.sort === 'price_asc') return toSearchItem(a.tutor, a.offer).fromPrice.amountMinor - toSearchItem(b.tutor, b.offer).fromPrice.amountMinor;
      if (query.sort === 'price_desc') return toSearchItem(b.tutor, b.offer).fromPrice.amountMinor - toSearchItem(a.tutor, a.offer).fromPrice.amountMinor;
      if (query.sort === 'rating') return (b.tutor.rating || 0) - (a.tutor.rating || 0);
      if (query.sort === 'response_time') return (a.tutor.responseTimeMinutes || Infinity) - (b.tutor.responseTimeMinutes || Infinity);
      return relevanceScore(query, b.tutor, b.offer) - relevanceScore(query, a.tutor, a.offer);
    });
    const limit = Math.min(50, query.limit || 20);
    const offset = query.cursor ? Math.max(0, Number(query.cursor) || 0) : 0;
    const page = matched.slice(offset, offset + limit);
    return {
      items: page.map(({ tutor, offer }) => toSearchItem(tutor, offer)),
      total: matched.length,
      pageInfo: { hasNextPage: offset + limit < matched.length, nextCursor: offset + limit < matched.length ? String(offset + limit) : undefined },
    };
  }

  async getTutorProfile(idOrSlug: string): Promise<TutorProfile | null> {
    const tutor = this.tutors.get(idOrSlug) || Array.from(this.tutors.values()).find((item) => item.slug === idOrSlug);
    return tutor ? clone(tutor) : null;
  }

  async saveTutorProfile(profile: TutorProfile): Promise<TutorProfile> {
    const parsed = tutorProfileSchema.parse(profile);
    this.tutors.set(parsed.id, clone(parsed));
    return clone(parsed);
  }

  async getCourseOffers(tutorProfileId: string): Promise<CourseOffer[]> {
    return Array.from(this.offers.values()).filter((offer) => offer.tutorProfileId === tutorProfileId).map(clone);
  }

  async saveCourseOffer(offer: CourseOffer): Promise<CourseOffer> {
    const parsed = courseOfferSchema.parse(offer);
    this.offers.set(parsed.id, clone(parsed));
    return clone(parsed);
  }

  async createLearnerRequest(request: LearnerRequest): Promise<LearnerRequest> {
    const parsed = learnerRequestSchema.parse(request);
    this.requests.set(parsed.id, clone(parsed));
    return clone(parsed);
  }

  async getLearnerRequest(id: string): Promise<LearnerRequest | null> {
    const request = this.requests.get(id);
    return request ? clone(request) : null;
  }

  async getTutorLeads(tutorProfileId: string): Promise<CourseLead[]> {
    return Array.from(this.leads.values()).filter((lead) => lead.tutorProfileId === tutorProfileId).map(clone);
  }

  async saveLead(lead: CourseLead): Promise<CourseLead> {
    const parsed = courseLeadSchema.parse(lead);
    this.leads.set(parsed.id, clone(parsed));
    return clone(parsed);
  }

  async getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace | null> {
    const tutor = await this.getTutorProfile(tutorProfileId);
    if (!tutor) return null;
    const plan = this.catalog.plans.find((item) => item.id === tutor.planId) || this.catalog.plans[0];
    return {
      tutor,
      offers: await this.getCourseOffers(tutor.id),
      leads: await this.getTutorLeads(tutor.id),
      learnerRequests: clone(DEMO_LEARNER_REQUESTS),
      plan: clone(plan),
      creditsRemaining: tutor.planId === 'school_organization' ? 18 : tutor.planId === 'tutor_pro' ? 4 : 0,
      analytics: {
        period: 'last_30_days', profileViews: tutor.id === 'tutor_sophie' ? 142 : 48, requestsReceived: tutor.id === 'tutor_sophie' ? 9 : 3,
        acceptedLeads: tutor.id === 'tutor_sophie' ? 4 : 1, medianResponseMinutes: tutor.responseTimeMinutes, contactConversionRate: tutor.id === 'tutor_sophie' ? 0.27 : undefined,
      },
      featureFlags: clone(this.catalog.config.featureFlags),
    };
  }

  async getOrganization(idOrSlug: string): Promise<CourseOrganization | null> {
    const organization = DEMO_COURSE_ORGANIZATIONS.find((item) => item.id === idOrSlug || item.slug === idOrSlug);
    return organization ? clone(organization) : null;
  }

  async getOrganizationWorkspace(organizationId: string): Promise<CourseOrganizationWorkspace | null> {
    const organization = await this.getOrganization(organizationId);
    if (!organization) return null;
    const plan = this.catalog.plans.find((item) => item.id === organization.planId) || this.catalog.plans[0];
    return clone({
      organization,
      members: DEMO_COURSE_ORGANIZATION_MEMBERS.filter((member) => member.organizationId === organization.id),
      plan,
      featureFlags: this.catalog.config.featureFlags,
      locations: [
        { id: 'location_lyon_3', label: 'Lyon 3e', isActive: true, activeTutorCount: 6 },
        { id: 'location_villeurbanne', label: 'Villeurbanne', isActive: true, activeTutorCount: 4 },
      ],
      analytics: { period: 'last_30_days', profileViews: 1834, leadsReceived: 126, leadsAccepted: 84, activeTutors: 8 },
    });
  }
}

export class PostgresCoursesRepository implements ICoursesRepository {
  async getCatalog(marketCode: string, includeInactive = false): Promise<CourseCatalog> {
    const supabase = getSupabaseAdminClient() as any;
    const active = (query: any) => includeInactive ? query : query.eq('is_active', true);
    const [configResult, subjectsResult, levelsResult, plansResult, addOnsResult] = await Promise.all([
      supabase.from('course_market_configs').select('config_payload').eq('market_code', marketCode).maybeSingle(),
      active(supabase.from('course_subjects').select('public_payload').eq('market_code', marketCode)).order('sort_order'),
      active(supabase.from('course_subject_levels').select('public_payload').eq('market_code', marketCode)).order('sort_order'),
      active(supabase.from('course_plans').select('public_payload').eq('market_code', marketCode)).order('sort_order'),
      active(supabase.from('course_add_ons').select('public_payload').eq('market_code', marketCode)).order('sort_order'),
    ]);
    if (configResult.error) throw configResult.error;
    return {
      config: courseMarketConfigSchema.parse(configResult.data?.config_payload),
      subjects: (subjectsResult.data || []).map((row: any) => row.public_payload),
      levels: (levelsResult.data || []).map((row: any) => row.public_payload),
      plans: (plansResult.data || []).map((row: any) => coursePlanSchema.parse(row.public_payload)),
      addOns: (addOnsResult.data || []).map((row: any) => row.public_payload),
    };
  }

  async saveMarketConfig(marketCode: string, config: CourseMarketConfig): Promise<CourseMarketConfig> {
    const parsed = courseMarketConfigSchema.parse({ ...config, marketCode, updatedAt: new Date().toISOString() });
    const { error } = await (getSupabaseAdminClient() as any).from('course_market_configs').upsert({
      market_code: marketCode, schema_version: parsed.schemaVersion, is_enabled: parsed.isEnabled,
      booking_enabled: parsed.featureFlags.bookingEnabled, payments_enabled: parsed.featureFlags.paymentsEnabled,
      config_payload: parsed, updated_at: parsed.updatedAt,
    }, { onConflict: 'market_code' });
    if (error) throw error;
    return parsed;
  }

  async saveSubject(subject: CourseSubject): Promise<CourseSubject> {
    const parsed = courseSubjectSchema.parse(subject);
    const supabase = getSupabaseAdminClient() as any;
    const { error } = await supabase.from('course_subjects').update({
      label: parsed.label,
      is_active: parsed.isActive,
      public_payload: parsed,
      updated_at: new Date().toISOString(),
    }).eq('id', parsed.id).eq('market_code', parsed.marketCode);
    if (error) throw error;
    await supabase.from('course_subject_allowed_levels').delete().eq('subject_id', parsed.id);
    if (parsed.levelIds.length) {
      const { error: levelsError } = await supabase.from('course_subject_allowed_levels').insert(
        parsed.levelIds.map((levelId) => ({ subject_id: parsed.id, level_id: levelId, market_code: parsed.marketCode })),
      );
      if (levelsError) throw levelsError;
    }
    return parsed;
  }

  async savePlan(plan: CoursePlan): Promise<CoursePlan> {
    const parsed = coursePlanSchema.parse(plan);
    const { error } = await (getSupabaseAdminClient() as any).from('course_plans').update({
      name: parsed.name,
      is_active: parsed.isActive,
      monthly_price_minor: parsed.monthlyPrice?.amountMinor ?? null,
      annual_price_minor: parsed.annualPrice?.amountMinor ?? null,
      currency: parsed.monthlyPrice?.currency || parsed.annualPrice?.currency || 'EUR',
      entitlements: parsed.entitlements,
      public_payload: parsed,
      updated_at: new Date().toISOString(),
    }).eq('id', parsed.id).eq('market_code', parsed.marketCode);
    if (error) throw error;
    return parsed;
  }

  async searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse> {
    const supabase = getSupabaseAdminClient() as any;
    const limit = Math.min(50, query.limit || 20);
    const offset = query.cursor ? Math.max(0, Number(query.cursor) || 0) : 0;
    let request = supabase.from('course_tutor_search_view').select('*', { count: 'exact' }).contains('market_codes', [query.marketCode]).eq('offer_status', 'published');
    if (query.subjectId) request = request.eq('subject_id', query.subjectId);
    if (query.levelIds?.length) request = request.overlaps('level_ids', query.levelIds);
    if (query.deliveryModes?.length) request = request.overlaps('delivery_modes', query.deliveryModes);
    if (query.city) request = request.ilike('city_label', `%${query.city}%`);
    if (query.verifiedOnly) request = request.eq('identity_verified', true);
    if (query.minPriceMinor !== undefined) request = request.gte('from_price_minor', query.minPriceMinor);
    if (query.maxPriceMinor !== undefined) request = request.lte('from_price_minor', query.maxPriceMinor);
    if (query.query) request = request.textSearch('search_vector', query.query, { type: 'websearch', config: 'french' });
    request = request.order(query.sort === 'price_asc' || query.sort === 'price_desc' ? 'from_price_minor' : 'relevance_baseline', { ascending: query.sort === 'price_asc' }).range(offset, offset + limit - 1);
    const { data, count, error } = await request;
    if (error) throw error;
    const items = (data || []).map((row: any) => ({
      tutor: toPublicTutor(tutorProfileSchema.parse(row.tutor_payload)), offer: toPublicOffer(courseOfferSchema.parse(row.offer_payload)),
      subjectLabel: row.subject_label, levelLabels: row.level_labels || [], fromPrice: { amountMinor: Number(row.from_price_minor), currency: row.currency },
      distanceKm: row.distance_km === null ? undefined : Number(row.distance_km), relevanceReasons: row.relevance_reasons || [], isSaved: false,
    }));
    const total = count || 0;
    return { items, total, pageInfo: { hasNextPage: offset + limit < total, nextCursor: offset + limit < total ? String(offset + limit) : undefined } };
  }

  async getTutorProfile(idOrSlug: string): Promise<TutorProfile | null> {
    const supabase = getSupabaseAdminClient() as any;
    let { data, error } = await supabase.from('course_tutor_profiles').select('private_payload').eq('id', idOrSlug).maybeSingle();
    if (!data && !error) ({ data, error } = await supabase.from('course_tutor_profiles').select('private_payload').eq('slug', idOrSlug).maybeSingle());
    if (error) throw error;
    return data ? tutorProfileSchema.parse(data.private_payload) : null;
  }

  async saveTutorProfile(profile: TutorProfile): Promise<TutorProfile> {
    const parsed = tutorProfileSchema.parse(profile);
    const supabase = getSupabaseAdminClient() as any;
    const publicProfile = toPublicTutor(parsed);
    const marketCode = parsed.serviceArea?.marketCode || 'FR';
    const { error } = await supabase.from('course_tutor_profiles').upsert({
      id: parsed.id, user_id: parsed.userId, organization_id: parsed.organizationId || null, schema_version: parsed.schemaVersion,
      market_code: marketCode, slug: parsed.slug, profile_type: parsed.profileType, headline: parsed.headline,
      biography: parsed.biography, teaching_approach: parsed.teachingApproach, experience_years: parsed.experienceYears,
      moderation_status: parsed.moderationStatus, profile_completion_percent: parsed.profileCompletionPercent,
      plan_id: parsed.planId, response_time_minutes: parsed.responseTimeMinutes, response_rate_percent: parsed.responseRatePercent,
      rating: parsed.rating, review_count: parsed.reviewCount, rating_is_statistically_meaningful: parsed.ratingIsStatisticallyMeaningful,
      is_featured: parsed.isFeatured, public_payload: publicProfile, private_payload: parsed, updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    await Promise.all([
      supabase.from('course_tutor_subjects').delete().eq('tutor_profile_id', parsed.id),
      supabase.from('course_tutor_levels').delete().eq('tutor_profile_id', parsed.id),
      supabase.from('course_tutor_languages').delete().eq('tutor_profile_id', parsed.id),
      supabase.from('course_tutor_delivery_modes').delete().eq('tutor_profile_id', parsed.id),
    ]);
    await Promise.all([
      parsed.subjectIds.length ? supabase.from('course_tutor_subjects').insert(parsed.subjectIds.map((subjectId) => ({ tutor_profile_id: parsed.id, subject_id: subjectId, market_code: marketCode }))) : Promise.resolve(),
      parsed.levelIds.length ? supabase.from('course_tutor_levels').insert(parsed.levelIds.map((levelId) => ({ tutor_profile_id: parsed.id, level_id: levelId, market_code: marketCode }))) : Promise.resolve(),
      parsed.languages.length ? supabase.from('course_tutor_languages').insert(parsed.languages.map((languageCode) => ({ tutor_profile_id: parsed.id, language_code: languageCode, proficiency: 'teaching' }))) : Promise.resolve(),
      parsed.deliveryModes.length ? supabase.from('course_tutor_delivery_modes').insert(parsed.deliveryModes.map((deliveryMode) => ({ tutor_profile_id: parsed.id, delivery_mode: deliveryMode }))) : Promise.resolve(),
    ]);
    if (parsed.serviceArea) {
      await supabase.from('course_service_areas').delete().eq('tutor_profile_id', parsed.id);
      await supabase.from('course_service_areas').insert({
        tutor_profile_id: parsed.id, organization_id: null, market_code: marketCode,
        city_label: parsed.serviceArea.cityLabel, postal_code_prefix: parsed.serviceArea.postalCodePrefix,
        region: parsed.serviceArea.region, center_latitude: parsed.serviceArea.latitude,
        center_longitude: parsed.serviceArea.longitude, radius_km: parsed.serviceArea.radiusKm,
        public_location_label: parsed.serviceArea.publicLocationLabel, updated_at: parsed.updatedAt,
      });
    }
    return parsed;
  }

  async getCourseOffers(tutorProfileId: string): Promise<CourseOffer[]> {
    const { data, error } = await (getSupabaseAdminClient() as any).from('course_offers').select('private_payload').eq('tutor_profile_id', tutorProfileId).order('created_at');
    if (error) throw error;
    return (data || []).map((row: any) => courseOfferSchema.parse(row.private_payload));
  }

  async saveCourseOffer(offer: CourseOffer): Promise<CourseOffer> {
    const parsed = courseOfferSchema.parse(offer);
    const hourly = parsed.pricingOptions.find((item) => item.type === 'hourly');
    const supabase = getSupabaseAdminClient() as any;
    const marketCode = parsed.marketCodes[0];
    const { error } = await supabase.from('course_offers').upsert({
      id: parsed.id, listing_id: parsed.listingId || null, tutor_profile_id: parsed.tutorProfileId, organization_id: parsed.organizationId || null,
      schema_version: parsed.schemaVersion, slug: parsed.slug, title: parsed.title, description: parsed.description,
      subject_id: parsed.subjectId, market_code: marketCode, status: parsed.status, capacity_status: parsed.capacityStatus,
      trial_lesson_available: parsed.trialLessonAvailable, from_price_minor: hourly?.price.amountMinor || 0,
      currency: hourly?.price.currency || 'EUR', public_payload: toPublicOffer(parsed), private_payload: parsed,
      published_at: parsed.publishedAt, updated_at: parsed.updatedAt,
    });
    if (error) throw error;
    await Promise.all([
      supabase.from('course_offer_levels').delete().eq('course_offer_id', parsed.id),
      supabase.from('course_offer_delivery_modes').delete().eq('course_offer_id', parsed.id),
      supabase.from('course_offer_languages').delete().eq('course_offer_id', parsed.id),
      supabase.from('course_pricing_options').delete().eq('course_offer_id', parsed.id),
    ]);
    await Promise.all([
      supabase.from('course_offer_levels').insert(parsed.levelIds.map((levelId) => ({ course_offer_id: parsed.id, level_id: levelId, market_code: marketCode }))),
      supabase.from('course_offer_delivery_modes').insert(parsed.deliveryModes.map((deliveryMode) => ({ course_offer_id: parsed.id, delivery_mode: deliveryMode }))),
      supabase.from('course_offer_languages').insert(parsed.languages.map((languageCode) => ({ course_offer_id: parsed.id, language_code: languageCode }))),
      supabase.from('course_pricing_options').insert(parsed.pricingOptions.map((price) => ({
        id: price.id, course_offer_id: parsed.id, type: price.type, label: price.label,
        price_minor: price.price.amountMinor, currency: price.price.currency, duration_minutes: price.durationMinutes,
        lesson_count: price.lessonCount || null, is_active: price.isActive,
      }))),
    ]);
    if (parsed.listingId) {
      await supabase.from('listings').update({ vertical_type: 'tutoring', vertical_entity_id: parsed.id, vertical_schema_version: parsed.schemaVersion }).eq('id', parsed.listingId);
    }
    return parsed;
  }

  async createLearnerRequest(request: LearnerRequest): Promise<LearnerRequest> {
    const parsed = learnerRequestSchema.parse(request);
    const { error } = await (getSupabaseAdminClient() as any).from('course_learner_requests').insert({
      id: parsed.id, requester_user_id: parsed.requesterUserId || null, market_code: parsed.marketCode, subject_id: parsed.subjectId,
      level_id: parsed.levelId, objective: parsed.objective, delivery_modes: parsed.deliveryModes,
      preferred_schedule: parsed.preferredSchedule, city: parsed.city, radius_km: parsed.radiusKm,
      budget_min_minor: parsed.budgetMin?.amountMinor, budget_max_minor: parsed.budgetMax?.amountMinor,
      currency: parsed.budgetMin?.currency || parsed.budgetMax?.currency, desired_start_date: parsed.desiredStartDate,
      learner_age_band: parsed.learnerAgeBand, guardian_user_id: parsed.guardianContact?.guardianUserId,
      guardian_consent_confirmed_at: parsed.guardianContact?.consentConfirmedAt,
      status: parsed.status, private_payload: parsed, expires_at: parsed.expiresAt,
    });
    if (error) throw error;
    return parsed;
  }

  async getLearnerRequest(id: string): Promise<LearnerRequest | null> {
    const { data, error } = await (getSupabaseAdminClient() as any).from('course_learner_requests').select('private_payload').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? learnerRequestSchema.parse(data.private_payload) : null;
  }

  async getTutorLeads(tutorProfileId: string): Promise<CourseLead[]> {
    const { data, error } = await (getSupabaseAdminClient() as any).from('course_leads').select('private_payload').eq('tutor_profile_id', tutorProfileId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => courseLeadSchema.parse(row.private_payload));
  }

  async saveLead(lead: CourseLead): Promise<CourseLead> {
    const parsed = courseLeadSchema.parse(lead);
    const { error } = await (getSupabaseAdminClient() as any).from('course_leads').upsert({
      id: parsed.id, learner_request_id: parsed.learnerRequestId, tutor_profile_id: parsed.tutorProfileId, organization_id: parsed.organizationId || null,
      state: parsed.state, relevance_score: parsed.relevanceScore, relevance_reasons: parsed.relevanceReasons,
      contact_release_status: parsed.contactReleaseStatus, credit_cost: parsed.creditCost,
      decline_reason: parsed.declineReason, credit_restored_at: parsed.creditRestoredAt,
      expires_at: parsed.expiresAt, responded_at: parsed.respondedAt, private_payload: parsed,
    });
    if (error) throw error;
    return parsed;
  }

  async getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace | null> {
    const tutor = await this.getTutorProfile(tutorProfileId);
    if (!tutor) return null;
    const [catalog, offers, leads] = await Promise.all([this.getCatalog(tutor.serviceArea?.marketCode || 'FR'), this.getCourseOffers(tutor.id), this.getTutorLeads(tutor.id)]);
    return {
      tutor, offers, leads, learnerRequests: [], plan: catalog.plans.find((plan) => plan.id === tutor.planId) || catalog.plans[0], creditsRemaining: 0,
      analytics: { period: 'last_30_days', profileViews: 0, requestsReceived: leads.length, acceptedLeads: leads.filter((lead) => lead.state === 'accepted').length, medianResponseMinutes: tutor.responseTimeMinutes },
      featureFlags: catalog.config.featureFlags,
    };
  }

  async getOrganization(idOrSlug: string): Promise<CourseOrganization | null> {
    const supabase = getSupabaseAdminClient() as any;
    let { data, error } = await supabase.from('course_organizations').select('public_payload').eq('id', idOrSlug).maybeSingle();
    if (!data && !error) ({ data, error } = await supabase.from('course_organizations').select('public_payload').eq('slug', idOrSlug).maybeSingle());
    if (error) throw error;
    return data ? courseOrganizationSchema.parse(data.public_payload) : null;
  }

  async getOrganizationWorkspace(organizationId: string): Promise<CourseOrganizationWorkspace | null> {
    const organization = await this.getOrganization(organizationId);
    if (!organization) return null;
    const supabase = getSupabaseAdminClient() as any;
    const [catalog, membersResult, tutorsResult, locationsResult, leadsResult] = await Promise.all([
      this.getCatalog(organization.marketCode),
      supabase.from('course_organization_members').select('id, organization_id, user_id, role, permissions, status').eq('organization_id', organization.id),
      supabase.from('course_tutor_profiles').select('id, user_id, public_payload').eq('organization_id', organization.id),
      supabase.from('course_service_areas').select('id, public_location_label').eq('organization_id', organization.id),
      supabase.from('course_leads').select('state', { count: 'exact' }).eq('organization_id', organization.id),
    ]);
    if (membersResult.error) throw membersResult.error;
    const tutors = tutorsResult.data || [];
    const members: CourseOrganizationMember[] = (membersResult.data || []).map((row: any) => {
      const tutor = tutors.find((item: any) => item.user_id === row.user_id);
      return {
        id: row.id,
        organizationId: row.organization_id,
        userId: row.user_id,
        tutorProfileId: tutor?.id,
        displayName: tutor?.public_payload?.displayName || 'Membre de l’équipe',
        role: row.role,
        permissions: row.permissions || [],
        status: row.status,
      };
    });
    const leads = leadsResult.data || [];
    return {
      organization,
      members,
      plan: catalog.plans.find((plan) => plan.id === organization.planId) || catalog.plans[0],
      featureFlags: catalog.config.featureFlags,
      locations: (locationsResult.data || []).map((row: any) => ({
        id: row.id,
        label: row.public_location_label,
        isActive: true,
        activeTutorCount: tutors.length,
      })),
      analytics: {
        period: 'last_30_days',
        profileViews: 0,
        leadsReceived: leadsResult.count || leads.length,
        leadsAccepted: leads.filter((lead: any) => lead.state === 'accepted').length,
        activeTutors: tutors.length,
      },
    };
  }
}
