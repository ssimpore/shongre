import { createHash } from "node:crypto";
import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Queue } from "bullmq";
import type Redis from "ioredis";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import { config } from "../../app/config/index.js";
import { logger } from "../logging/logger.js";
import { requestContext } from "../observability/request-context.js";
import { createRedisConnection, redisKeyPrefix } from "./redis-connection.js";
import {
  SCHEDULED_RUNTIME_QUEUE_NAME,
  type ScheduledJobPayload,
} from "./runtime-queue.contract.js";

type DomainWakeJobName = "notification_delivery";
const defaults = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.queues;

@Injectable()
export class BackgroundJobDispatcher implements OnApplicationShutdown {
  private connection: Redis | undefined;
  private queue: Queue<ScheduledJobPayload, void, string> | undefined;

  async enqueueDomainWake(
    jobName: DomainWakeJobName,
    deduplicationKey: string,
  ): Promise<void> {
    if (config.environment.environment === "test") return;
    try {
      const queue = this.getQueue();
      const digest = createHash("sha256")
        .update(`${jobName}:${deduplicationKey}`)
        .digest("hex");
      await queue.add(
        jobName,
        {
          schemaVersion: 1,
          environmentId: config.environment.environmentId,
          jobName,
          trigger: "domain",
          correlationId: requestContext.getStore()?.requestId,
        },
        {
          jobId: `domain-${digest}`,
          attempts: defaults.attempts,
          backoff: { type: "exponential", delay: defaults.backoffDelayMs },
          removeOnComplete: {
            age: defaults.completedRetentionSeconds,
            count: defaults.completedRetentionCount,
          },
          removeOnFail: {
            age: defaults.failedRetentionSeconds,
            count: defaults.failedRetentionCount,
          },
        },
      );
    } catch (error) {
      // The database outbox is already authoritative and the scheduled queue
      // remains its recovery path, so a transient wake failure must not roll
      // back the accepted domain transaction.
      logger.error("domain_job_enqueue_failed", {
        jobName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.queue?.close();
    this.queue = undefined;
    const connection = this.connection;
    this.connection = undefined;
    if (connection && connection.status !== "end") {
      await connection.quit().catch(() => connection.disconnect());
    }
  }

  private getQueue(): Queue<ScheduledJobPayload, void, string> {
    if (this.queue) return this.queue;
    this.connection = createRedisConnection("domain-producer");
    this.connection.on("error", (error) => {
      logger.error("redis_domain_producer_error", { error: error.message });
    });
    this.queue = new Queue<ScheduledJobPayload, void, string>(
      SCHEDULED_RUNTIME_QUEUE_NAME,
      { connection: this.connection, prefix: redisKeyPrefix },
    );
    return this.queue;
  }
}

export const backgroundJobDispatcher = new BackgroundJobDispatcher();
