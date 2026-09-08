import Redis, { type RedisOptions } from "ioredis";
import { config } from "../../app/config/index.js";

function connectionOptions(
  connectionName: string,
  workerConnection: boolean,
): RedisOptions {
  return {
    connectionName: `${config.environment.environmentId}:${connectionName}`,
    enableOfflineQueue: workerConnection,
    lazyConnect: true,
    maxRetriesPerRequest: workerConnection ? null : 1,
    retryStrategy: (attempt) => Math.min(attempt * 100, 2_000),
  };
}

export function createRedisConnection(
  connectionName: string,
  options: { worker?: boolean } = {},
): Redis {
  return new Redis(
    config.redisUrl,
    connectionOptions(connectionName, options.worker === true),
  );
}

export const redisKeyPrefix = `shongre:${config.environment.environmentId}`;
