import { reportInputSchema, type ReportInput } from "@shongre/contracts";
import { apiRequest } from "@/api/http-client";
import { mobileEnvironment } from "@/config/environment";

export interface ModerationService {
  report(input: ReportInput): Promise<void>;
  blockUser(targetUserId: string): Promise<void>;
  unblockUser(targetUserId: string): Promise<void>;
}

export class DemoModerationService implements ModerationService {
  private blockedUsers = new Set<string>();
  async report(input: ReportInput): Promise<void> {
    reportInputSchema.parse(input);
  }
  async blockUser(targetUserId: string): Promise<void> {
    if (!targetUserId) throw new Error("Utilisateur invalide.");
    this.blockedUsers.add(targetUserId);
  }
  async unblockUser(targetUserId: string): Promise<void> {
    this.blockedUsers.delete(targetUserId);
  }
}

export class HttpModerationService implements ModerationService {
  async report(input: ReportInput): Promise<void> {
    await apiRequest("/reports", {
      method: "POST",
      body: JSON.stringify(reportInputSchema.parse(input)),
    });
  }
  async blockUser(targetUserId: string): Promise<void> {
    await apiRequest("/messaging/block", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
  }
  async unblockUser(targetUserId: string): Promise<void> {
    await apiRequest("/messaging/unblock", {
      method: "POST",
      body: JSON.stringify({ targetUserId }),
    });
  }
}

export const moderationService: ModerationService =
  mobileEnvironment.dataMode === "demo"
    ? new DemoModerationService()
    : new HttpModerationService();
