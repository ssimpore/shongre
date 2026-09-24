import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./concurrency";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("mapWithConcurrency", () => {
  it("keeps input order and never exceeds the limit", async () => {
    let inFlight = 0;
    let peak = 0;
    const results = await mapWithConcurrency(
      [5, 4, 3, 2, 1, 0],
      2,
      async (value) => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await tick();
        inFlight -= 1;
        return value * 10;
      },
    );
    expect(results).toEqual([50, 40, 30, 20, 10, 0]);
    expect(peak).toBe(2);
  });

  it("resolves an empty input without calling the task", async () => {
    let calls = 0;
    await expect(
      mapWithConcurrency([], 4, async () => {
        calls += 1;
      }),
    ).resolves.toEqual([]);
    expect(calls).toBe(0);
  });

  it("rejects and starts no further work after a failure", async () => {
    const started: number[] = [];
    await expect(
      mapWithConcurrency([0, 1, 2, 3, 4, 5], 1, async (value) => {
        started.push(value);
        if (value === 1) throw new Error("upstream failed");
        return value;
      }),
    ).rejects.toThrow("upstream failed");
    expect(started).toEqual([0, 1]);
  });
});
