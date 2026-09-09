import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearReferenceDataCache,
  isCacheableOperation,
  referenceCacheKey,
  withReferenceCache,
} from "./reference-data-cache";

/**
 * What this is allowed to do, and what it must never do.
 *
 * The reason it exists is that three components each fetched the same market
 * navigation on every route. The reason it is dangerous is that the same
 * mechanism, pointed at anything a reader sees differently from another reader,
 * serves one person's data to the next. Both halves are pinned here.
 */

afterEach(() => {
  clearReferenceDataCache();
  vi.useRealTimers();
});

describe("reference data cache", () => {
  it("collapses concurrent identical calls into one request", async () => {
    const execute = vi.fn(async () => "navigation");
    const [a, b, c] = await Promise.all([
      withReferenceCache("getTaxonomyHeaderNavigation", { m: "FR" }, execute),
      withReferenceCache("getTaxonomyHeaderNavigation", { m: "FR" }, execute),
      withReferenceCache("getTaxonomyHeaderNavigation", { m: "FR" }, execute),
    ]);
    expect(execute).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual(["navigation", "navigation", "navigation"]);
  });

  it("serves reference data again for a short window, then asks once more", async () => {
    vi.useFakeTimers();
    const execute = vi.fn(async () => "markets");
    await withReferenceCache("getMarketsByCode", { code: "FR" }, execute);
    await withReferenceCache("getMarketsByCode", { code: "FR" }, execute);
    expect(execute).toHaveBeenCalledTimes(1);

    // Editorial data, so a Staff edit has to become visible without a reload.
    vi.advanceTimersByTime(61_000);
    await withReferenceCache("getMarketsByCode", { code: "FR" }, execute);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("keeps a request for one market separate from another", async () => {
    const execute = vi.fn(async () => "navigation");
    await withReferenceCache(
      "getTaxonomyHeaderNavigation",
      { headers: { "X-Shongre-Market": "FR" } },
      execute,
    );
    await withReferenceCache(
      "getTaxonomyHeaderNavigation",
      { headers: { "X-Shongre-Market": "BE" } },
      execute,
    );
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("does not remember anything outside the reference list", async () => {
    // `getAuthMe` is the reader's own identity. Sharing it between readers on a
    // server process would be a data leak, and remembering it across a logout
    // would be a correctness bug.
    const execute = vi.fn(async () => "identity");
    await withReferenceCache("getAuthMe", {}, execute);
    await withReferenceCache("getAuthMe", {}, execute);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(isCacheableOperation("getAuthMe")).toBe(false);
  });

  it("still shares an identity request that is already in flight", async () => {
    // Single flight is safe for anything: the second caller would have received
    // the same response. It is the *remembering* that is restricted.
    let release: (value: string) => void = () => {};
    const execute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const both = Promise.all([
      withReferenceCache("getAuthMe", {}, execute),
      withReferenceCache("getAuthMe", {}, execute),
    ]);
    release("identity");
    expect(await both).toEqual(["identity", "identity"]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("never remembers a failure", async () => {
    const execute = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error("upstream down"))
      .mockResolvedValueOnce("markets");
    await expect(
      withReferenceCache("getMarketsByCode", { code: "FR" }, execute),
    ).rejects.toThrow("upstream down");
    // The next reader gets a real attempt, not a minute of someone else's error.
    await expect(
      withReferenceCache("getMarketsByCode", { code: "FR" }, execute),
    ).resolves.toBe("markets");
  });

  it("keys on the request, whatever order its fields were written in", () => {
    expect(referenceCacheKey("getMarkets", { a: 1, b: { c: 2, d: 3 } })).toBe(
      referenceCacheKey("getMarkets", { b: { d: 3, c: 2 }, a: 1 }),
    );
    expect(referenceCacheKey("getMarkets", { a: 1 })).not.toBe(
      referenceCacheKey("getMarkets", { a: 2 }),
    );
  });
});
