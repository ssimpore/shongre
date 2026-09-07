import { describe, expect, it, vi } from "vitest";
import {
  DiscoveryEventWorker,
  type DiscoveryEventOutboxRecord,
  type DiscoveryEventOutboxStore,
} from "./discovery-event-worker.js";

const event: DiscoveryEventOutboxRecord = {
  id: "event-1",
  request_id: "82e82ea1-e094-4f12-aa0e-2af272346728",
  market_code: "FR",
  category_id: null,
  ranking_version: "discovery-v1",
  applied_filter_keys: ["marketCode"],
  organic_candidate_count: 12,
  sponsored_candidate_count: 0,
  duplicate_suppression_count: 0,
  diversity_rerank_count: 0,
  final_organic_count: 12,
  final_sponsored_count: 0,
  publisher_distribution: { private: 8, professional: 4 },
  latency_ms: 22,
  attempt_count: 1,
};

function store(): DiscoveryEventOutboxStore {
  return {
    claim: vi.fn().mockResolvedValue([event]),
    persist: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("DiscoveryEventWorker", () => {
  it("persists each leased event before acknowledging it", async () => {
    const outbox = store();
    const worker = new DiscoveryEventWorker(outbox, "worker-1", () => true);

    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      completed: 1,
      retried: 0,
    });
    expect(outbox.persist).toHaveBeenCalledWith(event);
    expect(outbox.complete).toHaveBeenCalledWith({
      eventId: "event-1",
      workerId: "worker-1",
      success: true,
    });
  });

  it("retains failures for bounded retry", async () => {
    const outbox = store();
    vi.mocked(outbox.persist).mockRejectedValueOnce(
      new Error("DISCOVERY_EVENT_PERSIST_FAILED"),
    );
    const worker = new DiscoveryEventWorker(outbox, "worker-1", () => true);

    await expect(worker.run()).resolves.toEqual({
      claimed: 1,
      completed: 0,
      retried: 1,
    });
    expect(outbox.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: "event-1",
        workerId: "worker-1",
        success: false,
        errorCode: "DISCOVERY_EVENT_PERSIST_FAILED",
      }),
    );
  });

  it("does no work outside database mode", async () => {
    const outbox = store();
    const worker = new DiscoveryEventWorker(outbox, "worker-1", () => false);

    await expect(worker.run()).resolves.toEqual({
      claimed: 0,
      completed: 0,
      retried: 0,
    });
    expect(outbox.claim).not.toHaveBeenCalled();
  });
});
