import { describe, expect, it } from "vitest";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import type { Principal } from "../../src/shared/auth/principal.js";
import type { PresenceRepository } from "../../src/infrastructure/database/repositories/presence.repository.js";
import { TestPresenceStore } from "../../src/infrastructure/realtime/presence-store.js";
import { PresenceService } from "../../src/modules/messaging/presence.service.js";

const policy = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.presence;
const clientOne = "11111111-1111-4111-8111-111111111111";
const clientTwo = "22222222-2222-4222-8222-222222222222";

function principal(userId: string, sessionId: string): Principal {
  return {
    userId,
    sessionId,
    email: `${userId}@example.test`,
    role: "individual_buyer",
    accountType: "individual",
    status: "active",
    staffStatus: "none",
    capabilities: ["message.read.own"],
  };
}

function fixture() {
  let now = Date.parse("2026-09-13T10:00:00.000Z");
  let visible = true;
  const sessions = new Map([
    ["buyer-session", "buyer"],
    ["seller-session-1", "seller"],
    ["seller-session-2", "seller"],
  ]);
  const repository: PresenceRepository = {
    async audience(viewerId, conversationIds) {
      if (viewerId !== "buyer" || conversationIds[0] !== "conversation-1")
        return [];
      return conversationIds.map((conversationId) => ({
        conversationId,
        userId: "seller",
        visible,
      }));
    },
    async activeSessions(sessionIds) {
      return new Map(
        sessionIds.flatMap((id) => {
          const userId = sessions.get(id);
          return userId ? [[id, userId] as const] : [];
        }),
      );
    },
  };
  const store = new TestPresenceStore(() => now);
  const service = new PresenceService(store, repository, () => now);
  return {
    service,
    store,
    sessions,
    setVisible(value: boolean) {
      visible = value;
    },
    advance(milliseconds: number) {
      now += milliseconds;
    },
  };
}

describe("PresenceService", () => {
  it("moves between online, away and offline while respecting other devices", async () => {
    const state = fixture();
    await state.service.heartbeat(principal("seller", "seller-session-1"), {
      clientId: clientOne,
      sequence: 1,
      activity: "active",
    });
    expect(
      (
        await state.service.read(
          principal("buyer", "buyer-session"),
          "conversation-1",
        )
      ).items[0]?.presence.status,
    ).toBe("online");

    state.advance(policy.awayAfterMs - policy.heartbeatIntervalMs);
    await state.service.heartbeat(principal("seller", "seller-session-1"), {
      clientId: clientOne,
      sequence: 2,
      activity: "idle",
    });
    state.advance(policy.heartbeatIntervalMs + 1);
    expect(
      (
        await state.service.read(principal("buyer", "buyer-session"), [
          "conversation-1",
        ])
      ).items[0]?.presence.status,
    ).toBe("away");

    await state.service.heartbeat(principal("seller", "seller-session-2"), {
      clientId: clientTwo,
      sequence: 1,
      activity: "active",
    });
    await state.service.heartbeat(principal("seller", "seller-session-1"), {
      clientId: clientOne,
      sequence: 3,
      activity: "offline",
    });
    expect(
      (
        await state.service.read(
          principal("buyer", "buyer-session"),
          "conversation-1",
        )
      ).items[0]?.presence.status,
    ).toBe("online");

    state.sessions.delete("seller-session-2");
    const offline = await state.service.read(
      principal("buyer", "buyer-session"),
      "conversation-1",
    );
    expect(offline.items[0]?.presence.status).toBe("offline");
    expect(offline.items[0]?.presence.lastSeenAt).toBeTruthy();
  });

  it("conceals presence when policy denies visibility", async () => {
    const state = fixture();
    await state.service.heartbeat(principal("seller", "seller-session-1"), {
      clientId: clientOne,
      sequence: 1,
      activity: "active",
    });
    state.setVisible(false);
    const result = await state.service.read(
      principal("buyer", "buyer-session"),
      "conversation-1",
    );
    expect(result.items[0]?.presence).toMatchObject({
      status: "unknown",
      lastSeenAt: null,
    });
  });

  it("rejects stale updates and revoked sessions", async () => {
    const state = fixture();
    const actor = principal("seller", "seller-session-1");
    expect(
      await state.service.heartbeat(actor, {
        clientId: clientOne,
        sequence: 2,
        activity: "active",
      }),
    ).toEqual({ updated: true });
    expect(
      await state.service.heartbeat(actor, {
        clientId: clientOne,
        sequence: 1,
        activity: "offline",
      }),
    ).toEqual({ updated: false });
    state.sessions.delete("seller-session-1");
    await expect(
      state.service.heartbeat(actor, {
        clientId: clientOne,
        sequence: 3,
        activity: "active",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });

  it("does not disclose whether a requested non-participant conversation exists", async () => {
    const state = fixture();
    await expect(
      state.service.read(
        principal("buyer", "buyer-session"),
        "other-conversation",
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
