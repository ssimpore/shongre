import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import type Redis from "ioredis";
import { config } from "../../app/config/index.js";
import { logger } from "../logging/logger.js";
import {
  createRedisConnection,
  redisKeyPrefix,
} from "../queue/redis-connection.js";

export interface RealtimeEnvelope {
  schemaVersion: 1;
  channelName: string;
  event: string;
  payload: Record<string, unknown>;
}

type RealtimeListener = (envelope: RealtimeEnvelope) => void;

@Injectable()
export class RealtimePubSub implements OnApplicationShutdown {
  private readonly listeners = new Set<RealtimeListener>();
  private publisher: Redis | undefined;
  private subscriber: Redis | undefined;
  private readonly topic = `${redisKeyPrefix}:realtime`;

  async publish(envelope: RealtimeEnvelope): Promise<void> {
    if (config.environment.environment === "test") {
      for (const listener of this.listeners) listener(envelope);
      return;
    }
    const publisher = this.getPublisher();
    if (publisher.status === "wait") await publisher.connect();
    await publisher.publish(this.topic, JSON.stringify(envelope));
  }

  subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    if (config.environment.environment !== "test") this.ensureSubscriber();
    return () => this.listeners.delete(listener);
  }

  async onApplicationShutdown(): Promise<void> {
    const connections = [this.subscriber, this.publisher].filter(
      (connection): connection is Redis => Boolean(connection),
    );
    this.subscriber = undefined;
    this.publisher = undefined;
    await Promise.allSettled(
      connections.map(async (connection) => {
        if (connection.status !== "end") {
          await connection.quit().catch(() => connection.disconnect());
        }
      }),
    );
  }

  private getPublisher(): Redis {
    if (this.publisher) return this.publisher;
    this.publisher = createRedisConnection("realtime-publisher");
    this.publisher.on("error", (error) => {
      logger.error("redis_realtime_publisher_error", { error: error.message });
    });
    return this.publisher;
  }

  private ensureSubscriber(): void {
    if (this.subscriber) return;
    const subscriber = createRedisConnection("realtime-subscriber", {
      worker: true,
    });
    this.subscriber = subscriber;
    subscriber.on("ready", () => {
      void subscriber.subscribe(this.topic).catch((error) => {
        logger.error("redis_realtime_subscribe_failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });
    subscriber.on("message", (_topic, serialized) => {
      try {
        const envelope = JSON.parse(serialized) as RealtimeEnvelope;
        if (
          envelope.schemaVersion !== 1 ||
          !envelope.channelName ||
          !envelope.event ||
          !envelope.payload
        ) {
          return;
        }
        for (const listener of this.listeners) listener(envelope);
      } catch {
        logger.warn("redis_realtime_message_rejected");
      }
    });
    subscriber.on("error", (error) => {
      logger.error("redis_realtime_subscriber_error", { error: error.message });
    });
    void subscriber.connect().catch((error) => {
      logger.error("redis_realtime_connection_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

export const realtimePubSub = new RealtimePubSub();
