import { createHash } from "node:crypto";
import type { OnApplicationShutdown } from "@nestjs/common";
import type Redis from "ioredis";
import { config } from "../../app/config/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { errorDiagnostics, logger } from "../logging/logger.js";
import {
  createRedisConnection,
  redisKeyPrefix,
} from "../queue/redis-connection.js";

export interface RequestBudgetDecision {
  allowed: boolean;
  retryAfterMs: number;
}

/** Where per-subject request counters live; shared by every API instance. */
export interface RequestBudgetStore {
  consume(
    key: string,
    limit: number,
    windowMs: number,
    lockMs: number,
  ): Promise<RequestBudgetDecision>;
  close(): Promise<void>;
}

/*
 * Count, and lock once the window's allowance is spent, in one round trip.
 * Redis runs the script atomically, so concurrent requests from one subject on
 * different instances cannot both take the last slot. Semantics match the
 * earlier database limiter: a fixed window of `limit` requests, then a lock.
 */
const CONSUME_REQUEST_BUDGET = `
local counter = KEYS[1]
local lock = KEYS[2]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local lock_ms = tonumber(ARGV[3])

local locked_for = redis.call('PTTL', lock)
if locked_for > 0 then
  return {0, locked_for}
end
local used = redis.call('INCR', counter)
if used == 1 then
  redis.call('PEXPIRE', counter, window_ms)
end
if used > limit then
  redis.call('SET', lock, '1', 'PX', lock_ms)
  redis.call('DEL', counter)
  return {0, lock_ms}
end
return {1, 0}
`;

export class RedisRequestBudgetStore implements RequestBudgetStore {
  constructor(
    private readonly client: Redis = createRedisConnection("api-rate-limit"),
  ) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
    lockMs: number,
  ): Promise<RequestBudgetDecision> {
    if (this.client.status === "wait") await this.client.connect();
    const [allowed, retryAfterMs] = (await this.client.eval(
      CONSUME_REQUEST_BUDGET,
      2,
      `${key}:count`,
      `${key}:lock`,
      String(limit),
      String(windowMs),
      String(lockMs),
    )) as [number, number];
    return { allowed: allowed === 1, retryAfterMs: Number(retryAfterMs) };
  }

  async close(): Promise<void> {
    if (this.client.status !== "end" && this.client.status !== "wait")
      await this.client.quit().catch(() => this.client.disconnect());
  }
}

/**
 * The unit, contract and browser suites run without infrastructure — the same
 * reason `RedisHealthService` short-circuits there — so the test profile counts
 * in process. It is a test double, not a fallback: no other profile uses it.
 */
export class InProcessRequestBudgetStore implements RequestBudgetStore {
  private readonly buckets = new Map<
    string,
    { used: number; resetAt: number; lockedUntil: number }
  >();

  async consume(
    key: string,
    limit: number,
    windowMs: number,
    lockMs: number,
  ): Promise<RequestBudgetDecision> {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (current && current.lockedUntil > now)
      return { allowed: false, retryAfterMs: current.lockedUntil - now };
    if (!current || current.resetAt <= now) {
      this.prune(now);
      this.buckets.set(key, {
        used: 1,
        resetAt: now + windowMs,
        lockedUntil: 0,
      });
      return { allowed: true, retryAfterMs: 0 };
    }
    current.used += 1;
    if (current.used <= limit) return { allowed: true, retryAfterMs: 0 };
    current.lockedUntil = now + lockMs;
    return { allowed: false, retryAfterMs: lockMs };
  }

  async close(): Promise<void> {
    this.buckets.clear();
  }

  private prune(now: number): void {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets)
      if (bucket.resetAt <= now && bucket.lockedUntil <= now)
        this.buckets.delete(key);
  }
}

/**
 * Per-subject request budget for the whole API: the authenticated principal,
 * or the network address prefix for guests. It runs on every request, so it
 * lives in Redis rather than costing a row lock and a write in PostgreSQL per
 * call. Credential endpoints keep their own database-backed limits.
 */
export class ApiRateLimiter implements OnApplicationShutdown {
  constructor(
    private readonly store: RequestBudgetStore = config.environment
      .environment === "test"
      ? new InProcessRequestBudgetStore()
      : new RedisRequestBudgetStore(),
  ) {}

  async consume(input: {
    subject: string;
    authenticated: boolean;
  }): Promise<void> {
    const limit = input.authenticated
      ? config.authenticatedApiRateLimit
      : config.publicApiRateLimit;
    const action = input.authenticated ? "api_authenticated" : "api_public";
    // Hashed so neither an address nor an account id is stored as a key.
    const keyHash = createHash("sha256")
      .update(`${config.environment.environmentId}:${action}:${input.subject}`)
      .digest("hex");

    let decision: RequestBudgetDecision;
    try {
      decision = await this.store.consume(
        `${redisKeyPrefix}:api-rate:${action}:${keyHash}`,
        limit,
        config.apiRateLimitWindowSeconds * 1_000,
        config.apiRateLimitLockSeconds * 1_000,
      );
    } catch (error) {
      // Fails closed, like the readiness probe that already requires Redis:
      // an unanswerable budget is a dependency outage, not an allowance.
      logger.error("api_rate_limit_unavailable", errorDiagnostics(error));
      throw new AppError({
        code: "NETWORK_ERROR",
        statusCode: 503,
        message: "Le service est temporairement indisponible.",
        originalError: error,
      });
    }
    if (!decision.allowed)
      throw new AppError({
        code: "RATE_LIMITED",
        message: "Trop de requêtes. Réessayez dans quelques instants.",
        details: {
          retryAfterSeconds: Math.max(
            1,
            Math.ceil(decision.retryAfterMs / 1_000),
          ),
        },
      });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.store.close();
  }
}

export const apiRateLimiter = new ApiRateLimiter();
