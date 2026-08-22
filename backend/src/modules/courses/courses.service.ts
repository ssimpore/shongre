import { randomUUID } from 'node:crypto';
import type {
  CourseBooking,
  CourseCatalog,
  CourseLead,
  CourseMarketConfig,
  CourseOffer,
  CoursePublicOffer,
  CourseOrganizationWorkspace,
  CoursePlan,
  CourseSubject,
  LearnerRequest,
  TutorProfile,
  TutorPublicProfile,
  TutorSearchQuery,
  TutorSearchResponse,
  TutorWorkspace,
} from '@shongre/contracts/courses';
import { applyMonetizationToCourseCatalog } from '@shongre/contracts/vertical-monetization-adapters';
import {
  courseMarketConfigSchema,
  courseOfferSchema,
  coursePlanSchema,
  courseSubjectSchema,
  learnerRequestSchema,
  tutorProfileSchema,
  tutorSearchQuerySchema,
} from '@shongre/contracts/courses';
import { ICoursesRepository, repositories } from '../../infrastructure/database/repositories/index.js';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../infrastructure/logging/logger.js';
import { businessRulesService, BusinessRulesService } from '../business-rules/business-rules.service.js';

type TutorProfileInput = Omit<
  TutorProfile,
  'id' | 'userId' | 'schemaVersion' | 'vertical' | 'createdAt' | 'updatedAt'
> & { id?: string };

type CourseOfferInput = Omit<
  CourseOffer,
  'id' | 'schemaVersion' | 'vertical' | 'createdAt' | 'updatedAt'
> & { id?: string };

type LearnerRequestInput = Omit<
  LearnerRequest,
  'id' | 'requesterUserId' | 'status' | 'createdAt' | 'expiresAt'
>;

export class CoursesService {
  constructor(
    private readonly courseRepo: ICoursesRepository = repositories.courses,
    private readonly commercialRules: BusinessRulesService = businessRulesService,
  ) {}

  private async resolveCatalog(marketCode = 'FR', includeInactive = false): Promise<CourseCatalog> {
    const normalized = marketCode.toUpperCase();
    const [catalog, commercial] = await Promise.all([
      this.courseRepo.getCatalog(normalized, includeInactive),
      this.commercialRules.getCatalog(normalized),
    ]);
    return applyMonetizationToCourseCatalog(catalog, commercial);
  }

  getCatalog(marketCode = 'FR'): Promise<CourseCatalog> {
    return this.resolveCatalog(marketCode);
  }

  getAdminCatalog(marketCode = 'FR'): Promise<CourseCatalog> {
    return this.resolveCatalog(marketCode, true);
  }

  async searchTutors(input: unknown): Promise<TutorSearchResponse> {
    const query = tutorSearchQuerySchema.parse(input);
    const catalog = await this.resolveCatalog(query.marketCode);
    if (!catalog.config.isEnabled) return { items: [], total: 0, pageInfo: { hasNextPage: false } };
    return this.courseRepo.searchTutors(query);
  }

  async getTutorPublicProfile(idOrSlug: string): Promise<{ tutor: TutorPublicProfile; offers: CoursePublicOffer[] }> {
    const tutor = await this.courseRepo.getTutorProfile(idOrSlug);
    if (!tutor || tutor.moderationStatus !== 'approved') {
      throw new AppError({ code: 'NOT_FOUND', message: 'Profil professeur introuvable.' });
    }
    const offers = (await this.courseRepo.getCourseOffers(tutor.id))
      .filter((offer) => offer.status === 'published')
      .map((offer) => this.sanitizePublicOffer(offer));
    return { tutor: this.sanitizePublicTutor(tutor), offers };
  }

