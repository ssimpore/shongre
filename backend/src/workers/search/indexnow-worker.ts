import { randomUUID } from "node:crypto";
import {
  buildPublicUrl,
  COUNTRY_REGISTRY,
  type MarketInfrastructureConfig,
} from "@shongre/contracts/market-country";
import { config } from "../../app/config/index.js";
import type { Database } from "../../generated/database.types.js";
import { databaseFailure } from "../../infrastructure/database/repositories/repository-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { getSupabaseAdminClient } from "../../infrastructure/supabase/supabase-client.js";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

export type IndexNowEvent =
  Database["public"]["Tables"]["indexnow_events"]["Row"];

export interface IndexNowOutboxRepository {
  claim(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<IndexNowEvent[]>;
  complete(
    eventId: string,
    workerId: string,
    success: boolean,
    errorCode?: string,
  ): Promise<void>;
  purgeCompleted(retentionDays: number, limit: number): Promise<number>;
}

export class PostgresIndexNowOutboxRepository implements IndexNowOutboxRepository {
  private readonly client = getSupabaseAdminClient();

  async claim(
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<IndexNowEvent[]> {
    const { data, error } = await this.client.rpc("claim_indexnow_events", {
      p_worker_id: workerId,
      p_limit: limit,
      p_lease_seconds: leaseSeconds,
    });
    if (error || !data) databaseFailure("indexNow.claim", error);
    return data;
  }

  async complete(
    eventId: string,
    workerId: string,
    success: boolean,
    errorCode?: string,
  ): Promise<void> {
    const { error } = await this.client.rpc("complete_indexnow_event", {
      p_event_id: eventId,
      p_worker_id: workerId,
      p_success: success,
      ...(errorCode ? { p_error_code: errorCode } : {}),
    });
    if (error) databaseFailure("indexNow.complete", error);
  }

  async purgeCompleted(retentionDays: number, limit: number): Promise<number> {
    const { data, error } = await this.client.rpc(
      "purge_completed_indexnow_events",
      {
        p_retention_days: retentionDays,
        p_limit: limit,
      },
    );
    if (error || data === null) databaseFailure("indexNow.purge", error);
    return Number(data);
  }
}

interface IndexNowSettings {
  enabled: boolean;
  key: string;
  infrastructure: MarketInfrastructureConfig;
  timeoutMs: number;
}

interface IndexNowWorkerDependencies {
  repository?: IndexNowOutboxRepository;
  fetcher?: typeof fetch;
  settings?: IndexNowSettings;
  workerId?: string;
}

function marketCanBeIndexed(marketCode: string): boolean {
  const country = COUNTRY_REGISTRY.find(
    (candidate) => candidate.code === marketCode,
  );
  return Boolean(
    country &&
    country.enabled &&
    country.marketplace.enabled &&
    country.seo.indexable &&
    country.compliance.legalReviewStatus === "approved" &&
    ["active", "beta"].includes(country.launchStatus),
  );
}

export class IndexNowWorker {
  private readonly repository: IndexNowOutboxRepository;
  private readonly fetcher: typeof fetch;
  private readonly settings: IndexNowSettings;
  private readonly workerId: string;

  constructor(dependencies: IndexNowWorkerDependencies = {}) {
    this.repository =
      dependencies.repository ?? new PostgresIndexNowOutboxRepository();
    this.fetcher = dependencies.fetcher ?? fetch;
    this.settings = dependencies.settings ?? {
      enabled: config.indexNow.enabled,
      key: config.indexNow.key,
      infrastructure: config.marketInfrastructure,
      timeoutMs: config.performance.providerRequestTimeoutMs,
    };
    this.workerId =
      dependencies.workerId || `indexnow-worker-${process.pid}-${randomUUID()}`;
  }

  async run(limit = 1_000): Promise<{
    claimed: number;
    delivered: number;
    retried: number;
    skipped: number;
    purged: number;
  }> {
    const result = {
      claimed: 0,
      delivered: 0,
      retried: 0,
      skipped: 0,
      purged: 0,
    };
    if (!this.settings.enabled) return result;

    const events = await this.repository.claim(
      this.workerId,
      Math.max(1, Math.min(1_000, Math.trunc(limit))),
      120,
    );
    result.claimed = events.length;

    const groups = new Map<
      string,
      { origin: string; urls: Map<string, IndexNowEvent[]> }
    >();
    for (const event of events) {
      if (!marketCanBeIndexed(event.market_code)) {
        await this.repository.complete(event.id, this.workerId, true);
        result.skipped += 1;
        continue;
      }
      try {
        const url = buildPublicUrl({
          country: event.market_code,
          route: event.canonical_path,
          infrastructure: this.settings.infrastructure,
        });
        const parsed = new URL(url);
        const group = groups.get(parsed.host) ?? {
          origin: parsed.origin,
          urls: new Map<string, IndexNowEvent[]>(),
        };
        group.urls.set(url, [...(group.urls.get(url) ?? []), event]);
        groups.set(parsed.host, group);
      } catch {
        await this.repository.complete(
          event.id,
          this.workerId,
          false,
          "INVALID_CANONICAL_URL",
        );
        result.retried += 1;
      }
    }

    for (const [host, group] of groups) {
      const urlList = [...group.urls.keys()];
      try {
        const response = await this.fetcher(INDEXNOW_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            host,
            key: this.settings.key,
            keyLocation: new URL(INDEXNOW_KEY_PATH, group.origin).toString(),
            urlList,
          }),
          signal: AbortSignal.timeout(this.settings.timeoutMs),
        });
        if (![200, 202].includes(response.status)) {
          throw new Error(`INDEXNOW_HTTP_${response.status}`);
        }
        const deliveredEvents = [...group.urls.values()].flat();
        await Promise.all(
          deliveredEvents.map((event) =>
            this.repository.complete(event.id, this.workerId, true),
          ),
        );
        result.delivered += deliveredEvents.length;
      } catch (error) {
        const errorCode =
          error instanceof Error
            ? error.message.slice(0, 120)
            : "INDEXNOW_DELIVERY_FAILED";
        const retryEvents = [...group.urls.values()].flat();
        await Promise.all(
          retryEvents.map((event) =>
            this.repository.complete(event.id, this.workerId, false, errorCode),
          ),
        );
        result.retried += retryEvents.length;
        logger.error("indexnow_delivery_failed", {
          host,
          eventCount: retryEvents.length,
          errorCode,
        });
      }
    }

    result.purged = await this.repository.purgeCompleted(30, 1_000);
    return result;
  }
}

export const indexNowWorker = new IndexNowWorker();
