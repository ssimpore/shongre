import { reportInputSchema, type ReportInput } from "@shongre/contracts";
import { apiOperation } from "@/api/generated-api-operation";
import type { operations } from "@shongre/contracts/openapi";

type ReportRequest =
  operations["postReports"]["requestBody"]["content"]["application/json"];
type BlockRequest =
  operations["postMessagingBlock"]["requestBody"]["content"]["application/json"];
type UnblockRequest =
  operations["postMessagingUnblock"]["requestBody"]["content"]["application/json"];

export interface ModerationService {
  report(input: ReportInput): Promise<void>;
  blockUser(targetUserId: string): Promise<void>;
  unblockUser(targetUserId: string): Promise<void>;
}

export class HttpModerationService implements ModerationService {
  async report(input: ReportInput): Promise<void> {
    const payload: ReportRequest = reportInputSchema.parse(input);
    await apiOperation("postReports", { body: payload });
  }
  async blockUser(targetUserId: string): Promise<void> {
    const payload: BlockRequest = { targetUserId };
    await apiOperation("postMessagingBlock", { body: payload });
  }
  async unblockUser(targetUserId: string): Promise<void> {
    const payload: UnblockRequest = { targetUserId };
    await apiOperation("postMessagingUnblock", { body: payload });
  }
}

export const moderationService: ModerationService = new HttpModerationService();
