import { describe, expect, it } from "vitest";
import { CoursesService } from "../../src/modules/courses/courses.service.js";
import {
  DemoCoursesRepository,
  DEFAULT_COURSE_MARKET_CONFIG,
} from "../../src/infrastructure/database/repositories/courses.repository.js";
import { DemoBusinessRulesRepository } from "../../src/infrastructure/database/repositories/business-rules.repository.js";
import { BusinessRulesService } from "../../src/modules/business-rules/business-rules.service.js";

const createService = () => {
  const repository = new DemoCoursesRepository();
  return { repository, service: new CoursesService(repository) };
};

describe("Shongre Education course domain service", () => {
  it("resolves authenticated workspaces without client-supplied resource ids", async () => {
    const { service } = createService();

    await expect(
      service.getCurrentTutorWorkspace("user_tutor_sophie", "FR"),
    ).resolves.toMatchObject({ tutor: { id: "tutor_sophie" } });
    await expect(
      service.getCurrentTutorWorkspace("user_tutor_sophie", "BE"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.getCurrentOrganizationWorkspace("user_course_member_1", "FR"),
    ).resolves.toHaveProperty("organization.marketCode", "FR");
    await expect(
      service.getCurrentOrganizationWorkspace("unknown_user", "FR"),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("persists only non-sensitive workflow criteria and account-market favorites", async () => {
    const { service } = createService();
    await service.saveWorkflowDraft("user_learner", "FR", "learner_request", {
      subjectId: "subject_mathematics",
      objective: "Préparer le brevet",
      guardianName: "must-not-persist",
      paymentSecret: "must-not-persist",
    });
    const draft = await service.getLearnerRequestDraft("user_learner", "FR");
    expect(draft).toMatchObject({
      subjectId: "subject_mathematics",
      objective: "Préparer le brevet",
    });
    expect(draft).not.toHaveProperty("guardianName");
    expect(draft).not.toHaveProperty("paymentSecret");

    await expect(
      service.setSavedTutor("user_learner", "tutor_sophie", "FR", true),
    ).resolves.toBe(true);
    await expect(
      service.setSavedTutor("user_learner", "tutor_sophie", "FR", true),
    ).resolves.toBe(true);
    expect(await service.getSavedTutorIds("user_learner", "FR")).toEqual([
      "tutor_sophie",
    ]);
    expect(await service.getSavedTutorIds("user_learner", "BE")).toEqual([]);
    expect(await service.getSavedTutorIds("another_learner", "FR")).toEqual([]);
    await expect(
      service.setSavedTutor("user_learner", "tutor_sophie", "BE", true),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      service.setSavedTutor("user_learner", "missing-tutor", "BE", false),
    ).resolves.toBe(false);
  });

  it("projects Education plan prices from the active commercial version", async () => {
    class CommercialRepository extends DemoBusinessRulesRepository {
      override async getActiveCatalog(marketCode: string) {
        const catalog = await super.getActiveCatalog(marketCode);
        const changed = structuredClone(catalog!);
        changed.products.find(
          (product) => product.id === "course.tutor.pro",
        )!.prices[0].amount.amountMinor = 2345;
        return changed;
      }
    }
    const service = new CoursesService(
      new DemoCoursesRepository(),
      new BusinessRulesService(new CommercialRepository()),
    );
    const catalog = await service.getCatalog("FR");
    expect(
      catalog.plans.find((plan) => plan.id === "tutor_pro")?.monthlyPrice
        ?.amountMinor,
    ).toBe(2345);
  });

  it("ships Phase 1 enabled and all regulated Phase 2 switches disabled", async () => {
    const { service } = createService();
    const catalog = await service.getCatalog("fr");
    expect(catalog.config.isEnabled).toBe(true);
    expect(catalog.config.featureFlags.learnerRequestsEnabled).toBe(true);
    expect(catalog.config.featureFlags.qualifiedLeadsEnabled).toBe(true);
    expect(catalog.config.featureFlags.bookingEnabled).toBe(false);
    expect(catalog.config.featureFlags.paymentsEnabled).toBe(false);
    expect(catalog.config.featureFlags.payoutsEnabled).toBe(false);
  });

  it("fails closed outside the configured Education market", async () => {
    const { repository } = createService();

    await expect(repository.getCatalog("BE")).resolves.toMatchObject({
      config: { marketCode: "BE", isEnabled: false },
      subjects: [],
      levels: [],
      plans: [],
      addOns: [],
    });
    await expect(
      repository.searchTutors({ marketCode: "BE" }),
    ).resolves.toEqual({
      items: [],
      total: 0,
      pageInfo: { hasNextPage: false },
    });
  });

  it.each([
    { subjectId: "unpublished-subject", levelId: "middle_school" },
    { subjectId: "subject_mathematics", levelId: "unpublished-level" },
  ])(
    "rejects noncanonical learner selections before routing a lead: %j",
    async (selection) => {
      const { service } = createService();
      await expect(
        service.submitLearnerRequest("learner", {
          ...selection,
          marketCode: "FR",
          objective: "Préparer un examen de mathématiques",
          preferredSchedule: ["samedi_matin"],
          deliveryModes: ["online"],
          desiredStartDate: "2026-10-01",
          learnerAgeBand: "adult",
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    },
  );

  it("requires a guardian and explicit consent context for every minor request", async () => {
    const { service } = createService();
    await expect(
      service.submitLearnerRequest("user_learner", {
        marketCode: "FR",
        subjectId: "subject_mathematics",
        levelId: "middle_school",
        objective:
          "Préparer le brevet et retrouver de la confiance en mathématiques.",
        preferredSchedule: ["samedi_matin"],
        deliveryModes: ["online"],
        budgetMin: { amountMinor: 2000, currency: "EUR" },
        budgetMax: { amountMinor: 3500, currency: "EUR" },
        desiredStartDate: "2026-09-03",
        context: "Élève de troisième.",
        learnerAgeBand: "13_15",
      }),
    ).rejects.toThrow(/responsable légal/i);
  });

  it("routes a valid request with normalized money and without duplicate tutor leads", async () => {
    const { repository, service } = createService();
    const request = await service.submitLearnerRequest("user_learner", {
      marketCode: "FR",
      subjectId: "subject_mathematics",
      levelId: "middle_school",
      objective:
        "Préparer le brevet et retrouver de la confiance en mathématiques.",
      preferredSchedule: ["samedi_matin"],
      deliveryModes: ["online"],
      budgetMin: { amountMinor: 2000, currency: "EUR" },
      budgetMax: { amountMinor: 3500, currency: "EUR" },
      desiredStartDate: "2026-09-03",
      context: "Élève de troisième.",
      learnerAgeBand: "13_15",
      guardianContact: {
        guardianName: "Julie Durand",
        relationship: "Mère",
        consentConfirmedAt: new Date().toISOString(),
      },
    });
    expect(request.budgetMax?.amountMinor).toBe(3500);
    const tutorLeads = await repository.getTutorLeads("tutor_sophie");
    expect(
      tutorLeads.filter((lead) => lead.learnerRequestId === request.id),
    ).toHaveLength(1);
  });

  it("releases contact only after the owning tutor accepts a live lead", async () => {
    const { repository, service } = createService();
    const lead = (await repository.getTutorLeads("tutor_sophie"))[0];
    const updated = await service.respondToOwnLead(
      "user_tutor_sophie",
      "tutor_sophie",
      lead.id,
      "accept",
    );
    expect(updated.state).toBe("accepted");
    expect(updated.contactReleaseStatus).toBe("released");
    await expect(
      service.respondToOwnLead(
        "another_user",
        "tutor_sophie",
        lead.id,
        "accept",
      ),
    ).rejects.toThrow(/destinée/i);
  });

  it("hard-blocks booking while the market gate is disabled", async () => {
    const { service } = createService();
    await expect(
      service.createBooking("learner", "FR", {} as never),
    ).rejects.toThrow(/pas activés/i);
  });

  it("structurally removes account, workflow, exact-area, and moderation fields from public payloads", async () => {
    const { service } = createService();
    const profile = await service.getTutorPublicProfile("sophie-martin-lyon");
    expect(profile.tutor).not.toHaveProperty("userId");
    expect(profile.tutor).not.toHaveProperty("planId");
    expect(profile.tutor).not.toHaveProperty("moderationStatus");
    expect(profile.tutor.serviceArea).not.toHaveProperty("postalCodePrefix");
    expect(profile.offers[0]).not.toHaveProperty("moderationReason");

    const search = await service.searchTutors({ marketCode: "FR", limit: 5 });
    expect(search.items[0].tutor).not.toHaveProperty("userId");
    expect(search.items[0].taxonomy).toMatchObject({
      rootId: "education",
      categoryId: "education",
      revision: 1,
    });
  });

  it("exposes only explicit exact-listing promotion proof in tutor search", async () => {
    const { repository, service } = createService();
    const initial = await service.searchTutors({ marketCode: "FR", limit: 20 });
    const thomas = initial.items.find(
      (item) => item.tutor.id === "tutor_thomas",
    );
    expect(thomas?.resolvedPromotion).toMatchObject({
      state: "active",
      marketCode: "FR",
      source: "subscription_credit",
      sourceId: "demo:courses:course_offer_tutor_thomas:sponsored",
      startsAt: "2026-08-01T00:00:00.000Z",
      endsAt: "2026-12-31T23:59:59.000Z",
    });

    const [offer] = await repository.getCourseOffers("tutor_thomas");
    await repository.saveCourseOffer({
      ...offer,
      listingId: "listing_course_tutor_thomas_replaced",
    });
    const afterMappingChange = await service.searchTutors({
      marketCode: "FR",
      limit: 20,
    });
    expect(
      afterMappingChange.items.find((item) => item.tutor.id === "tutor_thomas")
        ?.resolvedPromotion,
    ).toBeUndefined();
    expect(
      afterMappingChange.items.find((item) => item.tutor.id === "tutor_thomas")
        ?.tutor.isFeatured,
    ).toBe(true);
  });

  it("refuses an unsafe payment switch combination", async () => {
    const { service } = createService();
    await expect(
      service.updateMarketConfig("FR", {
        ...DEFAULT_COURSE_MARKET_CONFIG,
        featureFlags: {
          ...DEFAULT_COURSE_MARKET_CONFIG.featureFlags,
          paymentsEnabled: true,
        },
      }),
    ).rejects.toThrow(/nécessitent les réservations/i);
  });

  it("enforces organization membership before returning team data", async () => {
    const { service } = createService();
    const workspace = await service.getOwnOrganizationWorkspace(
      "user_tutor_sophie",
      "org_college_lumiere",
    );
    expect(workspace.organization.publicName).toBe("Collège Lumière");
    await expect(
      service.getOwnOrganizationWorkspace(
        "unrelated_user",
        "org_college_lumiere",
      ),
    ).rejects.toThrow(/n’appartenez pas/i);
  });

  it("reads subjects from the canonical publication and respects market isolation", async () => {
    const { service } = createService();
    const { taxonomyV1Service } =
      await import("../../src/modules/taxonomy/taxonomy.runtime.js");
    const taxonomy = await taxonomyV1Service.snapshot();
    expect((await service.getCatalog("FR")).subjects).toEqual(
      taxonomy.getReferences("course_subjects", "FR"),
    );
    expect(
      (await new DemoCoursesRepository().getCatalog("BE")).subjects,
    ).toEqual([]);
  });
});
