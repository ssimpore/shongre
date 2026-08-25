import { describe, expect, it } from "vitest";
import { EmploymentService } from "../../src/modules/employment/employment.service.js";
import { DemoEmploymentRepository } from "../../src/infrastructure/database/repositories/employment.repository.js";

const createService = () =>
  new EmploymentService(new DemoEmploymentRepository());

class MutableEmploymentRepository extends DemoEmploymentRepository {
  expireJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job)
      this.jobs.set(jobId, { ...job, expiresAt: "2020-01-01T00:00:00.000Z" });
  }

  clearEmployerJobs(employerId: string) {
    for (const [jobId, job] of this.jobs) {
      if (job.employer.id === employerId) this.jobs.delete(jobId);
    }
  }
}

const standardJobData = (overrides: Record<string, unknown> = {}) => ({
  title: "Responsable qualité web",
  employerId: "employer-technova",
  employer: {
    id: "employer-technova",
    organizationId: "organization-technova",
    name: "TechNova",
    slug: "technova",
    employerTypeId: "employment.fr.employer_type.company",
    verificationLevel: "domain_verified",
    isPubliclyVerified: true,
  },
  professionId: "employment.fr.profession.frontend_engineer",
  professionLabel: "Développeur·se front-end",
  industryId: "employment.fr.sector.technology",
  industryLabel: "Technologie & Numérique",
  contractTypeId: "employment.fr.contract_type.permanent",
  contractTypeLabel: "Emploi permanent",
  workingArrangementId: "employment.fr.working_arrangement.hybrid",
  workingArrangementLabel: "Hybride",
  workingTimeId: "employment.fr.work_schedule.full_time",
  responsibilities: ["Définir et suivre la qualité des interfaces web"],
  requiredSkills: ["Accessibilité"],
  city: "Lyon",
  postalCode: "69002",
  countryCode: "FR",
  applicationMethod: "shongre",
  ...overrides,
});