  async saveOwnTutorProfile(userId: string, input: TutorProfileInput): Promise<TutorProfile> {
    const now = new Date().toISOString();
    const existing = input.id ? await this.courseRepo.getTutorProfile(input.id) : null;
    if (existing && existing.userId !== userId) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Ce profil appartient à un autre compte.' });
    }
    const profile = tutorProfileSchema.parse({
      ...input,
      id: existing?.id || input.id || randomUUID(),
      userId,
      schemaVersion: 1,
      vertical: 'tutoring',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    return this.courseRepo.saveTutorProfile(profile);
  }

  async createOwnCourseOffer(userId: string, input: CourseOfferInput): Promise<CourseOffer> {
    const tutor = await this.courseRepo.getTutorProfile(input.tutorProfileId);
    if (!tutor || tutor.userId !== userId) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Vous ne pouvez pas publier pour ce profil.' });
    }
    const [catalog, currentOffers] = await Promise.all([
      this.resolveCatalog(input.marketCodes[0] || 'FR'),
      this.courseRepo.getCourseOffers(tutor.id),
    ]);
    const plan = catalog.plans.find((item) => item.id === tutor.planId) || catalog.plans[0];
    const activeOffers = currentOffers.filter((offer) => ['published', 'pending_review'].includes(offer.status)).length;
    if (activeOffers >= plan.entitlements.maxActiveOffers) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Le quota de cours actifs de votre formule est atteint.',
        details: { entitlement: 'maxActiveOffers', limit: plan.entitlements.maxActiveOffers },
      });
    }
    const now = new Date().toISOString();
    const offer = courseOfferSchema.parse({
      ...input,
      id: input.id || randomUUID(),
      schemaVersion: 1,
      vertical: 'tutoring',
      status: input.status === 'published' ? 'pending_review' : input.status,
      createdAt: now,
      updatedAt: now,
    });
    return this.courseRepo.saveCourseOffer(offer);
  }

  async submitLearnerRequest(requesterUserId: string | undefined, input: LearnerRequestInput): Promise<LearnerRequest> {
    const catalog = await this.resolveCatalog(input.marketCode);
    if (!catalog.config.featureFlags.learnerRequestsEnabled) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Les demandes d’élèves ne sont pas activées sur ce marché.' });
    }
    const isMinor = input.learnerAgeBand !== 'adult';
    if (isMinor && !input.guardianContact) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Le contact et le consentement d’un responsable légal sont requis pour un élève mineur.',
        details: { field: 'guardianContact' },
      });
    }
    const now = new Date();
    const request = learnerRequestSchema.parse({
      ...input,
      id: randomUUID(),
      requesterUserId,
      status: 'submitted',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + catalog.config.learnerRequestValidityDays * 86_400_000).toISOString(),
    });
    const saved = await this.courseRepo.createLearnerRequest(request);
    if (catalog.config.featureFlags.qualifiedLeadsEnabled) {
      await this.routeLearnerRequest(saved, catalog.config);
    }
    return saved;
  }

  async getOwnTutorWorkspace(userId: string, tutorProfileId: string): Promise<TutorWorkspace> {
    const tutor = await this.courseRepo.getTutorProfile(tutorProfileId);
    if (!tutor || tutor.userId !== userId) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Vous ne pouvez pas consulter cet espace professeur.' });
    }
    const workspace = await this.courseRepo.getTutorWorkspace(tutorProfileId);
    if (!workspace) throw new AppError({ code: 'NOT_FOUND', message: 'Espace professeur introuvable.' });
    return workspace;
  }

  async getOwnOrganizationWorkspace(
    userId: string,
    organizationId: string,
  ): Promise<CourseOrganizationWorkspace> {
    const workspace = await this.courseRepo.getOrganizationWorkspace(organizationId);
    if (!workspace) throw new AppError({ code: 'NOT_FOUND', message: 'Espace organisme introuvable.' });
    const membership = workspace.members.find(
      (member) => member.userId === userId && member.status === 'active',
    );
    if (!membership) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Vous n’appartenez pas à cet organisme.' });
    }
    return workspace;
  }

  async respondToOwnLead(
    userId: string,
    tutorProfileId: string,
    leadId: string,
    decision: 'accept' | 'decline' | 'invalid',
    declineReason?: string,
  ): Promise<CourseLead> {
    const tutor = await this.courseRepo.getTutorProfile(tutorProfileId);
    if (!tutor || tutor.userId !== userId) {
      throw new AppError({ code: 'FORBIDDEN', message: 'Cette demande ne vous est pas destinée.' });
    }
    const leads = await this.courseRepo.getTutorLeads(tutorProfileId);
    const lead = leads.find((item) => item.id === leadId);
    if (!lead) throw new AppError({ code: 'NOT_FOUND', message: 'Demande qualifiée introuvable.' });
    if (!['offered', 'viewed'].includes(lead.state)) {
      throw new AppError({ code: 'CONFLICT', message: 'Cette demande a déjà été traitée.' });
    }
    if (new Date(lead.expiresAt).getTime() <= Date.now()) {
      return this.courseRepo.saveLead({ ...lead, state: 'expired', contactReleaseStatus: 'withheld' });
    }
    if (decision === 'decline' && !declineReason?.trim()) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Un motif de refus est requis.' });
    }
    const updated: CourseLead = {
      ...lead,
      state: decision === 'accept' ? 'accepted' : decision === 'invalid' ? 'invalid_disputed' : 'declined',
      contactReleaseStatus: decision === 'accept' ? 'released' : 'withheld',
      declineReason: decision === 'accept' ? undefined : declineReason,
      respondedAt: new Date().toISOString(),
    };
    return this.courseRepo.saveLead(updated);
  }

  async createBooking(
    _learnerUserId: string,
    marketCode: string,
    _input: Omit<CourseBooking, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CourseBooking> {
    const catalog = await this.resolveCatalog(marketCode);
    if (!catalog.config.featureFlags.bookingEnabled || !catalog.config.featureFlags.paymentsEnabled) {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Les réservations et paiements de cours ne sont pas activés sur ce marché.',
        details: { feature: 'course_booking_payments', marketCode },
      });
    }
    // Provider onboarding, fiscal validation and webhook persistence must be
    // completed before this branch is enabled for a market.
    throw new AppError({ code: 'FORBIDDEN', message: 'Le prestataire de paiement de cours n’est pas configuré.' });
  }

  async updateMarketConfig(marketCode: string, input: unknown): Promise<CourseMarketConfig> {
    const current = (await this.resolveCatalog(marketCode)).config;
    const next = courseMarketConfigSchema.parse({ ...current, ...(input as object), marketCode: marketCode.toUpperCase() });
    if (next.featureFlags.paymentsEnabled && (!next.featureFlags.bookingEnabled || !next.featureFlags.payoutsEnabled)) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Les paiements nécessitent les réservations et les versements activés sur le même marché.',
      });
    }
    logger.info(`Course market configuration updated for ${marketCode.toUpperCase()}`);
    return this.courseRepo.saveMarketConfig(marketCode.toUpperCase(), next);
  }

  async updateSubject(
    marketCode: string,
    subjectId: string,
    input: Partial<Pick<CourseSubject, 'label' | 'isActive' | 'levelIds'>>,
  ): Promise<CourseSubject> {
    const catalog = await this.resolveCatalog(marketCode, true);
    const current = catalog.subjects.find((subject) => subject.id === subjectId);
    if (!current) throw new AppError({ code: 'NOT_FOUND', message: 'Matière introuvable sur ce marché.' });
    const updated = courseSubjectSchema.parse({ ...current, ...input, marketCode: marketCode.toUpperCase() });
    logger.info(`Course subject ${subjectId} updated for ${marketCode.toUpperCase()}`);
    return this.courseRepo.saveSubject(updated);
  }

  async updatePlan(
    marketCode: string,
    planId: string,
    input: Partial<Pick<CoursePlan, 'isActive' | 'monthlyPrice' | 'annualPrice' | 'entitlements'>>,
  ): Promise<CoursePlan> {
    const catalog = await this.resolveCatalog(marketCode, true);
    const current = catalog.plans.find((plan) => plan.id === planId);
    if (!current) throw new AppError({ code: 'NOT_FOUND', message: 'Formule Cours introuvable.' });
    const updated = coursePlanSchema.parse({ ...current, ...input });
    logger.info(`Course plan ${planId} updated for ${marketCode.toUpperCase()}`);
    return this.courseRepo.savePlan(updated);
  }

  private async routeLearnerRequest(request: LearnerRequest, config: CourseMarketConfig): Promise<void> {
    const search: TutorSearchQuery = {
      marketCode: request.marketCode,
      subjectId: request.subjectId,
      levelIds: [request.levelId],
      city: request.deliveryModes.includes('online') ? undefined : request.city,
      radiusKm: request.radiusKm,
      deliveryModes: request.deliveryModes,
      maxPriceMinor: request.budgetMax?.amountMinor,
      sort: 'relevance',
      limit: 10,
    };
    const matches = await this.courseRepo.searchTutors(search);
    for (const item of matches.items.slice(0, 5)) {
      const existing = await this.courseRepo.getTutorLeads(item.tutor.id);
      if (existing.some((lead) => lead.learnerRequestId === request.id)) continue;
      const workspace = await this.courseRepo.getTutorWorkspace(item.tutor.id);
      if (!workspace) continue;
      if (workspace.leads.filter((lead) => lead.state !== 'expired').length >= workspace.plan.entitlements.maxMonthlyLeads) continue;
      const lead: CourseLead = {
        id: randomUUID(),
        learnerRequestId: request.id,
        tutorProfileId: item.tutor.id,
        organizationId: item.tutor.organizationId,
        state: 'offered',
        relevanceScore: this.calculateLeadRelevance(request, item.tutor, item.offer),
        relevanceReasons: item.relevanceReasons,
        contactReleaseStatus: 'withheld',
        creditCost: config.defaultLeadCreditCost,
        expiresAt: new Date(Date.now() + config.leadValidityHours * 3_600_000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      await this.courseRepo.saveLead(lead);
    }
  }

  private calculateLeadRelevance(
    request: LearnerRequest,
    tutor: TutorPublicProfile,
    offer: CoursePublicOffer,
  ): number {
    let score = 0;
    if (offer.subjectId === request.subjectId) score += 0.35;
    if (offer.levelIds.includes(request.levelId)) score += 0.25;
    if (offer.deliveryModes.some((mode) => request.deliveryModes.includes(mode))) score += 0.15;
    if (request.deliveryModes.includes('online') || offer.serviceArea?.cityLabel === request.city) score += 0.1;
    if (offer.capacityStatus === 'available') score += 0.1;
    if (tutor.verifications.identity === 'verified') score += 0.05;
    return Math.min(1, score);
  }

  private sanitizePublicTutor(tutor: TutorProfile): TutorPublicProfile {
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
      // The public contract carries status and safe labels only. Uploaded
      // evidence URLs and private document metadata never leave the backend.
      qualifications: publicTutor.qualifications.map((qualification) => ({
        ...qualification,
        issuer: qualification.publicDetailsAllowed ? qualification.issuer : undefined,
      })),
      serviceArea: publicTutor.serviceArea
        ? (({ latitude: _latitude, longitude: _longitude, postalCodePrefix: _postalCodePrefix, ...publicArea }) => publicArea)(publicTutor.serviceArea)
        : undefined,
    };
  }

  private sanitizePublicOffer(offer: CourseOffer): CoursePublicOffer {
    const { moderationReason: _moderationReason, ...publicOffer } = offer;
    return publicOffer;
  }
}

export const coursesService = new CoursesService();
