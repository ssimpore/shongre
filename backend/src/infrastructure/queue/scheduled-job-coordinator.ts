import { randomUUID } from "node:crypto";
import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../supabase/supabase-client.js";

export class ScheduledJobCoordinator {
  readonly ownerId = randomUUID();

  async claim(
    jobName: string,
    intervalSeconds: number,
    leaseSeconds: number,
  ): Promise<boolean> {
    if (config.dataMode === "demo") return true;
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "claim_scheduled_job",
      {
        p_job_name: jobName,
        p_owner_id: this.ownerId,
        p_interval_seconds: intervalSeconds,
        p_lease_seconds: leaseSeconds,
      },
    );
    if (error) throw error;
    return data === true;
  }

  async complete(
    jobName: string,
    intervalSeconds: number,
    errorMessage?: string,
  ): Promise<void> {
    if (config.dataMode === "demo") return;
    const { error } = await (getSupabaseAdminClient() as any).rpc(
      "complete_scheduled_job",
      {
        p_job_name: jobName,
        p_owner_id: this.ownerId,
        p_interval_seconds: intervalSeconds,
        p_error: errorMessage || null,
      },
    );
    if (error) throw error;
  }

  async renew(jobName: string, leaseSeconds: number): Promise<boolean> {
    if (config.dataMode === "demo") return true;
    const { data, error } = await (getSupabaseAdminClient() as any).rpc(
      "renew_scheduled_job_lease",
      {
        p_job_name: jobName,
        p_owner_id: this.ownerId,
        p_lease_seconds: leaseSeconds,
      },
    );
    if (error) throw error;
    return data === true;
  }
}

export const scheduledJobCoordinator = new ScheduledJobCoordinator();
