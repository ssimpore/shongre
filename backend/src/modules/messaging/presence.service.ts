import { z } from "zod";
import type { components } from "@shongre/contracts/openapi";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { AppError } from "../../shared/errors/app-error.js";
import {
  requirePermission,
  type Principal,
} from "../../shared/auth/principal.js";
import {
  presenceRepository,
  type PresenceRepository,
} from "../../infrastructure/database/repositories/presence.repository.js";
import {
  presenceStore,
  type PresenceStore,
} from "../../infrastructure/realtime/presence-store.js";

const policy = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.presence;
type Presence = components["schemas"]["UserPresence"];
const heartbeatSchema = z
  .object({
    clientId: z.string().uuid(),
    sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    activity: z.enum(["active", "idle", "background", "offline"]),
  })
  .strict();
const idsSchema = z
  .array(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/))
  .min(1)
  .max(policy.maximumConversationsPerRead);

export class PresenceService {
  constructor(
    private readonly store: PresenceStore = presenceStore,
    private readonly repository: PresenceRepository = presenceRepository,
    private readonly now: () => number = Date.now,
  ) {}

  async heartbeat(
    principal: Principal,
    input: unknown,
  ): Promise<{ updated: boolean }> {
    requirePermission(principal, "message.read.own");
    const parsed = heartbeatSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Mise à jour de présence invalide.",
      });
    if (!principal.sessionId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Session invalide ou expirée.",
      });
    // Recheck revocation after request authentication, before renewing a lease.
    const active = await this.repository.activeSessions([principal.sessionId]);
    if (active.get(principal.sessionId) !== principal.userId)
      throw new AppError({
        code: "UNAUTHENTICATED",
        message: "Session invalide ou expirée.",
      });
    return {
      updated: await this.store.update(
        principal.userId,
        principal.sessionId,
        parsed.data,
      ),
    };
  }

  async read(
    principal: Principal,
    input: unknown,
  ): Promise<components["schemas"]["ConversationPresencePage"]> {
    requirePermission(principal, "message.read.own");
    const parsed = idsSchema.safeParse(
      typeof input === "string" ? input.split(",") : input,
    );
    if (!parsed.success)
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Liste de conversations invalide.",
      });
    const ids = [...new Set(parsed.data)];
    const audience = await this.repository.audience(principal.userId, ids);
    if (audience.length !== ids.length)
      throw new AppError({
        code: "NOT_FOUND",
        message: "Conversation introuvable.",
      });
    const now = this.now();
    const unknown = (): Presence => ({
      status: "unknown",
      lastSeenAt: null,
      observedAt: new Date(now).toISOString(),
      validUntil: new Date(now + policy.refreshIntervalMs).toISOString(),
    });
    const byUser = new Map<string, Presence>();
    const userIds = [
      ...new Set(
        audience.flatMap((item) => (item.visible ? [item.userId] : [])),
      ),
    ];
    try {
      const snapshots = await this.store.read(userIds);
      const sessionIds = [
        ...new Set(
          snapshots.flatMap((snapshot) =>
            snapshot.clients
              .filter(
                (client) =>
                  client.observedAt + policy.leaseDurationMs > now &&
                  client.activity !== "offline",
              )
              .map((client) => client.sessionId),
          ),
        ),
      ];
      const sessions = await this.repository.activeSessions(sessionIds);
      for (const snapshot of snapshots) {
        const clients = snapshot.clients.filter(
          (client) =>
            sessions.get(client.sessionId) === snapshot.userId &&
            client.observedAt + policy.leaseDurationMs > now &&
            client.activity !== "offline",
        );
        const online = clients.some(
          (client) =>
            client.activity !== "background" &&
            client.lastActiveAt !== null &&
            client.lastActiveAt + policy.awayAfterMs > now,
        );
        byUser.set(snapshot.userId, {
          ...unknown(),
          status: online
            ? "online"
            : clients.length
              ? "away"
              : snapshot.lastSeenAt !== null
                ? "offline"
                : "unknown",
          lastSeenAt:
            snapshot.lastSeenAt === null
              ? null
              : new Date(snapshot.lastSeenAt).toISOString(),
        });
      }
    } catch {
      // Presence is optional. Infrastructure failure must not assert that a person is offline.
    }
    return {
      items: audience.map((item) => ({
        conversationId: item.conversationId,
        presence: item.visible
          ? (byUser.get(item.userId) ?? unknown())
          : unknown(),
      })),
    };
  }
}

export const presenceService = new PresenceService();
