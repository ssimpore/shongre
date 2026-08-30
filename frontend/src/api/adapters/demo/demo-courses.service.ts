import type {
  CourseCatalog,
  CourseLead,
  CourseMarketConfig,
  CourseOffer,
  CourseOrganizationWorkspace,
  CoursePlan,
  CourseSubject,
  LearnerRequest,
  TutorProfile,
  TutorSearchItem,
  TutorSearchQuery,
  TutorSearchResponse,
  TutorWorkspace,
} from "@shongre/contracts/courses";
import {
  applyMonetizationToCourseCatalog,
  isCoursePlanFeatureOperational,
} from "@shongre/contracts/vertical-monetization-adapters";
import { BASELINE_MONETIZATION_CATALOG } from "@shongre/contracts/monetization-catalog";
import { simulateNetworkDelay } from "../../client/api-client.config";
import type {
  CourseOfferDraft,
  CourseOrganizationInviteInput,
  CourseOrganizationLocationInput,
  CoursesServiceContract,
  LearnerRequestDraft,
  LearnerRequestProgressDraft,
  TutorProfileDraft,
  TutorOnboardingDraft,
} from "../../contracts/courses.contract";
import {
  DEMO_COURSE_CATALOG,
  DEMO_COURSE_LEADS,
  DEMO_COURSE_OFFERS,
  DEMO_COURSE_ORGANIZATION_WORKSPACE,
  DEMO_LEARNER_REQUESTS,
  DEMO_TUTORS,
} from "../../../mocks/coursesDemoData";
import { demoVerticalDiscoveryStore } from "../../../domains/discovery/demo-vertical-discovery.store";
import { storageService } from "../../../services/storage.service";
import { COURSE_CONSTRAINTS } from "@shongre/contracts/courses";
import { requireDemoCapability } from "./demo-authorization";

const tutorDraftKey = (accountId: string) =>
  `shongre_courses_onboarding_v2:${accountId}`;
const learnerDraftKey = (accountId: string) =>
  `shongre_courses_learner_request_draft_v2:${accountId}`;

const TUTOR_ONBOARDING_POLICY = {
  avatarUrl:
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=85",
  profileCompletionPercent: 82,
  availability: {
    id: "availability-onboarding",
    dayOfWeek: 3,
    startsAtLocal: "17:00",
    endsAtLocal: "20:00",
    durationMinutes: 60,
    summary: "Créneaux en semaine et le samedi",
  },
  qualification: {
    id: "qualification-onboarding",
    type: "degree" as const,
    label: "Formation et expérience déclarées",
    publicLabel: "Déclaré par le professeur — non vérifié",
  },
  goals: ["confidence", "exam_preparation"],
} as const;

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const clone = <T>(value: T): T => structuredClone(value);

function fromPrice(offer: CourseOffer) {
  return (
    [...offer.pricingOptions]
      .filter((option) => option.isActive)
      .sort((a, b) => a.price.amountMinor - b.price.amountMinor)[0]?.price || {
      amountMinor: 0,
      currency: "EUR",
    }
  );
}

function relevance(
  query: TutorSearchQuery,
  tutor: TutorProfile,
  offer: CourseOffer,
) {
  let score = 0.35;
  if (!query.subjectId || query.subjectId === offer.subjectId) score += 0.25;
  if (
    !query.levelIds?.length ||
    query.levelIds.some((id) => offer.levelIds.includes(id))
  )
    score += 0.15;
  if (
    !query.deliveryModes?.length ||
    query.deliveryModes.some((mode) => offer.deliveryModes.includes(mode))
  )
    score += 0.1;
  if (
    !query.city ||
    tutor.serviceArea?.cityLabel
      .toLowerCase()
      .includes(query.city.toLowerCase())
  )
    score += 0.08;
  if (offer.capacityStatus === "available") score += 0.04;
  return score;
}

