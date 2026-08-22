import { describe, expect, it } from "vitest";
import { DemoCoursesService } from "./demo-courses.service";

describe("DemoCoursesService", () => {
  it("returns deterministic relevance-first results and minor-unit prices", async () => {
    const service = new DemoCoursesService();
    const first = await service.searchTutors({
      marketCode: "FR",
      subjectId: "subject_mathematics",
      levelIds: ["middle_school"],
      deliveryModes: ["online"],
      sort: "relevance",
    });
    const second = await service.searchTutors({
      marketCode: "FR",
      subjectId: "subject_mathematics",
      levelIds: ["middle_school"],
      deliveryModes: ["online"],
      sort: "relevance",
    });
    expect(second).toEqual(first);
    expect(first.items.length).toBeGreaterThan(0);
    expect(first.items.every((item) => Number.isInteger(item.fromPrice.amountMinor))).toBe(true);
  });

  it("does not apply a rating filter to profiles without enough verified reviews", async () => {
    const service = new DemoCoursesService();
    const result = await service.searchTutors({ marketCode: "FR", minRating: 4.5 });
    expect(
      result.items.every(
        (item) =>
          item.tutor.ratingIsStatisticallyMeaningful &&
          (item.tutor.rating || 0) >= 4.5,
      ),
    ).toBe(true);
  });

  it("keeps saved tutors isolated by account", async () => {
    const service = new DemoCoursesService();
    await service.toggleSavedTutor("account_a", "tutor_thomas");
    expect(await service.getSavedTutorIds("account_a")).toContain("tutor_thomas");
    expect(await service.getSavedTutorIds("account_b")).not.toContain("tutor_thomas");
  });

  it("requires guardian details for a minor", async () => {
    const service = new DemoCoursesService();
    await expect(
      service.submitLearnerRequest({
        marketCode: "FR",
        subjectId: "subject_mathematics",
        levelId: "middle_school",
        objective: "Préparer le brevet avec un suivi hebdomadaire régulier.",
        preferredSchedule: ["samedi_matin"],
        deliveryModes: ["online"],
        desiredStartDate: "2026-09-01",
        context: "Élève de troisième.",
        learnerAgeBand: "13_15",
      }),
    ).rejects.toThrow(/responsable légal/i);
  });

  it("keeps Phase 2 disabled and guards unsafe payment activation", async () => {
    const service = new DemoCoursesService();
    const catalog = await service.getCatalog("FR");
    expect(catalog.config.featureFlags.bookingEnabled).toBe(false);
    await expect(
      service.updateMarketConfig("FR", {
        ...catalog.config,
        featureFlags: { ...catalog.config.featureFlags, paymentsEnabled: true },
      }),
    ).rejects.toThrow(/nécessitent les réservations/i);
  });

  it("releases lead contact after acceptance", async () => {
    const service = new DemoCoursesService();
    const workspace = await service.getTutorWorkspace("tutor_sophie");
    const lead = workspace.leads[0];
    const accepted = await service.respondToLead(
      "tutor_sophie",
      lead.id,
      "accept",
    );
    expect(accepted.contactReleaseStatus).toBe("released");
    expect(accepted.state).toBe("accepted");
  });
});
