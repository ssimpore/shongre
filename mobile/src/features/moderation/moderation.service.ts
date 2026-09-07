import { reportInputSchema, type ReportInput } from "@shongre/contracts";
import type { operations } from "@shongre/contracts/openapi";
import { apiRequest } from "@/api/http-client";

type ReportRequest =
  operations["postReports"]["requestBody"]["content"]["application/json"];
type ReportResponse =
  operations["postReports"]["responses"][200]["content"]["application/json"];
type BlockRequest =
  operations["postMessagingBlock"]["requestBody"]["content"]["application/json"];
type BlockResponse =
  operations["postMessagingBlock"]["responses"][200]["content"]["application/json"];
type UnblockRequest =
  operations["postMessagingUnblock"]["requestBody"]["content"]["application/json"];
type UnblockResponse =
  operations["postMessagingUnblock"]["responses"][200]["content"]["application/json"];

export interface ModerationService {
  report(input: ReportInput): Promise<void>;
  blockUser(targetUserId: string): Promise<void>;
  unblockUser(targetUserId: string): Promise<void>;
}

export class HttpModerationService implements ModerationService {
  async report(input: ReportInput): Promise<void> {
    const payload: ReportRequest = reportInputSchema.parse(input);
    await apiRequest<ReportResponse>("/reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  async blockUser(targetUserId: string): Promise<void> {
    const payload: BlockRequest = { targetUserId };
    await apiRequest<BlockResponse>("/messaging/block", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  async unblockUser(targetUserId: string): Promise<void> {
    const payload: UnblockRequest = { targetUserId };
    await apiRequest<UnblockResponse>("/messaging/unblock", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
}

export const moderationService: ModerationService = new HttpModerationService();
