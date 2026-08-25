import {
  IModerationRepository,
  ModerationAppealRecord,
  ModerationCaseStatus,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { MODERATION_CONSTRAINTS } from "@shongre/contracts";

export class ModerationService {
  constructor(
    private readonly repository: IModerationRepository = repositories.moderation,
  ) {}

  listCases(status?: string) {
    const allowed = new Set<ModerationCaseStatus>([
      "open",
      "triaged",
      "under_review",
      "actioned",
      "dismissed",
      "appealed",
      "closed",
    ]);
    if (status && !allowed.has(status as ModerationCaseStatus))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Statut de dossier invalide.",
      });
    return this.repository.listCases(
      status as ModerationCaseStatus | undefined,
    );
  }

  async submitAppeal(userId: string, caseId: string, reason: string) {
    if (
      !caseId ||
      typeof reason !== "string" ||
      reason.trim().length < MODERATION_CONSTRAINTS.appealReasonMinLength ||
      reason.length > MODERATION_CONSTRAINTS.appealReasonMaxLength
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le recours doit contenir entre 20 et 5 000 caractères.",
      });
    return this.repository.submitAppeal({
      caseId,
      appellantId: userId,
      reason: reason.trim(),
    });
  }

  listOwnAppeals(userId: string) {
    return this.repository.listAppeals({ appellantId: userId });
  }

  listOwnCases(userId: string) {
    return this.repository.listOwnCases(userId);
  }

  listAppeals(status?: string) {
    const allowed = new Set<ModerationAppealRecord["status"]>([
      "submitted",
      "under_review",
      "upheld",
      "overturned",
      "rejected",
      "withdrawn",
    ]);
    if (status && !allowed.has(status as ModerationAppealRecord["status"]))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Statut de recours invalide.",
      });
    return this.repository.listAppeals({
      status: status as ModerationAppealRecord["status"] | undefined,
    });
  }

  async decideAppeal(input: {
    appealId: string;
    reviewerId: string;
    decision: "upheld" | "overturned" | "rejected";
    reason: string;
  }) {
    if (!new Set(["upheld", "overturned", "rejected"]).has(input.decision))
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Décision de recours invalide.",
      });
    if (
      typeof input.reason !== "string" ||
      input.reason.trim().length <
        MODERATION_CONSTRAINTS.appealReviewReasonMinLength ||
      input.reason.length > MODERATION_CONSTRAINTS.appealReasonMaxLength
    )
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Le motif doit contenir entre 10 et 5 000 caractères.",
      });
    return this.repository.decideAppeal({
      ...input,
      reason: input.reason.trim(),
    });
  }
}

export const moderationService = new ModerationService();
