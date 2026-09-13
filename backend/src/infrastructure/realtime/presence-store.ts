import type { OnApplicationShutdown } from "@nestjs/common";
import type Redis from "ioredis";
import type { components } from "@shongre/contracts/openapi";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  createRedisConnection,
  redisKeyPrefix,
} from "../queue/redis-connection.js";
import { logger } from "../logging/logger.js";

const policy = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.presence;
type Heartbeat = components["schemas"]["PresenceHeartbeat"];
export interface PresenceClient extends Heartbeat {
  sessionId: string;
  observedAt: number;
  lastActiveAt: number | null;
}
export interface PresenceSnapshot {
  userId: string;
  lastSeenAt: number | null;
  clients: PresenceClient[];
}
export interface PresenceStore {
  update(
    userId: string,
    sessionId: string,
    heartbeat: Heartbeat,
  ): Promise<boolean>;
  read(userIds: string[]): Promise<PresenceSnapshot[]>;
}

// Atomic per-user updates use Redis time, reject stale sequences for retained
// clients, and bound client cardinality even under concurrent replicas.
const UPDATE_PRESENCE = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local field = ARGV[1] .. ':' .. ARGV[2]
local old = redis.call('HGET', KEYS[1], field)
local previous = old and cjson.decode(old) or nil
if previous and tonumber(ARGV[3]) <= previous.sequence then return 0 end
local all = redis.call('HGETALL', KEYS[1])
local count = 0
for i = 1, #all, 2 do
  if all[i] ~= 'lastSeenAt' then
    local client = cjson.decode(all[i+1])
    if client.observedAt + tonumber(ARGV[5]) <= now then
      redis.call('HDEL', KEYS[1], all[i])
    else
      count = count + 1
    end
  end
end
if not redis.call('HEXISTS', KEYS[1], field) or redis.call('HEXISTS', KEYS[1], field) == 0 then
  if count >= tonumber(ARGV[7]) then return -1 end
end
local lastActive = previous and previous.lastActiveAt or cjson.null
if ARGV[4] == 'active' then
  lastActive = now
  redis.call('HSET', KEYS[1], 'lastSeenAt', tostring(now))
end
redis.call('HSET', KEYS[1], field, cjson.encode({sessionId=ARGV[1],clientId=ARGV[2],sequence=tonumber(ARGV[3]),activity=ARGV[4],observedAt=now,lastActiveAt=lastActive}))
redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[6]))
return 1
`;

export class RedisPresenceStore
  implements PresenceStore, OnApplicationShutdown
{
  private connection: Redis | undefined;
  private connecting: Promise<unknown> | undefined;

  private async client(): Promise<Redis> {
    if (!this.connection) {
      this.connection = createRedisConnection("presence");
      this.connection.on("error", () =>
        logger.warn("presence_store_unavailable"),
      );
    }
    if (this.connection.status === "wait")
      this.connecting = this.connection.connect();
    if (this.connecting) {
      try {
        await this.connecting;
      } finally {
        this.connecting = undefined;
      }
    }
    return this.connection;
  }

  private key(userId: string): string {
    return `${redisKeyPrefix}:presence:v1:${userId}`;
  }

  async update(
    userId: string,
    sessionId: string,
    heartbeat: Heartbeat,
  ): Promise<boolean> {
    const result = await (
      await this.client()
    ).eval(
      UPDATE_PRESENCE,
      1,
      this.key(userId),
      sessionId,
      heartbeat.clientId,
      heartbeat.sequence,
      heartbeat.activity,
      policy.leaseDurationMs,
      policy.lastSeenRetentionMs,
      policy.maximumClientsPerUser,
    );
    if (result === -1)
      throw new AppError({
        code: "CONFLICT",
        message: "Trop de connexions de présence actives.",
      });
    return result === 1;
  }

  async read(userIds: string[]): Promise<PresenceSnapshot[]> {
    if (!userIds.length) return [];
    const pipeline = (await this.client()).pipeline();
    userIds.forEach((id) => pipeline.hgetall(this.key(id)));
    const results = await pipeline.exec();
    if (!results || results.some(([error]) => error))
      throw new Error("Presence unavailable");
    return results.map(([, value], index) => {
      const fields = value as Record<string, string>;
      const lastSeenAt = fields.lastSeenAt ? Number(fields.lastSeenAt) : null;
      return {
        userId: userIds[index]!,
        lastSeenAt:
          lastSeenAt !== null &&
          lastSeenAt + policy.lastSeenRetentionMs > Date.now()
            ? lastSeenAt
            : null,
        clients: Object.entries(fields)
          .filter(([key]) => key !== "lastSeenAt")
          .map(([, serialized]) => JSON.parse(serialized) as PresenceClient),
      };
    });
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.connection;
    this.connection = undefined;
    if (client && client.status !== "end")
      await client.quit().catch(() => client.disconnect());
  }
}

export class TestPresenceStore implements PresenceStore {
  private readonly snapshots = new Map<string, PresenceSnapshot>();
  constructor(private readonly now: () => number = Date.now) {}
  async update(
    userId: string,
    sessionId: string,
    heartbeat: Heartbeat,
  ): Promise<boolean> {
    const now = this.now();
    const snapshot = this.snapshots.get(userId) ?? {
      userId,
      lastSeenAt: null,
      clients: [],
    };
    const previous = snapshot.clients.find(
      (client) =>
        client.sessionId === sessionId &&
        client.clientId === heartbeat.clientId,
    );
    if (previous && heartbeat.sequence <= previous.sequence) return false;
    snapshot.clients = snapshot.clients.filter(
      (client) => client.observedAt + policy.leaseDurationMs > now,
    );
    const current = snapshot.clients.findIndex(
      (client) =>
        client.sessionId === sessionId &&
        client.clientId === heartbeat.clientId,
    );
    if (current < 0 && snapshot.clients.length >= policy.maximumClientsPerUser)
      throw new AppError({
        code: "CONFLICT",
        message: "Trop de connexions de présence actives.",
      });
    const client = {
      ...heartbeat,
      sessionId,
      observedAt: now,
      lastActiveAt:
        heartbeat.activity === "active"
          ? now
          : (previous?.lastActiveAt ?? null),
    };
    if (heartbeat.activity === "active") snapshot.lastSeenAt = now;
    if (current < 0) snapshot.clients.push(client);
    else snapshot.clients[current] = client;
    this.snapshots.set(userId, snapshot);
    return true;
  }
  async read(userIds: string[]): Promise<PresenceSnapshot[]> {
    return userIds.map((userId) => {
      const snapshot = this.snapshots.get(userId);
      return snapshot
        ? {
            ...snapshot,
            lastSeenAt:
              snapshot.lastSeenAt !== null &&
              snapshot.lastSeenAt + policy.lastSeenRetentionMs > this.now()
                ? snapshot.lastSeenAt
                : null,
            clients: snapshot.clients.map((client) => ({ ...client })),
          }
        : { userId, lastSeenAt: null, clients: [] };
    });
  }
}

export const presenceStore =
  config.environment.environment === "test"
    ? new TestPresenceStore()
    : new RedisPresenceStore();
