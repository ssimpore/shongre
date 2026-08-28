import { describe, expect, it, vi } from "vitest";
import { RealtimeBroadcaster } from "../../src/infrastructure/realtime/realtime-broadcaster.js";

describe("RealtimeBroadcaster", () => {
  it("is a deterministic no-op in backend demo mode", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(
      new RealtimeBroadcaster().broadcastEvent("conversation:test", "message", {
        id: "demo-message",
      }),
    ).resolves.toBeUndefined();
    expect(warning).not.toHaveBeenCalled();
    warning.mockRestore();
  });
});
