import { describe, expect, it, vi } from "vitest";
import type { MarketInfrastructureConfig } from "@shongre/contracts/market-country";
import * as supabase from "../../infrastructure/supabase/supabase-client.js";
import {
  IndexNowWorker,
  type IndexNowEvent,
  type IndexNowOutboxRepository,
} from "./indexnow-worker.js";

const infrastructure: MarketInfrastructureConfig = {
  franceDomain: "shongre.fr",
  globalDomain: "shongre.com",
  canonicalProtocol: "https",
};

function event(
  id: string,
  marketCode: string,
  canonicalPath: string,
): IndexNowEvent {
  return {
    id,
    listing_id: "00000000-0000-4000-8000-000000000001",
    event_key: `key-${id}`,
    market_code: marketCode,
    canonical_path: canonicalPath,
    event_type: "updated",
    content_updated_at: "2026-09-07T08:00:00.000Z",
    status: "PENDING",
    attempt_count: 0,
    available_at: "2026-09-07T08:00:00.000Z",
    claimed_at: null,
    claimed_by: null,
    completed_at: null,
    last_error_code: null,
    created_at: "2026-09-07T08:00:00.000Z",
  };
}

class MemoryRepository implements IndexNowOutboxRepository {
  readonly completions: Array<{
    eventId: string;
    success: boolean;
    errorCode?: string;
  }> = [];
  claims = 0;

  constructor(private readonly events: IndexNowEvent[]) {}

  async claim(): Promise<IndexNowEvent[]> {
    this.claims += 1;
    return this.events;
  }

  async complete(
    eventId: string,
    _workerId: string,
    success: boolean,
    errorCode?: string,
  ): Promise<void> {
    this.completions.push({ eventId, success, errorCode });
  }

  async purgeCompleted(): Promise<number> {
    return 2;
  }
}

function settings(enabled = true) {
  return {
    enabled,
    key: "shongre-indexnow-key-2026",
    infrastructure,
    timeoutMs: 1_000,
  };
}

describe("IndexNowWorker", () => {
  it("does not initialize a database client while disabled", async () => {
    const client = vi
      .spyOn(supabase, "getSupabaseAdminClient")
      .mockImplementation(() => {
        throw new Error(
          "Disabled workers must not require database credentials",
        );
      });
    try {
      const result = await new IndexNowWorker({
        settings: settings(false),
      }).run();
      expect(result.claimed).toBe(0);
      expect(client).not.toHaveBeenCalled();
    } finally {
      client.mockRestore();
    }
  });

  it("stays inert until an authorized environment explicitly enables it", async () => {
    const repository = new MemoryRepository([
      event("event-fr", "FR", "/annonce/example"),
    ]);
    const fetcher = vi.fn<typeof fetch>();
    const result = await new IndexNowWorker({
      repository,
      fetcher,
      settings: settings(false),
      workerId: "test-worker",
    }).run();
    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      retried: 0,
      skipped: 0,
      purged: 0,
    });
    expect(repository.claims).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("batches canonical URLs by verification host without private payload data", async () => {
    const repository = new MemoryRepository([
      event("event-fr", "FR", "/annonce/fr-example"),
      event("event-be", "BE", "/annonce/be-example"),
      event("event-ch", "CH", "/auto/vehicule/ch-example"),
    ]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 202 }));
    const result = await new IndexNowWorker({
      repository,
      fetcher,
      settings: settings(),
      workerId: "test-worker",
    }).run();

    expect(fetcher).toHaveBeenCalledTimes(2);
    const payloads = fetcher.mock.calls.map(([, init]) =>
      JSON.parse(String(init?.body)),
    );
    expect(payloads).toEqual(
      expect.arrayContaining([
        {
          host: "shongre.fr",
          key: "shongre-indexnow-key-2026",
          keyLocation: "https://shongre.fr/indexnow-key.txt",
          urlList: ["https://shongre.fr/annonce/fr-example"],
        },
        {
          host: "shongre.com",
          key: "shongre-indexnow-key-2026",
          keyLocation: "https://shongre.com/indexnow-key.txt",
          urlList: [
            "https://shongre.com/be/annonce/be-example",
            "https://shongre.com/ch/auto/vehicule/ch-example",
          ],
        },
      ]),
    );
    expect(result).toEqual({
      claimed: 3,
      delivered: 3,
      retried: 0,
      skipped: 0,
      purged: 2,
    });
    expect(repository.completions).toEqual(
      expect.arrayContaining([
        { eventId: "event-fr", success: true, errorCode: undefined },
        { eventId: "event-be", success: true, errorCode: undefined },
        { eventId: "event-ch", success: true, errorCode: undefined },
      ]),
    );
  });

  it("releases failed deliveries for bounded durable retry", async () => {
    const repository = new MemoryRepository([
      event("event-fr", "FR", "/annonce/fr-example"),
    ]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 429 }));
    const result = await new IndexNowWorker({
      repository,
      fetcher,
      settings: settings(),
      workerId: "test-worker",
    }).run();
    expect(result.retried).toBe(1);
    expect(repository.completions).toEqual([
      {
        eventId: "event-fr",
        success: false,
        errorCode: "INDEXNOW_HTTP_429",
      },
    ]);
  });

  it("silently retires events for markets that are not legally indexable", async () => {
    const repository = new MemoryRepository([
      event("event-sn", "SN", "/annonce/sn-example"),
    ]);
    const fetcher = vi.fn<typeof fetch>();
    const result = await new IndexNowWorker({
      repository,
      fetcher,
      settings: settings(),
      workerId: "test-worker",
    }).run();
    expect(result.skipped).toBe(1);
    expect(fetcher).not.toHaveBeenCalled();
    expect(repository.completions).toEqual([
      { eventId: "event-sn", success: true, errorCode: undefined },
    ]);
  });
});
