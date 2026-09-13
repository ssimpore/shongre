import { afterEach, describe, expect, it, vi } from "vitest";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import {
  currentPresence,
  startPresenceHeartbeat,
  startPresenceObserver,
} from "../src/presence";

const policy = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.presence;
const clientId = "11111111-1111-4111-8111-111111111111";

afterEach(() => vi.useRealTimers());

describe("presence lifecycle", () => {
  it("reports foreground activity, idle and background state", async () => {
    vi.useFakeTimers();
    const sent: string[] = [];
    const heartbeat = startPresenceHeartbeat({
      clientId,
      foreground: true,
      send: async (value) => {
        sent.push(value.activity);
      },
    });
    await vi.runOnlyPendingTimersAsync();
    expect(sent[0]).toBe("active");
    await vi.advanceTimersByTimeAsync(policy.heartbeatIntervalMs);
    expect(sent).toContain("idle");
    heartbeat.activity();
    await vi.advanceTimersByTimeAsync(policy.heartbeatIntervalMs);
    expect(sent.at(-1)).toBe("active");
    heartbeat.foreground(false);
    await Promise.resolve();
    expect(sent.at(-1)).toBe("background");
    heartbeat.stop();
  });

  it("drops expired snapshots and late reads after the observer is hidden", async () => {
    const now = Date.now();
    expect(
      currentPresence(
        {
          status: "online",
          lastSeenAt: new Date(now).toISOString(),
          observedAt: new Date(now).toISOString(),
          validUntil: new Date(now - 1).toISOString(),
        },
        now,
      ),
    ).toBeUndefined();

    let resolveRead: ((value: { items: [] }) => void) | undefined;
    const updates: number[] = [];
    const observer = startPresenceObserver({
      visible: true,
      read: () =>
        new Promise((resolve) => {
          resolveRead = resolve;
        }),
      update: (items) => updates.push(items.length),
    });
    observer.visible(false);
    resolveRead?.({ items: [] });
    await Promise.resolve();
    expect(updates).toEqual([0]);
    observer.stop();
  });
});
