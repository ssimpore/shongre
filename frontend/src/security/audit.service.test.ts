import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "shongre_security_audit_logs_v1";

class FakeStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = false;

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    if (this.failWrites) {
      throw new DOMException("Storage quota exceeded", "QuotaExceededError");
    }
    this.values.set(key, value);
  }
}

const entry = (details: string, targetId = "listing-1") => ({
  actorId: "user-admin",
  actorName: "Admin",
  actorRole: "admin",
  targetId,
  action: "listing_hidden" as const,
  details,
  market: "FR",
});

describe("bounded browser audit preview", () => {
  let localStorage: FakeStorage;

  beforeEach(() => {
    vi.resetModules();
    localStorage = new FakeStorage();
    vi.stubGlobal("window", { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("caps both entry count and serialized size before every write", async () => {
    const { auditService, AUDIT_LOG_LIMITS } = await import("./audit.service");

    for (let index = 0; index < AUDIT_LOG_LIMITS.entries + 80; index += 1) {
      auditService.logEvent(
        entry(`Événement ${index} ${"x".repeat(2_500)}`, `listing-${index}`),
      );
    }

    const stored = localStorage.getItem(STORAGE_KEY) ?? "";
    expect(JSON.parse(stored).length).toBeLessThanOrEqual(
      AUDIT_LOG_LIMITS.entries,
    );
    expect(new TextEncoder().encode(stored).byteLength).toBeLessThanOrEqual(
      AUDIT_LOG_LIMITS.bytes,
    );
  });

  it("aggregates equivalent repetitive events", async () => {
    const { auditService } = await import("./audit.service");

    for (let index = 0; index < 25; index += 1) {
      auditService.logEvent(entry("Même événement"));
    }

    const matches = auditService
      .getLogs()
      .filter((log) => log.details === "Même événement");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ occurrenceCount: 25 });
    expect(matches[0].firstOccurredAt).toBeTruthy();
  });

  it("keeps working in memory when browser storage is full", async () => {
    const { telemetryService } = await import("../services/telemetry.service");
    const telemetry = vi.spyOn(telemetryService, "captureException");
    const { auditService } = await import("./audit.service");
    localStorage.failWrites = true;

    expect(() => auditService.logEvent(entry("Quota-safe"))).not.toThrow();
    expect(auditService.getLogs()[0]?.details).toBe("Quota-safe");
    expect(telemetry).not.toHaveBeenCalled();
  });

  it("prunes an oversized legacy buffer on first read", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        Array.from({ length: 500 }, (_, index) => ({
          id: `legacy-${index}`,
          timestamp: "2026-01-01T00:00:00.000Z",
          ...entry(`Legacy ${index} ${"y".repeat(4_000)}`, `legacy-${index}`),
        })),
      ),
    );
    const { auditService, AUDIT_LOG_LIMITS } = await import("./audit.service");

    const logs = auditService.getLogs();
    const repaired = localStorage.getItem(STORAGE_KEY) ?? "";
    expect(logs.length).toBeLessThanOrEqual(AUDIT_LOG_LIMITS.entries);
    expect(new TextEncoder().encode(repaired).byteLength).toBeLessThanOrEqual(
      AUDIT_LOG_LIMITS.bytes,
    );
  });
});
