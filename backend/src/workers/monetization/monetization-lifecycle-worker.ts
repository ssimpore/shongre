import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";

export class MonetizationLifecycleWorker {
  async run() {
    if (config.dataMode !== "database") {
      return { skipped: true, reason: "demo_mode" } as const;
    }
    const client = getSupabaseAdminClient() as any;
    const { data: maintenance, error } = await client.rpc(
      "run_monetization_maintenance",
      { p_batch_size: 500 },
    );
    if (error) throw error;
    const { data: recurringCreditsGranted, error: recurringCreditError } =
      await client.rpc("grant_due_subscription_recurring_credits", {
        p_batch_size: 500,
      });
    if (recurringCreditError) throw recurringCreditError;
    const { data: mismatches, error: reconciliationError } = await client
      .from("monetization_reconciliation")
      .select("order_id,reconciliation_status")
      .eq("reconciliation_status", "mismatch")
      .limit(100);
    if (reconciliationError) throw reconciliationError;
    if (mismatches?.length) {
      logger.warn("monetization_reconciliation_mismatches", {
        count: mismatches.length,
        orderIds: mismatches.map((row: any) => String(row.order_id)),
      });
    }
    logger.info("monetization_maintenance_completed", {
      maintenance,
      recurringCreditsGranted,
      reconciliationMismatchCount: mismatches?.length || 0,
    });
    return {
      skipped: false,
      maintenance,
      recurringCreditsGranted: Number(recurringCreditsGranted || 0),
      reconciliationMismatchCount: mismatches?.length || 0,
    } as const;
  }
}

export const monetizationLifecycleWorker = new MonetizationLifecycleWorker();