export class DemoCoursesService implements CoursesServiceContract {
  private catalog = clone(DEMO_COURSE_CATALOG);
  private tutors = new Map(
    DEMO_TUTORS.map((tutor) => [tutor.id, clone(tutor)]),
  );
  private offers = new Map(
    DEMO_COURSE_OFFERS.map((offer) => [offer.id, clone(offer)]),
  );
  private requests = new Map(
    DEMO_LEARNER_REQUESTS.map((request) => [request.id, clone(request)]),
  );
  private leads = new Map(
    DEMO_COURSE_LEADS.map((lead) => [lead.id, clone(lead)]),
  );
  private savedTutors = new Map<string, Set<string>>([
    ["user_thomas", new Set(["tutor_ines"])],
  ]);
  private organizationWorkspace = clone(DEMO_COURSE_ORGANIZATION_WORKSPACE);
  private sequence = 1;

  async getTutorOnboardingDraft(
    accountId: string,
    marketCode: string,
    displayName?: string,
  ): Promise<TutorOnboardingDraft> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(marketCode);
    const individualPlan =
      catalog.plans.find(
        (plan) => plan.audience === "individual" && plan.isActive,
      ) || catalog.plans[0];
    return storageService.get<TutorOnboardingDraft>(tutorDraftKey(accountId), {
      accountKind: "individual",
      displayName: displayName || "Sophie Martin",
      organizationName: "",
      headline: "Professeure de mathématiques — collège et lycée",
      subjectIds: ["subject_mathematics"],
      levelIds: ["middle_school", "high_school"],
      deliveryModes: ["online", "in_person"],
      city: "Lyon",
      radiusKm: COURSE_CONSTRAINTS.learnerRequestDefaultRadiusKm,
      languages: ["fr"],
      experienceYears: 8,
      biography:
        "Professeure certifiée, j’accompagne les élèves pour retrouver confiance, consolider leurs bases et préparer leurs examens.",
      teachingApproach:
        "Je pars des acquis de l’élève, rends les objectifs visibles et alterne explications, exercices guidés et autonomie.",
      priceMinor: 3_200,
      availability: [
        "weekday_evening",
        "wednesday_afternoon",
        "saturday_morning",
      ],
      planId: individualPlan.id,
    });
  }

  async saveTutorOnboardingDraft(
    accountId: string,
    draft: TutorOnboardingDraft,
  ): Promise<void> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    storageService.set(tutorDraftKey(accountId), draft);
  }

  async submitTutorOnboarding(
    accountId: string,
    marketCode: string,
    draft: TutorOnboardingDraft,
  ): Promise<{ profile: TutorProfile; offer: CourseOffer }> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    const catalog = await this.getCatalog(marketCode);
    const primarySubjectId = draft.subjectIds[0];
    if (!primarySubjectId)
      throw new Error("Sélectionnez au moins une matière.");

    const now = new Date().toISOString();
    const organizationId =
      draft.accountKind === "organization"
        ? draft.organizationId || this.organizationWorkspace.organization.id
        : undefined;
    const createdProfile = await this.saveTutorProfile({
      organizationId,
      profileType:
        draft.accountKind === "organization"
          ? "organization_member"
          : "individual",
      slug: slugify(draft.displayName),
      displayName: draft.displayName,
      avatarUrl: TUTOR_ONBOARDING_POLICY.avatarUrl,
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
            marketCode,
            cityLabel: draft.city,
            radiusKm: draft.radiusKm,
            publicLocationLabel: `${draft.city} et alentours`,
          }
        : undefined,
      availabilityRules: [
        {
          id: TUTOR_ONBOARDING_POLICY.availability.id,
          dayOfWeek: TUTOR_ONBOARDING_POLICY.availability.dayOfWeek,
          startsAtLocal: TUTOR_ONBOARDING_POLICY.availability.startsAtLocal,
          endsAtLocal: TUTOR_ONBOARDING_POLICY.availability.endsAtLocal,
          timezone: catalog.config.timezone,
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
          id: TUTOR_ONBOARDING_POLICY.qualification.id,
          type: TUTOR_ONBOARDING_POLICY.qualification.type,
          label: TUTOR_ONBOARDING_POLICY.qualification.label,
          evidenceStatus: "self_declared",
          verificationStatus: "not_submitted",
          publicLabel: TUTOR_ONBOARDING_POLICY.qualification.publicLabel,
          publicDetailsAllowed: true,
        },
      ],
      verifications: {
        email: "verified",
        phone: "verified",
        identity: "not_submitted",
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
      profileCompletionPercent:
        TUTOR_ONBOARDING_POLICY.profileCompletionPercent,
      isFeatured: false,
    });
    const profile = { ...createdProfile, userId: accountId };
    this.tutors.set(profile.id, clone(profile));

    const offer = await this.createCourseOffer({
      tutorProfileId: profile.id,
      organizationId: profile.organizationId,
      slug: `${slugify(primarySubjectId)}-${profile.slug}`,
      title: draft.headline,
      description: `${draft.biography}\n\n${draft.teachingApproach}`,
      subjectId: primarySubjectId,
      levelIds: draft.levelIds,
      goalIds: [...TUTOR_ONBOARDING_POLICY.goals],
      languages: draft.languages,
      deliveryModes: draft.deliveryModes,
      serviceArea: profile.serviceArea,
      pricingOptions: [
        {
          id: "hourly-onboarding",
          type: "hourly",
          label: "Cours à l’heure",
          price: {
            amountMinor: draft.priceMinor,
            currency: catalog.config.currency,
          },
          durationMinutes: TUTOR_ONBOARDING_POLICY.availability.durationMinutes,
          isActive: true,
        },
      ],
      availabilitySummary: TUTOR_ONBOARDING_POLICY.availability.summary,
      trialLessonAvailable: false,
      status: "pending_review",
      marketCodes: [marketCode],
      capacityStatus: "available",
    });
    await this.clearTutorOnboardingDraft(accountId);
    return { profile: clone(profile), offer };
  }

  async clearTutorOnboardingDraft(accountId: string): Promise<void> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    storageService.remove(tutorDraftKey(accountId));
  }

  async getLearnerRequestDraft(
    accountId: string,
    _marketCode: string,
    subjectId = "",
  ): Promise<LearnerRequestProgressDraft> {
    requireDemoCapability("course.request.create");
    await simulateNetworkDelay();
    const stored = storageService.get<LearnerRequestProgressDraft | null>(
      learnerDraftKey(accountId),
      null,
    );
    return {
      levelId: "",
      objective: "",
      preferredSchedule: [],
      deliveryModes: ["online"],
      city: "",
      radiusKm: COURSE_CONSTRAINTS.learnerRequestDefaultRadiusKm,
      budgetMinEuros: "",
      budgetMaxEuros: "",
      desiredStartDate: "",
      context: "",
      learnerAgeBand: "adult",
      ...(stored || {}),
      subjectId: stored?.subjectId || subjectId,
    };
  }

  async saveLearnerRequestDraft(
    accountId: string,
    draft: LearnerRequestProgressDraft,
  ): Promise<void> {
    requireDemoCapability("course.request.create");
    await simulateNetworkDelay();
    storageService.set(learnerDraftKey(accountId), draft);
  }

  async clearLearnerRequestDraft(accountId: string): Promise<void> {
    requireDemoCapability("course.request.create");
    await simulateNetworkDelay();
    storageService.remove(learnerDraftKey(accountId));
  }

  private resolvedOrganizationPlan() {
    const catalog = applyMonetizationToCourseCatalog(
      this.catalog,
      BASELINE_MONETIZATION_CATALOG,
    );
    return (
      catalog.plans.find(
        (plan) => plan.id === this.organizationWorkspace.organization.planId,
      ) || this.organizationWorkspace.plan
    );
  }

  async getCatalog(marketCode: string): Promise<CourseCatalog> {
    requireDemoCapability("course.read");
    await simulateNetworkDelay();
    const catalog = clone(
      applyMonetizationToCourseCatalog(
        {
          ...this.catalog,
          config: {
            ...this.catalog.config,
            marketCode: marketCode.toUpperCase(),
          },
        },
        BASELINE_MONETIZATION_CATALOG,
      ),
    );
    return {
      ...catalog,
      subjects: catalog.subjects.filter((subject) => subject.isActive),
      levels: catalog.levels.filter((level) => level.isActive),
      plans: catalog.plans.filter((plan) => plan.isActive),
      addOns: catalog.addOns.filter((addOn) => addOn.isActive),
    };
  }

  async getAdminCatalog(marketCode: string): Promise<CourseCatalog> {
    requireDemoCapability("course.admin.manage");
    await simulateNetworkDelay();
    return clone(
      applyMonetizationToCourseCatalog(
        {
          ...this.catalog,
          config: {
            ...this.catalog.config,
            marketCode: marketCode.toUpperCase(),
          },
        },
        BASELINE_MONETIZATION_CATALOG,
      ),
    );
  }

  async searchTutors(query: TutorSearchQuery): Promise<TutorSearchResponse> {
    requireDemoCapability("course.read");
    await simulateNetworkDelay();
    let pairs = Array.from(this.offers.values())
      .filter((offer) => offer.status === "published")
      .map((offer) => ({ offer, tutor: this.tutors.get(offer.tutorProfileId) }))
      .filter((pair): pair is { offer: CourseOffer; tutor: TutorProfile } =>
        Boolean(pair.tutor),
      )
      .filter(({ tutor, offer }) => {
        if (query.subjectId && offer.subjectId !== query.subjectId)
          return false;
        if (
          query.levelIds?.length &&
          !query.levelIds.some((id) => offer.levelIds.includes(id))
        )
          return false;
        if (
          query.deliveryModes?.length &&
          !query.deliveryModes.some((mode) =>
            offer.deliveryModes.includes(mode),
          )
        )
          return false;
        if (
          query.languages?.length &&
          !query.languages.some((language) =>
            offer.languages.includes(language),
          )
        )
          return false;
        if (
          query.city &&
          !tutor.serviceArea?.cityLabel
            .toLowerCase()
            .includes(query.city.toLowerCase())
        )
          return false;
        if (query.verifiedOnly && tutor.verifications.identity !== "verified")
          return false;
        if (
          query.minRating &&
          (!tutor.ratingIsStatisticallyMeaningful ||
            (tutor.rating || 0) < query.minRating)
        )
          return false;
        if (
          query.tutorType === "individual" &&
          tutor.profileType !== "individual"
        )
          return false;
        if (query.tutorType === "organization" && !tutor.organizationId)
          return false;
        const price = fromPrice(offer).amountMinor;
        if (query.minPriceMinor !== undefined && price < query.minPriceMinor)
          return false;
        if (query.maxPriceMinor !== undefined && price > query.maxPriceMinor)
          return false;
        if (query.query) {
          const text =
            `${tutor.displayName} ${tutor.headline} ${offer.title} ${offer.description}`.toLowerCase();
          if (!text.includes(query.query.toLowerCase())) return false;
        }
        return true;
      });

    pairs.sort((a, b) => {
      if (query.sort === "price_asc")
        return fromPrice(a.offer).amountMinor - fromPrice(b.offer).amountMinor;
      if (query.sort === "price_desc")
        return fromPrice(b.offer).amountMinor - fromPrice(a.offer).amountMinor;
      if (query.sort === "rating")
        return (b.tutor.rating || 0) - (a.tutor.rating || 0);
      if (query.sort === "response_time")
        return (
          (a.tutor.responseTimeMinutes || 99999) -
          (b.tutor.responseTimeMinutes || 99999)
        );
      return (
        relevance(query, b.tutor, b.offer) - relevance(query, a.tutor, a.offer)
      );
    });

    const offset = Number(query.cursor || 0);
    const limit = Math.min(50, query.limit || 20);
    const items: TutorSearchItem[] = pairs
      .slice(offset, offset + limit)
      .map(({ tutor, offer }, index) => ({
        tutor: clone(tutor),
        offer: clone(offer),
        subjectLabel:
          this.catalog.subjects.find(
            (subject) => subject.id === offer.subjectId,
          )?.label || offer.subjectId,
        levelLabels: offer.levelIds.map(
          (id) =>
            this.catalog.levels.find((level) => level.id === id)?.label || id,
        ),
        fromPrice: fromPrice(offer),
        distanceKm:
          tutor.serviceArea?.cityLabel === "Toulouse"
            ? Number((3.2 + index * 1.8).toFixed(1))
            : undefined,
        relevanceReasons: [
          "Matière et niveau compatibles",
          offer.availabilitySummary,
          tutor.verifications.identity === "verified"
            ? "Identité vérifiée"
            : "Identité non vérifiée",
        ],
        isSaved: false,
      }));
    return {
      items,
      total: pairs.length,
      pageInfo: {
        hasNextPage: offset + limit < pairs.length,
        nextCursor:
          offset + limit < pairs.length ? String(offset + limit) : undefined,
      },
    };
  }

  async getTutorProfile(idOrSlug: string) {
    requireDemoCapability("course.read");
    await simulateNetworkDelay();
    const tutor =
      this.tutors.get(idOrSlug) ||
      Array.from(this.tutors.values()).find((item) => item.slug === idOrSlug);
    if (!tutor) throw new Error("Profil professeur introuvable");
    return {
      tutor: clone(tutor),
      offers: Array.from(this.offers.values())
        .filter((offer) => offer.tutorProfileId === tutor.id)
        .map(clone),
    };
  }

  async saveTutorProfile(input: TutorProfileDraft): Promise<TutorProfile> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    const now = new Date().toISOString();
    const id = input.id || `demo_tutor_created_${this.sequence++}`;
    const existing = this.tutors.get(id);
    const tutor: TutorProfile = {
      ...input,
      id,
      userId: existing?.userId || "user_tutor_sophie",
      schemaVersion: 1,
      vertical: "tutoring",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.tutors.set(id, clone(tutor));
    Array.from(this.offers.values())
      .filter((offer) => offer.tutorProfileId === id)
      .forEach((offer) =>
        demoVerticalDiscoveryStore.syncCourseOffer(tutor, offer),
      );
    return clone(tutor);
  }

  async createCourseOffer(input: CourseOfferDraft): Promise<CourseOffer> {
    requireDemoCapability("course.offer.manage.own");
    await simulateNetworkDelay();
    const tutor = this.tutors.get(input.tutorProfileId);
    if (!tutor) throw new Error("Profil professeur introuvable");
    const catalog = await this.getCatalog("FR");
    const plan =
      catalog.plans.find((item) => item.id === tutor.planId) ||
      catalog.plans[0];
    const activeCount = Array.from(this.offers.values()).filter(
      (offer) =>
        offer.tutorProfileId === tutor.id &&
        ["published", "pending_review"].includes(offer.status),
    ).length;
    if (activeCount >= plan.entitlements.maxActiveOffers) {
      throw new Error("Le quota de cours actifs de votre formule est atteint.");
    }
    const now = new Date().toISOString();
    const offer: CourseOffer = {
      ...input,
      id: input.id || `demo_course_offer_${this.sequence++}`,
      schemaVersion: 1,
      vertical: "tutoring",
      status: input.status === "published" ? "pending_review" : input.status,
      createdAt: now,
      updatedAt: now,
    };
    this.offers.set(offer.id, clone(offer));
    demoVerticalDiscoveryStore.syncCourseOffer(tutor, offer);
    return clone(offer);
  }

  async submitLearnerRequest(
    input: LearnerRequestDraft,
  ): Promise<LearnerRequest> {
    requireDemoCapability("course.request.create");
    await simulateNetworkDelay();
    if (input.learnerAgeBand !== "adult" && !input.guardianContact) {
      throw new Error(
        "Le contact et le consentement d’un responsable légal sont requis.",
      );
    }
    const now = new Date();
    const request: LearnerRequest = {
      ...input,
      id: `demo_learner_request_${this.sequence++}`,
      requesterUserId: "user_thomas",
      status: "matched",
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 14 * 86_400_000).toISOString(),
    };
    this.requests.set(request.id, clone(request));
    return clone(request);
  }

  async getTutorWorkspace(tutorProfileId: string): Promise<TutorWorkspace> {
    requireDemoCapability("course.profile.manage.own");
    await simulateNetworkDelay();
    const tutor =
      this.tutors.get(tutorProfileId) || this.tutors.get("tutor_sophie");
    if (!tutor) throw new Error("Espace professeur introuvable");
    const offers = Array.from(this.offers.values()).filter(
      (offer) => offer.tutorProfileId === tutor.id,
    );
    const leads = Array.from(this.leads.values()).filter(
      (lead) => lead.tutorProfileId === tutor.id,
    );
    const catalog = await this.getCatalog("FR");
    return clone({
      tutor,
      offers,
      leads,
      learnerRequests: Array.from(this.requests.values()),
      plan:
        catalog.plans.find((plan) => plan.id === tutor.planId) ||
        catalog.plans[0],
      creditsRemaining: tutor.planId === "school_organization" ? 18 : 4,
      analytics: {
        period: "last_30_days",
        profileViews: 142,
        requestsReceived: 9,
        acceptedLeads: 4,
        medianResponseMinutes: 165,
        contactConversionRate: 0.27,
      },
      featureFlags: this.catalog.config.featureFlags,
    });
  }

  async getOrganizationWorkspace(
    organizationId: string,
  ): Promise<CourseOrganizationWorkspace> {
    requireDemoCapability("course.organization.manage.own");
    await simulateNetworkDelay();
    if (organizationId !== DEMO_COURSE_ORGANIZATION_WORKSPACE.organization.id) {
      throw new Error("Espace organisme introuvable");
    }
    return clone({
      ...this.organizationWorkspace,
      plan: this.resolvedOrganizationPlan(),
    });
  }

  async inviteOrganizationMember(
    organizationId: string,
    input: CourseOrganizationInviteInput,
  ): Promise<CourseOrganizationWorkspace> {
    requireDemoCapability("course.organization.manage.own");
    await simulateNetworkDelay();
    if (organizationId !== this.organizationWorkspace.organization.id) {
      throw new Error("Espace organisme introuvable");
    }
    const email = input.email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email))
      throw new Error("Indiquez une adresse e-mail valide.");
    const plan = this.resolvedOrganizationPlan();
    if (
      !isCoursePlanFeatureOperational(
        BASELINE_MONETIZATION_CATALOG,
        plan.id,
        "teamMembers",
      )
    ) {
      requireDemoCapability("course.organization.manage.own");
      throw new Error("Fonction temporairement indisponible.");
    }
    if (
      this.organizationWorkspace.members.length >= plan.entitlements.teamMembers
    ) {
      throw new Error(
        `Le quota de ${plan.entitlements.teamMembers} membre(s) de cette formule est atteint.`,
      );
    }
    this.organizationWorkspace.members.push({
      id: `course_member_${this.sequence++}`,
      organizationId,
      userId: `invited_user_${this.sequence++}`,
      displayName: email.split("@")[0],
      role: input.role,
      permissions:
        input.role === "tutor"
          ? ["offers:read", "leads:respond"]
          : ["workspace:read"],
      status: "invited",
    });
    this.organizationWorkspace.organization.memberCount =
      this.organizationWorkspace.members.length;
    return clone({ ...this.organizationWorkspace, plan });
  }

  async addOrganizationLocation(
    organizationId: string,
    input: CourseOrganizationLocationInput,
  ): Promise<CourseOrganizationWorkspace> {
    requireDemoCapability("course.organization.manage.own");
    await simulateNetworkDelay();
    if (organizationId !== this.organizationWorkspace.organization.id) {
      throw new Error("Espace organisme introuvable");
    }
    const label = input.label.trim();
    if (!label) throw new Error("Indiquez un lieu d’enseignement.");
    const plan = this.resolvedOrganizationPlan();
    if (
      !isCoursePlanFeatureOperational(
        BASELINE_MONETIZATION_CATALOG,
        plan.id,
        "locations",
      )
    ) {
      requireDemoCapability("course.organization.manage.own");
      throw new Error("Fonction temporairement indisponible.");
    }
    const locationLimit = plan.entitlements.locations;
    if (this.organizationWorkspace.locations.length >= locationLimit) {
      throw new Error("Le quota de lieux de cette formule est atteint.");
    }
    this.organizationWorkspace.locations.push({
      id: `course_location_${this.sequence++}`,
      label,
      isActive: true,
      activeTutorCount: 0,
    });
    return clone({ ...this.organizationWorkspace, plan });
  }

  async respondToLead(
    tutorProfileId: string,
    leadId: string,
    decision: "accept" | "decline" | "invalid",
    declineReason?: string,
  ): Promise<CourseLead> {
    requireDemoCapability("course.lead.respond.own");
    await simulateNetworkDelay();
    const lead = this.leads.get(leadId);
    if (!lead || lead.tutorProfileId !== tutorProfileId) {
      throw new Error("Demande qualifiée introuvable");
    }
    if (decision === "decline" && !declineReason) {
      throw new Error("Un motif de refus est requis");
    }
    const updated: CourseLead = {
      ...lead,
      state:
        decision === "accept"
          ? "accepted"
          : decision === "invalid"
            ? "invalid_disputed"
            : "declined",
      contactReleaseStatus: decision === "accept" ? "released" : "withheld",
      declineReason,
      respondedAt: new Date().toISOString(),
    };
    this.leads.set(leadId, updated);
    return clone(updated);
  }

  async getSavedTutorIds(accountId: string): Promise<string[]> {
    requireDemoCapability("favorite.manage.own");
    await simulateNetworkDelay();
    return Array.from(this.savedTutors.get(accountId) || []);
  }

  async toggleSavedTutor(accountId: string, tutorProfileId: string) {
    requireDemoCapability("favorite.manage.own");
    await simulateNetworkDelay();
    const saved = this.savedTutors.get(accountId) || new Set<string>();
    if (saved.has(tutorProfileId)) saved.delete(tutorProfileId);
    else saved.add(tutorProfileId);
    this.savedTutors.set(accountId, saved);
    return saved.has(tutorProfileId);
  }

  async updateMarketConfig(
    marketCode: string,
    config: CourseMarketConfig,
  ): Promise<CourseMarketConfig> {
    requireDemoCapability("course.admin.manage");
    await simulateNetworkDelay();
    if (
      config.featureFlags.paymentsEnabled &&
      (!config.featureFlags.bookingEnabled ||
        !config.featureFlags.payoutsEnabled)
    ) {
      throw new Error(
        "Les paiements nécessitent les réservations et versements activés.",
      );
    }
    this.catalog.config = {
      ...config,
      marketCode: marketCode.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };
    return clone(this.catalog.config);
  }

  async updateSubject(
    marketCode: string,
    subjectId: string,
    patch: Partial<Pick<CourseSubject, "label" | "isActive" | "levelIds">>,
  ): Promise<CourseSubject> {
    requireDemoCapability("course.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.subjects.findIndex(
      (subject) =>
        subject.id === subjectId &&
        subject.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Matière introuvable sur ce marché.");
    const updated = { ...this.catalog.subjects[index], ...patch };
    this.catalog.subjects[index] = updated;
    return clone(updated);
  }

  async updatePlan(
    marketCode: string,
    planId: string,
    patch: Partial<
      Pick<
        CoursePlan,
        "isActive" | "monthlyPrice" | "annualPrice" | "entitlements"
      >
    >,
  ): Promise<CoursePlan> {
    requireDemoCapability("course.admin.manage");
    await simulateNetworkDelay();
    const index = this.catalog.plans.findIndex(
      (plan) =>
        plan.id === planId && plan.marketCode === marketCode.toUpperCase(),
    );
    if (index < 0) throw new Error("Formule introuvable.");
    const updated = { ...this.catalog.plans[index], ...patch };
    this.catalog.plans[index] = updated;
    return clone(updated);
  }
}

export const demoCoursesService = new DemoCoursesService();