describe("EmploymentService", () => {
  it("creates one recoverable draft per owner and normalizes publication form data server-side", async () => {
    const service = createService();
    const first = await service.getOrCreateOwnDraft("user_pro_atelier", "FR");
    const second = await service.getOrCreateOwnDraft("user_pro_atelier", "fr");
    expect(second.id).toBe(first.id);
    const normalized = await service.saveOwnPublicationDraft(
      "user_pro_atelier",
      first.id,
      {
        marketCode: "FR",
        countryCode: "FR",
        currentStep: 4,
        privateEmployer: false,
        selectedOfferId: "employment.employer.free",
        selectedAddOnIds: [],
        duplicateCandidateIds: [],
        data: {
          employerId: "employer-technova",
          title: "Responsable qualité web",
          professionId: "employment.fr.profession.frontend_engineer",
          industryId: "employment.fr.sector.technology",
          contractTypeId: "employment.fr.contract_type.permanent",
          workingArrangementId: "employment.fr.working_arrangement.hybrid",
          workingTimeId: "employment.fr.work_schedule.full_time",
          responsibilities: "Qualité, Accessibilité",
          requiredSkills: "Accessibilité, TypeScript",
          preferredSkills: "React",
          city: "Lyon",
          postalCode: "69002",
          positionsCount: "1",
          publishSalary: true,
          salaryMinimum: "3500",
          salaryFrequencyId: "employment.fr.salary_frequency.monthly",
          screeningQuestion: "Décrivez un audit récent",
        },
      },
    );
    expect(normalized.data.responsibilities).toEqual([
      "Qualité",
      "Accessibilité",
    ]);
    expect(normalized.data.salary).toMatchObject({
      minimum: { amountMinor: 350_000, currency: "EUR" },
    });
    expect(normalized.screeningQuestions).toHaveLength(1);
  });

  it("keeps the standard employer publication path free and available to a private employer", async () => {
    const service = createService();
    const catalog = await service.getCatalog("FR");
    const free = catalog.offers.find(
      (offer) => offer.id === "employment.employer.free",
    );

    expect(free?.prices[0].amount.amountMinor).toBe(0);
    expect(catalog.config.featureFlags.privateEmployersEnabled).toBe(true);

    await service.saveOwnDraft("user-private-employer", "draft-private", {
      privateEmployer: true,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      selectedOfferId: "employment.employer.free",
      data: {
        title: "Aide à domicile déclarée",
        employerId: "employer-private-new",
        employer: {
          id: "employer-private-new",
          name: "Employeur particulier",
          slug: "employeur-particulier-test",
          employerTypeId: "private_employer",
          verificationLevel: "self_declared",
          isPubliclyVerified: false,
        },
        professionId: "employment.fr.profession.care_assistant",
        professionLabel: "Auxiliaire de vie",
        industryId: "employment.fr.sector.health_social",
        industryLabel: "Santé & Social",
        contractTypeId: "employment.fr.contract_type.permanent",
        contractTypeLabel: "Emploi permanent",
        workingArrangementId: "employment.fr.working_arrangement.onsite",
        workingArrangementLabel: "Sur site",
        workingTimeId: "employment.fr.work_schedule.part_time",
        responsibilities: ["Accompagner les gestes du quotidien"],
        requiredSkills: ["Accompagnement"],
        city: "Lyon",
        postalCode: "69005",
        countryCode: "FR",
        applicationMethod: "shongre",
      },
    });

    const result = await service.submitOwnDraft(
      "user-private-employer",
      "draft-private",
    );
    expect(result.lifecycle).toBe("pending_review");
  });

  it("lets candidates apply without payment and prevents an accidental duplicate", async () => {
    const service = createService();
    const input = {
      cvId: "cv-thomas-2026",
      coverMessage: "Disponible pour échanger.",
      screeningAnswers: [],
      privacyConsent: true,
      privacyPolicyVersion: "fr-employment-2026-08",
    };

    const application = await service.apply(
      "user_thomas",
      "job-seasonal-nice",
      input,
    );
    expect(application.systemState).toBe("received");
    await expect(
      service.apply("user_thomas", "job-seasonal-nice", input),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("never exposes recruiter notes in the candidate workspace", async () => {
    const service = createService();
    const candidate = await service.getOwnCandidateWorkspace("user_thomas");
    const recruiter = await service.getOwnRecruiterWorkspace(
      "user_pro_atelier",
      "employer-technova",
    );

    expect(recruiter.recruiterNotes.length).toBeGreaterThan(0);
    expect("recruiterNotes" in candidate).toBe(false);
    expect(JSON.stringify(candidate)).not.toContain(
      "Préparer les questions accessibilité",
    );
  });

  it("audits permitted pipeline transitions and rejects unauthorized recruiters", async () => {
    const service = createService();
    const moved = await service.moveApplication(
      "user_pro_atelier",
      "employer-technova",
      "application-data",
      { stageId: "employment.stage.shortlisted", notifyCandidate: true },
    );
    expect(moved.candidateVisibleStatus).toBe("Présélectionnée");

    await expect(
      service.moveApplication(
        "user_thomas",
        "employer-technova",
        "application-data",
        {
          stageId: "employment.stage.offer",
        },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("validates interview time zones and keeps imports idempotent", async () => {
    const service = createService();
    await expect(
      service.scheduleInterview(
        "user_pro_atelier",
        "employer-technova",
        "application-data",
        {
          modeId: "video",
          timezone: "Mars/Olympus",
          startsAt: "2026-08-28T12:00:00.000Z",
          endsAt: "2026-08-28T13:00:00.000Z",
          participantUserIds: ["user_thomas", "user_pro_atelier"],
        },
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const input = {
      sourceType: "json_api",
      sourceIdentifier: "technova-careers-v2",
      idempotencyKey: "technova-sync-unique-1",
    } as const;
    const first = await service.requestImport(
      "user_pro_atelier",
      "employer-technova",
      input,
    );
    const second = await service.requestImport(
      "user_pro_atelier",
      "employer-technova",
      input,
    );
    expect(second.id).toBe(first.id);
  });

  it("flags potentially discriminatory wording as advisory, not a legal decision", async () => {
    const flags = await createService().flagProhibitedLanguage(
      "Nous recherchons un jeune homme. Aucun frais de recrutement ne sera remboursé.",
    );
    expect(flags.length).toBeGreaterThan(0);
    expect(
      flags.every((flag) => flag.requiresHumanReview && !flag.isLegalDecision),
    ).toBe(true);
  });

  it("publishes a company standard offer without requiring a paid entitlement", async () => {
    const repository = new MutableEmploymentRepository();
    repository.clearEmployerJobs("employer-technova");
    const service = new EmploymentService(repository);
    await service.saveOwnDraft("user_pro_atelier", "draft-company-free", {
      employerId: "employer-technova",
      privateEmployer: false,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      selectedOfferId: "employment.employer.free",
      data: standardJobData(),
    });
    await expect(
      service.submitOwnDraft("user_pro_atelier", "draft-company-free"),
    ).resolves.toMatchObject({ lifecycle: "pending_review" });
  });

  it("rejects required-screening omissions and expired jobs before creating an application", async () => {
    const screeningService = createService();
    await expect(
      screeningService.apply("user_thomas", "job-react-lyon", {
        cvId: "cv-thomas-2026",
        screeningAnswers: [],
        privacyConsent: true,
        privacyPolicyVersion: "fr-employment-2026-08",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const repository = new MutableEmploymentRepository();
    repository.expireJob("job-seasonal-nice");
    const expiredService = new EmploymentService(repository);
    await expect(
      expiredService.apply("user_thomas", "job-seasonal-nice", {
        cvId: "cv-thomas-2026",
        screeningAnswers: [],
        privacyConsent: true,
        privacyPolicyVersion: "fr-employment-2026-08",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("lets only the owning candidate answer an interview and keeps participant notifications scoped", async () => {
    const service = createService();
    const cancelled = await service.respondToOwnInterview(
      "user_thomas",
      "interview-react",
      { status: "cancelled" },
    );
    expect(cancelled.status).toBe("cancelled");
    await expect(
      service.respondToOwnInterview("user_camille", "interview-react", {
        status: "confirmed",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("persists candidate alerts, privacy requests and radius filters without sensitive factors", async () => {
    const service = createService();
    const alert = await service.saveOwnJobAlert("user_thomas", {
      label: "Emplois à Lyon",
      query: { marketCode: "FR", location: "Lyon", radiusKm: 50 },
      frequency: "daily",
    });
    expect(alert.query.radiusKm).toBe(50);
    await service.deleteOwnJobAlert("user_thomas", alert.id);
    const request = await service.requestOwnCandidateDeletion("user_thomas");
    expect(request).toMatchObject({
      requestType: "delete",
      status: "accepted",
    });

    const results = await service.search({
      marketCode: "FR",
      location: "Lyon",
      radiusKm: 50,
      sort: "distance",
    });
    expect(
      results.items.some((job) => job.primaryLocation.city === "Saint-Priest"),
    ).toBe(true);
    expect(results.recommendationFactors).not.toContain("âge");
  });

  it("blocks publication for suspended employers", async () => {
    const service = createService();
    await service.saveOwnDraft("user_pro_atelier", "draft-suspended", {
      employerId: "employer-suspended-test",
      privateEmployer: false,
      completedSteps: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      selectedOfferId: "employment.employer.free",
      data: standardJobData({
        employerId: "employer-suspended-test",
        employer: {
          id: "employer-suspended-test",
          name: "Employeur suspendu",
          slug: "employeur-suspendu",
          employerTypeId: "employment.fr.employer_type.company",
          verificationLevel: "domain_verified",
          isPubliclyVerified: true,
        },
      }),
    });
    await expect(
      service.submitOwnDraft("user_pro_atelier", "draft-suspended"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
