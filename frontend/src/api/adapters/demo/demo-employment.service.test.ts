import { beforeEach, describe, expect, it } from "vitest";
import type { JobDraft } from "@shongre/contracts/employment";
import { DemoEmploymentService } from "./demo-employment.service";
import { storageService } from "../../../services/storage.service";

describe("DemoEmploymentService", () => {
  beforeEach(() => storageService.setCurrentUserKey("buyer_thomas"));
  it("exposes the canonical market catalog and public offers", async () => {
    const service = new DemoEmploymentService();
    const catalog = await service.getCatalog("fr");
    expect(catalog.activation.verticalType).toBe("employment");
    expect(catalog.activation.categoryIds).toContain("jobs");
    expect(catalog.config.marketCode).toBe("FR");
    expect(
      catalog.dictionaries.some((entry) => entry.kind === "profession"),
    ).toBe(true);
  });

  it("filters jobs deterministically without sensitive candidate attributes", async () => {
    const service = new DemoEmploymentService();
    const result = await service.searchJobs({
      marketCode: "FR",
      keywords: "React",
      professionIds: [],
      jobFamilyIds: [],
      industryIds: [],
      workingArrangementIds: [],
      contractTypeIds: [],
      workingTimeIds: [],
      experienceLevelIds: [],
      educationLevelIds: [],
      languageIds: [],
      scheduleIds: [],
      employerTypeIds: [],
      verifiedEmployerOnly: true,
      accessibilityOnly: false,
      sort: "relevance",
      limit: 24,
    });
    expect(result.items.map((job) => job.id)).toEqual(["job-react-lyon"]);
    expect(result.recommendationFactors).toEqual([
      "profession",
      "compétences",
      "localisation",
      "préférences de travail",
    ]);
  });

  it("keeps publication asynchronous and flags advisory prohibited language", async () => {
    const service = new DemoEmploymentService();
    const draft: JobDraft = {
      id: "draft-test-employment",
      ownerUserId: "user_thomas",
      privateEmployer: true,
      marketCode: "FR",
      schemaVersion: 1,
      currentStep: 8,
      completedSteps: [1, 2, 3, 4, 5, 6, 7],
      data: {
        title: "Jeune auxiliaire de vie",
        city: "Lyon",
        responsibilities:
          "Accompagner les gestes du quotidien avec bienveillance.",
      },
      screeningQuestions: [],
      selectedOfferId: "employment.employer.free",
      selectedAddOnIds: [],
      validationIssues: [],
      duplicateCandidateIds: [],
      updatedAt: "2026-08-22T10:00:00.000Z",
    };
    await service.saveDraft(draft);
    const submission = await service.submitDraft(draft.id);
    expect(submission.lifecycle).toBe("pending_review");
    expect(submission.complianceFlags[0]).toMatchObject({
      isLegalDecision: false,
      requiresHumanReview: true,
    });
  });

  it("prevents duplicate active applications and never charges candidates", async () => {
    const service = new DemoEmploymentService();
    const workspace = await service.getCandidateWorkspace();
    await expect(
      service.apply("job-react-lyon", {
        cvId: workspace.cvs[0].id,
        screeningAnswers: [],
        privacyConsent: true,
        privacyPolicyVersion: "employment-candidate-v1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const job = await service.getJob("job-seasonal-nice");
    expect(job.candidateFeeRequired).toBe(false);
    const application = await service.apply(job.id, {
      cvId: workspace.cvs[0].id,
      screeningAnswers: [],
      privacyConsent: true,
      privacyPolicyVersion: "employment-candidate-v1",
    });
    expect(application.systemState).toBe("received");
  });

  it("makes recruiter imports idempotent", async () => {
    storageService.setCurrentUserKey("pro_employment_clara");
    const service = new DemoEmploymentService();
    const input = {
      sourceType: "csv" as const,
      sourceIdentifier: "offres.csv",
      idempotencyKey: "employment-import-demo-key",
    };
    const first = await service.requestImport("employer-technova", input);
    const replay = await service.requestImport("employer-technova", input);
    expect(replay.id).toBe(first.id);
  });

  it("isolates candidate state and recruiter memberships when the demo user changes", async () => {
    const service = new DemoEmploymentService();
    const thomas = await service.getCandidateWorkspace();
    expect(thomas.profile.userId).toBe("user_thomas");
    expect(thomas.applications.length).toBeGreaterThan(0);
    expect(await service.listRecruiterEmployers()).toEqual([]);

    storageService.setCurrentUserKey("seller_camille");
    const camille = await service.getCandidateWorkspace();
    expect(camille.profile.userId).toBe("user_camille");
    expect(camille.applications).toEqual([]);
    expect(
      (await service.listRecruiterEmployers()).map((employer) => employer.id),
    ).toEqual(["employer-private-martin"]);

    storageService.setCurrentUserKey("pro_employment_clara");
    expect(
      (await service.listRecruiterEmployers()).map((employer) => employer.id),
    ).toEqual(["employer-technova"]);
  });
});
