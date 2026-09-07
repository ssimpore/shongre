import { randomUUID } from "node:crypto";
import { config } from "../../app/config/index.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";

export interface DiscoveryEventOutboxRecord {
  id: string;
  request_id: string;
  market_code: string;
  category_id: string | null;
  ranking_version: string;
  applied_filter_keys: string[];
  organic_candidate_count: number;
  sponsored_candidate_count: number;
  duplicate_suppression_count: number;
  diversity_rerank_count: number;
  final_organic_count: number;
  final_sponsored_count: number;
  publisher_distribution: Record<string, number>;
  latency_ms: number | null;
  attempt_count: number;
}

export interface DiscoveryEventOutboxStore {
  claim(workerId: string, limit: number): Promise<DiscoveryEventOutboxRecord[]>;
  persist(event: DiscoveryEventOutboxRecord): Promise<void>;
  complete(input: {
    eventId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }): Promise<void>;
}

interface RpcClient {
  rpc(
    name: string,
    parameters: Record<string, unknown>,
  ): Promise<{ data: unknown; error: { code?: string } | null }>;
  from(table: string): {
    upsert(
      value: Record<string, unknown>,
      options: { onConflict: string; ignoreDuplicates: boolean },
    ): Promise<{ error: { code?: string } | null }>;
  };
}

class PostgresDiscoveryEventOutboxStore implements DiscoveryEventOutboxStore {
  private client(): RpcClient {
    return getSupabaseAdminClient() as unknown as RpcClient;
  }

  async claim(workerId: string, limit: number) {
    const { data, error } = await this.client().rpc(
      "claim_discovery_search_events",
      {
        p_worker_id: workerId,
        p_limit: Math.max(1, Math.min(200, Math.trunc(limit))),
        p_lease_seconds: 60,
      },
    );
    if (error || !Array.isArray(data)) {
      throw new Error(
        `DISCOVERY_EVENT_CLAIM_FAILED:${error?.code ?? "UNKNOWN"}`,
      );
    }
    return data as DiscoveryEventOutboxRecord[];
  }

  async persist(event: DiscoveryEventOutboxRecord) {
    const { error } = await this.client()
      .from("discovery_search_events")
      .upsert(
        {
          request_id: event.request_id,
          market_code: event.market_code,
          category_id: event.category_id,
          ranking_version: event.ranking_version,
          applied_filter_keys: event.applied_filter_keys,
          organic_candidate_count: event.organic_candidate_count,
          sponsored_candidate_count: event.sponsored_candidate_count,
          duplicate_suppression_count: event.duplicate_suppression_count,
          diversity_rerank_count: event.diversity_rerank_count,
          final_organic_count: event.final_organic_count,
          final_sponsored_count: event.final_sponsored_count,
          publisher_distribution: event.publisher_distribution,
          latency_ms: event.latency_ms,
        },
        { onConflict: "request_id", ignoreDuplicates: true },
      );
    if (error) {
      throw new Error(
        `DISCOVERY_EVENT_PERSIST_FAILED:${error.code ?? "UNKNOWN"}`,
      );
    }
  }

  async complete(input: {
    eventId: string;
    workerId: string;
    success: boolean;
    errorCode?: string;
    retryAt?: string;
  }) {
    const { data, error } = await this.client().rpc(
      "complete_discovery_search_event",
      {
        p_event_id: input.eventId,
        p_worker_id: input.workerId,
        p_success: input.success,
        p_error_code: input.errorCode ?? null,
        p_retry_at: input.retryAt ?? null,
      },
    );
    if (error || data !== true) {
      throw new Error("DISCOVERY_EVENT_COMPLETION_FAILED");
    }
  }
}

export class DiscoveryEventWorker {
  constructor(
    private readonly store: DiscoveryEventOutboxStore = new PostgresDiscoveryEventOutboxStore(),
    private readonly workerId = `discovery-${process.pid}-${randomUUID()}`,
    private readonly enabled = () => config.dataMode === "database",
  ) {}

  async run(limit = 100): Promise<{
    claimed: number;
    completed: number;
    retried: number;
  }> {
    if (!this.enabled()) return { claimed: 0, completed: 0, retried: 0 };
    const events = await this.store.claim(this.workerId, limit);
    const result = { claimed: events.length, completed: 0, retried: 0 };
    for (const event of events) {
      try {
        await this.store.persist(event);
        await this.store.complete({
          eventId: event.id,
          workerId: this.workerId,
          success: true,
        });
        result.completed += 1;
      } catch (cause) {
        const errorCode = String(
          cause instanceof Error ? cause.message : "DISCOVERY_EVENT_UNKNOWN",
        ).slice(0, 120);
        const retryAt = new Date(
          Date.now() +
            Math.min(
              6 * 60 * 60 * 1_000,
              30_000 * 2 ** Math.min(event.attempt_count, 9),
            ),
        ).toISOString();
        await this.store.complete({
          eventId: event.id,
          workerId: this.workerId,
          success: false,
          errorCode,
          retryAt,
        });
        result.retried += 1;
        logger.error("discovery_event_worker_failed", {
          eventId: event.id,
          requestId: event.request_id,
          marketCode: event.market_code,
          errorCode,
        });
      }
    }
    if (events.length) logger.info("discovery_event_batch_completed", result);
    return result;
  }
}

export const discoveryEventWorker = new DiscoveryEventWorker();
