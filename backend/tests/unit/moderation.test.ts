import { describe, expect, it } from "vitest";
import { DemoModerationRepository } from "../../src/infrastructure/database/repositories/moderation.repository.js";
import { ModerationService } from "../../src/modules/moderation/moderation.service.js";

describe("moderation cases and appeals", () => {
  it("resolves a report once and rejects actions incompatible with its target", async () => {
    const repository = new DemoModerationRepository();
    await expect(
      repository.resolveCase({
        reportId: "rep_1",
        actorId: "moderator_one",
        action: "ban_user",
        reason: "Le dossier vise une annonce et non un compte.",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    const resolved = await repository.resolveCase({
      reportId: "rep_1",
      actorId: "moderator_one",
      action: "remove_listing",
      reason: "La preuve confirme une annonce interdite.",
    });
    expect(resolved.status).toBe("actioned");
    await expect(
      repository.resolveCase({
        reportId: "rep_1",
        actorId: "moderator_two",
        action: "dismiss",
        reason: "Tentative de seconde décision sur le dossier.",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("allows only the affected account to appeal an enforcement action", async () => {
    const repository = new DemoModerationRepository();
    const service = new ModerationService(repository);
    const [caseRecord] = await repository.listCases("open");
    await repository.resolveCase({
      reportId: caseRecord!.reportId,
      actorId: "moderator_one",
      action: "remove_listing",
      reason: "Décision initiale suffisamment documentée.",
    });
    await expect(
      service.submitAppeal(
        "unrelated_user",
        caseRecord!.id,
        "Je conteste cette décision avec des justificatifs précis.",
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const appeal = await service.submitAppeal(
      "user_camille",
      caseRecord!.id,
      "Je conteste cette décision et fournis une preuve d’authenticité.",
    );
    expect(appeal.status).toBe("submitted");
    expect(await service.listOwnAppeals("user_camille")).toHaveLength(1);
  });

  it("requires an independent reviewer and serializes the appeal decision", async () => {
    const repository = new DemoModerationRepository();
    const service = new ModerationService(repository);
    const [caseRecord] = await repository.listCases("open");
    await repository.resolveCase({
      reportId: caseRecord!.reportId,
      actorId: "moderator_one",
      action: "remove_listing",
      reason: "Décision initiale suffisamment documentée.",
    });
    const appeal = await service.submitAppeal(
      "user_camille",
      caseRecord!.id,
      "Le justificatif joint démontre que la décision doit être revue.",
    );
    await expect(
      service.decideAppeal({
        appealId: appeal.id,
        reviewerId: "moderator_one",
        decision: "overturned",
        reason: "Le premier décideur ne peut pas réexaminer son dossier.",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const outcomes = await Promise.allSettled([
      service.decideAppeal({
        appealId: appeal.id,
        reviewerId: "moderator_two",
        decision: "overturned",
        reason: "Les nouvelles preuves justifient l’annulation de la mesure.",
      }),
      service.decideAppeal({
        appealId: appeal.id,
        reviewerId: "moderator_three",
        decision: "upheld",
        reason: "La seconde décision concurrente ne doit pas être appliquée.",
      }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
  });
});
