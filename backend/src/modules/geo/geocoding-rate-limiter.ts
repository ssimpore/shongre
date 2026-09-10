import type Redis from "ioredis";
import {
  createRedisConnection,
  redisKeyPrefix,
} from "../../infrastructure/queue/redis-connection.js";
import { GeocodingUnavailableError } from "./geocoding.service.js";
import type { GeocodingRateLimiter } from "./geocoding.service.js";

/**
 * The platform's geocoding budget, held where every instance can see it.
 *
 * The budget belongs to the *provider*, not to a process. An in-process counter
 * enforces the configured rate per instance, so running four of them quadruples
 * the rate the provider actually sees — and the configured number, the one
 * chosen to stay inside someone else's usage policy, silently stops describing
 * reality the moment the deployment scales. That is not a throughput problem;
 * it is how a free geocoder revokes access.
 *
 * A token bucket rather than a fixed window, because a fixed window admits
 * twice the limit across its boundary: a full allowance at the end of one
 * minute and another at the start of the next, back to back. A provider that
 * measures per second sees that as a burst of double the rate it published.
 */

/*
 * Refill and take, in one round trip.
 *
 * Reading the bucket and writing it back from the client would let two
 * instances both read the same remaining token and both spend it, which is
 * exactly the race a shared limiter exists to prevent. Redis runs this whole
 * script atomically.
 */
const TAKE_TOKEN = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_per_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'at')
local tokens = tonumber(bucket[1])
local at = tonumber(bucket[2])
if tokens == nil or at == nil then
  tokens = capacity
  at = now
end

-- Elapsed time is worth tokens, up to a full bucket. Clamped at zero so a
-- clock that moves backwards cannot mint an allowance.
local elapsed = math.max(0, now - at)
tokens = math.min(capacity, tokens + elapsed * refill_per_ms)

local allowed = 0
if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
end

redis.call('HSET', key, 'tokens', tokens, 'at', now)
redis.call('PEXPIRE', key, ttl)
return allowed
`;

export interface RedisGeocodingRateLimiterOptions {
  limitPerMinute: number;
  /** Injected in tests; the runtime opens its own connection. */
  client?: Redis;
  now?: () => number;
}

export class RedisGeocodingRateLimiter implements GeocodingRateLimiter {
  private readonly client: Redis;
  private readonly now: () => number;
  private readonly key: string;

  constructor(private readonly options: RedisGeocodingRateLimiterOptions) {
    this.client = options.client ?? createRedisConnection("geocoding-rate");
    this.now = options.now ?? Date.now;
    /* One key for the whole environment: the budget is the platform's, so
       every instance and both consumers — autocomplete and backfill — draw
       from the same bucket. */
    this.key = `${redisKeyPrefix}:geocoding:bucket`;
  }

  async acquire(): Promise<void> {
    const capacity = this.options.limitPerMinute;
    const refillPerMs = capacity / 60_000;
    /* Long enough that an idle bucket is not resurrected full mid-minute, short
       enough that the key does not outlive the deployment that made it. */
    const ttlMs = Math.ceil((capacity / refillPerMs) * 2);

    let allowed: unknown;
    try {
      if (this.client.status === "wait") await this.client.connect();
      allowed = await this.client.eval(
        TAKE_TOKEN,
        1,
        this.key,
        String(capacity),
        String(refillPerMs),
        String(this.now()),
        String(ttlMs),
      );
    } catch {
      /*
       * Closed, not open.
       *
       * The store being unreachable is the one moment every instance would
       * otherwise fall back to counting alone — which is the unmetered state
       * this class exists to remove, arriving precisely when nothing is
       * watching. Address search degrades to typing a town by hand, which the
       * client already handles; the provider's policy does not degrade.
       */
      throw new GeocodingUnavailableError("rate_limited");
    }

    if (allowed !== 1) throw new GeocodingUnavailableError("rate_limited");
  }
}
