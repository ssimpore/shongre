import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import type Redis from "ioredis";
import { createRedisConnection } from "./redis-connection.js";
import { config } from "../../app/config/index.js";

@Injectable()
export class RedisHealthService implements OnApplicationShutdown {
  private client: Redis | undefined;

  async check(): Promise<boolean> {
    // Contract and unit suites intentionally run without infrastructure. Local
    // and hosted runtime profiles always execute the real dependency probe.
    if (config.environment.environment === "test") return true;
    try {
      if (!this.client || this.client.status === "end") {
        this.client = createRedisConnection("health");
      }
      if (this.client.status === "wait") await this.client.connect();
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    if (client && client.status !== "end")
      await client.quit().catch(() => client.disconnect());
  }
}

export const redisHealthService = new RedisHealthService();
