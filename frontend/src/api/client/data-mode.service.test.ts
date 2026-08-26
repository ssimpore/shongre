import { describe, expect, it, vi } from "vitest";

import {
  DATA_MODE_STORAGE_KEY,
  DataModeService,
  resolveLiveReadinessUrl,
} from "./data-mode.service";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const availableResponse = { ok: true, status: 200 } as Response;

describe("DataModeService", () => {
  it("uses Demo mode by default", () => {
    const service = new DataModeService({
      storage: new MemoryStorage(),
      defaultMode: "demo",
    });

    expect(service.getActiveMode()).toBe("demo");
  });

  it("persists a validated Live selection across service instances", async () => {
    const storage = new MemoryStorage();
    const fetcher = vi.fn().mockResolvedValue(availableResponse);
    const service = new DataModeService({
      storage,
      fetcher,
      apiBaseUrl: "https://api.shongre.test/api/v1",
      defaultMode: "demo",
    });

    await service.selectMode("api");

    expect(fetcher).toHaveBeenCalledWith(
      "https://api.shongre.test/readyz",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(storage.getItem(DATA_MODE_STORAGE_KEY)).toBe("api");
    expect(
      new DataModeService({ storage, defaultMode: "demo" }).getActiveMode(),
    ).toBe("api");
  });

  it("invokes the runtime fetcher with the global receiver", async () => {
    const fetcher = vi.fn(function (this: typeof globalThis) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(availableResponse);
    });
    const service = new DataModeService({
      storage: new MemoryStorage(),
      fetcher,
      apiBaseUrl: "https://api.shongre.test/api/v1",
      defaultMode: "api",
    });

    await expect(service.assertLiveAvailable()).resolves.toBeUndefined();
    expect(fetcher.mock.instances[0]).toBe(globalThis);
  });

  it("rejects an unconfigured Live mode without changing the selection", async () => {
    const storage = new MemoryStorage();
    const service = new DataModeService({
      storage,
      apiBaseUrl: "",
      defaultMode: "demo",
    });

    await expect(service.selectMode("api")).rejects.toMatchObject({
      code: "LIVE_API_NOT_CONFIGURED",
    });
    expect(service.getActiveMode()).toBe("demo");
    expect(storage.getItem(DATA_MODE_STORAGE_KEY)).toBeNull();
  });

  it("does not fall back or persist when the configured API is unavailable", async () => {
    const storage = new MemoryStorage();
    const service = new DataModeService({
      storage,
      fetcher: vi
        .fn()
        .mockResolvedValue({ ok: false, status: 503 } as Response),
      apiBaseUrl: "https://api.shongre.test/api/v1",
      defaultMode: "demo",
    });

    await expect(service.selectMode("api")).rejects.toMatchObject({
      code: "LIVE_API_UNAVAILABLE",
    });
    expect(service.getActiveMode()).toBe("demo");
    expect(storage.getItem(DATA_MODE_STORAGE_KEY)).toBeNull();
  });

  it("removes an invalid persisted value instead of inventing a mode", () => {
    const storage = new MemoryStorage();
    storage.setItem(DATA_MODE_STORAGE_KEY, "automatic");

    const service = new DataModeService({ storage, defaultMode: "demo" });

    expect(service.getActiveMode()).toBe("demo");
    expect(storage.getItem(DATA_MODE_STORAGE_KEY)).toBeNull();
  });
});

describe("resolveLiveReadinessUrl", () => {
  it("checks readiness outside the versioned API prefix", () => {
    expect(resolveLiveReadinessUrl("http://127.0.0.1:4000/api/v1")).toBe(
      "http://127.0.0.1:4000/readyz",
    );
  });
});
