import { config } from "../../app/config/index.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";
import { logger } from "../../infrastructure/logging/logger.js";

/**
 * Posts the earned portion of deferred subscription revenue.
 *
 * The database function owns locking, idempotency, double-entry posting and
 * schedule completion. The worker is deliberately a thin scheduling boundary.
 */
export class RevenueRecognitionWorker {
  async run(asOf = new Date()) {
    if (config.dataMode !== "database") {
      return { skipped: true, reason: "demo_mode" } as const;
    }

    const client = getSupabaseAdminClient() as any;
    const recognitionDate = asOf.toISOString().slice(0, 10);
    const { data, error } = await client.rpc("recognize_due_finance_revenue", {
      p_as_of: recognitionDate,
      p_batch_size: 500,
    });
    if (error) throw error;

    const processed = Number(data ?? 0);
    logger.info("finance_revenue_recognition_completed", {
      asOf: recognitionDate,
      processed,
    });
    return { skipped: false, asOf: recognitionDate, processed } as const;
  }
}

export const revenueRecognitionWorker = new RevenueRecognitionWorker();
