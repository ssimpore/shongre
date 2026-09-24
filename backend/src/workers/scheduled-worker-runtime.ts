import { logger } from "../infrastructure/logging/logger.js";
import { config } from "../app/config/index.js";
import { WorkerHeartbeat } from "../infrastructure/observability/worker-heartbeat.js";
import { performance } from "node:perf_hooks";
import { scheduledJobCoordinator } from "../infrastructure/queue/scheduled-job-coordinator.js";
import { metrics } from "../infrastructure/observability/metrics.js";
import { storageService } from "../infrastructure/storage/storage-service.js";
import { providerDataDeletionWorker } from "./auth/provider-data-deletion-worker.js";
import { authRateLimitRetentionWorker } from "./auth/auth-rate-limit-retention-worker.js";
import { revenueRecognitionWorker } from "./finance/revenue-recognition-worker.js";
import { lifecycleWorker } from "./lifecycle/lifecycle-worker.js";
import { commercialConfigurationWorker } from "./monetization/commercial-configuration-worker.js";
import { monetizationLifecycleWorker } from "./monetization/monetization-lifecycle-worker.js";
import { ordersService } from "../modules/orders/orders.service.js";
import { notificationsWorker } from "./notifications/notifications-worker.js";
import { crmShongreSyncWorker } from "./crm/crm-shongre-sync-worker.js";
import { marketingCampaignWorker } from "./marketing/marketing-campaign-worker.js";
import { marketingWebhookWorker } from "./marketing/marketing-webhook-worker.js";
import { marketingJourneyWorker } from "./marketing/marketing-journey-worker.js";
import { analyticsService } from "../modules/analytics/analytics.service.js";
import { searchConsoleWorker } from "./analytics/search-console-worker.js";
import { captureServerException } from "../infrastructure/observability/sentry.js";
import { providerWebhookWorker } from "./payments/provider-webhook-worker.js";
import { multilingualSearchReindexWorker } from "./search/multilingual-search-reindex-worker.js";
import { searchVocabularyWorker } from "./search/search-vocabulary-worker.js";
import { reviewReminderWorker } from "./reviews/review-reminder-worker.js";
import { discoveryEventWorker } from "./search/discovery-event-worker.js";
import { indexNowWorker } from "./search/indexnow-worker.js";
import { listingEngagementWorker } from "./listings/listing-engagement-worker.js";
import { sellerAutomationWorker } from "./listings/seller-automation-worker.js";
import { digitalFulfillmentWorker } from "./digital-products/digital-fulfillment-worker.js";
import { watchSubscriptionsWorker } from "./watch-subscriptions/watch-subscriptions-worker.js";
import { deliveryOutboxWorker } from "./delivery/delivery-outbox-worker.js";
import { Queue, Worker, type Job } from "bullmq";
import type Redis from "ioredis";
import { SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS } from "@shongre/contracts/performance";
import {
  createRedisConnection,
  redisKeyPrefix,
} from "../infrastructure/queue/redis-connection.js";
import { db } from "../infrastructure/database/db-client.js";
import {
  SCHEDULED_RUNTIME_QUEUE_NAME,
  type ScheduledJobPayload,
} from "../infrastructure/queue/runtime-queue.contract.js";

interface ScheduledJob {
  name: string;
  group:
    | "analytics"
    | "marketing"
    | "crm"
    | "communications"
    | "commercial"
    | "payments"
    | "finance"
    | "lifecycle"
    | "infrastructure";
  intervalSeconds: number;
  run: () => Promise<unknown>;
}

const jobs: ScheduledJob[] = [
  {
    name: "runtime_dependency_probe",
    group: "infrastructure",
    intervalSeconds:
      SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.worker.dependencyProbeIntervalMs /
      1_000,
    run: async () => {
      if (!(await db.healthCheck())) {
        throw new Error("Database dependency probe failed");
      }
    },
  },
  {
    name: "analytics_provider_delivery",
    group: "analytics",
    intervalSeconds: 15,
    run: () => analyticsService.retryProviderDeliveries(),
  },
  {
    name: "discovery_event_outbox",
    group: "analytics",
    intervalSeconds: 5,
    run: () => discoveryEventWorker.run(),
  },
  {
    name: "indexnow_outbox",
    group: "analytics",
    intervalSeconds: 15,
    run: () => indexNowWorker.run(),
  },
  {
    name: "listing_view_rollup",
    group: "analytics",
    intervalSeconds: 300,
    run: () => listingEngagementWorker.run(),
  },
  {
    name: "analytics_aggregate_refresh",
    group: "analytics",
    intervalSeconds: 3_600,
    run: () => analyticsService.refreshAggregates(),
  },
  {
    name: "analytics_retention",
    group: "analytics",
    intervalSeconds: 86_400,
    run: () => analyticsService.applyRetention(),
  },
  {
    name: "search_console_ingestion",
    group: "analytics",
    intervalSeconds: 86_400,
    run: () => searchConsoleWorker.run(),
  },
  {
    name: "marketing_outgoing_webhook",
    group: "marketing",
    intervalSeconds: 10,
    run: () => marketingWebhookWorker.run(),
  },
  {
    name: "marketing_journey_execution",
    group: "marketing",
    intervalSeconds: 10,
    run: () => marketingJourneyWorker.run(),
  },
  {
    name: "marketing_campaign_send",
    group: "marketing",
    intervalSeconds: 10,
    run: () => marketingCampaignWorker.run(),
  },
  {
    name: "crm_shongre_sync",
    group: "crm",
    intervalSeconds: 15,
    run: () => crmShongreSyncWorker.run(),
  },
  {
    name: "notification_delivery",
    group: "communications",
    intervalSeconds: 15,
    run: () => notificationsWorker.run(),
  },
  {
    name: "watch_subscription_evaluation",
    group: "communications",
    intervalSeconds: 15,
    run: () => watchSubscriptionsWorker.run(),
  },
  {
    name: "digital_fulfillment_outbox",
    group: "communications",
    intervalSeconds: 10,
    run: () => digitalFulfillmentWorker.run(),
  },
  {
    name: "delivery_domain_outbox",
    group: "communications",
    intervalSeconds: 10,
    run: () => deliveryOutboxWorker.run(),
  },
  {
    name: "commercial_configuration",
    group: "commercial",
    intervalSeconds: 60,
    run: () => commercialConfigurationWorker.run(),
  },
  {
    name: "monetization_lifecycle",
    group: "commercial",
    intervalSeconds: 300,
    run: () => monetizationLifecycleWorker.run(),
  },
  {
    name: "provider_webhook_inbox",
    group: "payments",
    intervalSeconds: 5,
    run: () => providerWebhookWorker.run(),
  },
  {
    name: "order_return_expiry",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: () => ordersService.expireStaleReturns(),
  },
  {
    name: "order_checkout_reconciliation",
    group: "payments",
    intervalSeconds: 300,
    run: () => ordersService.reconcileStaleCheckouts(),
  },
  {
    name: "revenue_recognition",
    group: "finance",
    intervalSeconds: 3_600,
    run: () => revenueRecognitionWorker.run(),
  },
  {
    name: "multilingual_search_reindex",
    group: "lifecycle",
    intervalSeconds: 60,
    run: () => multilingualSearchReindexWorker.run(),
  },
  {
    name: "search_vocabulary_refresh",
    group: "lifecycle",
    intervalSeconds: 900,
    run: () => searchVocabularyWorker.run(),
  },
  {
    name: "review_reminders",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: () => reviewReminderWorker.run(),
  },
  {
    name: "provider_webhook_retention",
    group: "lifecycle",
    intervalSeconds: 86_400,
    run: () => providerWebhookWorker.purge(),
  },
  {
    name: "auth_rate_limit_retention",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: () => authRateLimitRetentionWorker.run(),
  },
  {
    name: "listing_lifecycle",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: async () => {
      // Renewals and scheduled publications first, so an opted-in listing
      // that expires this hour is extended rather than archived.
      await sellerAutomationWorker.run();
      await lifecycleWorker.runExpiredListingsCleanup();
      await lifecycleWorker.runBoostsExpiration();
    },
  },
  {
    name: "digital_fulfillment_lifecycle",
    group: "lifecycle",
    intervalSeconds: 300,
    run: () => digitalFulfillmentWorker.refreshLifecycle(),
  },
  {
    name: "provider_data_deletion",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: () => providerDataDeletionWorker.run(),
  },
  {
    name: "listing_media_cleanup",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: () => storageService.cleanupExpiredListingMedia(),
  },
  {
    name: "legacy_upload_malware_rescan",
    group: "lifecycle",
    intervalSeconds: 30,
    run: () => storageService.rescanLegacyReadyAssets(),
  },
];

const queueDefaults = SHONGRE_RUNTIME_PERFORMANCE_DEFAULTS.queues;

export class ScheduledWorkerRuntime {
  private readonly heartbeat = new WorkerHeartbeat(
    config.workerHealthFile,
    config.environment.environmentId,
  );
  private queueConnection: Redis | undefined;
  private workerConnection: Redis | undefined;
  private queue: Queue<ScheduledJobPayload, void, string> | undefined;
  private worker: Worker<ScheduledJobPayload, void, string> | undefined;

  private selectedJobs(): ScheduledJob[] {
    const configured = config.workerGroups;
    if (configured.includes("all")) return jobs;
    const allowed = new Set(configured);
    const selected = jobs.filter(
      (job) => job.group === "infrastructure" || allowed.has(job.group),
    );
    if (!selected.length) {
      throw new Error(
        `WORKER_GROUPS selected no jobs: ${configured.join(",") || "empty"}`,
      );
    }
    return selected;
  }

  async start(): Promise<void> {
    const selectedJobs = this.selectedJobs();
    const jobsByName = new Map(selectedJobs.map((job) => [job.name, job]));
    this.queueConnection = createRedisConnection("scheduled-producer");
    this.workerConnection = createRedisConnection("scheduled-consumer", {
      worker: true,
    });
    this.queue = new Queue<ScheduledJobPayload, void, string>(
      SCHEDULED_RUNTIME_QUEUE_NAME,
      {
        connection: this.queueConnection,
        prefix: redisKeyPrefix,
        defaultJobOptions: {
          attempts: queueDefaults.attempts,
          backoff: { type: "exponential", delay: queueDefaults.backoffDelayMs },
          removeOnComplete: {
            age: queueDefaults.completedRetentionSeconds,
            count: queueDefaults.completedRetentionCount,
          },
          removeOnFail: {
            age: queueDefaults.failedRetentionSeconds,
            count: queueDefaults.failedRetentionCount,
          },
        },
      },
    );
    this.worker = new Worker<ScheduledJobPayload, void, string>(
      SCHEDULED_RUNTIME_QUEUE_NAME,
      async (queueJob) => {
        const payload = queueJob.data;
        if (
          payload.schemaVersion !== 1 ||
          payload.environmentId !== config.environment.environmentId
        ) {
          throw new Error("Scheduled job payload belongs to another runtime");
        }
        const definition = jobsByName.get(payload.jobName);
        if (!definition || queueJob.name !== definition.name) {
          throw new Error("Scheduled job payload is not registered");
        }
        if (payload.trigger === "domain") {
          if (!(await db.healthCheck())) {
            throw new Error("Database dependency probe failed");
          }
          await definition.run();
          await this.heartbeat.touch();
          logger.info("domain_wake_job_completed", {
            jobId: queueJob.id,
            jobName: queueJob.name,
            correlationId: payload.correlationId,
          });
        } else {
          await this.execute(definition, queueJob);
        }
      },
      {
        connection: this.workerConnection,
        prefix: redisKeyPrefix,
        concurrency: config.queueConcurrency,
        lockDuration: queueDefaults.lockDurationMs,
      },
    );
    this.worker.on("error", (error) => {
      logger.error("bullmq_worker_error", { error: error.message });
    });
    this.worker.on("failed", (job, error) => {
      logger.error("bullmq_job_attempt_failed", {
        jobId: job?.id,
        jobName: job?.name,
        attemptsMade: job?.attemptsMade,
        error: error.message,
      });
    });
    await Promise.all([
      this.queue.waitUntilReady(),
      this.worker.waitUntilReady(),
    ]);
    for (const job of selectedJobs) {
      const payload: ScheduledJobPayload = {
        schemaVersion: 1,
        environmentId: config.environment.environmentId,
        jobName: job.name,
        trigger: "scheduled",
      };
      await this.queue.upsertJobScheduler(
        job.name,
        { every: job.intervalSeconds * 1_000 },
        { name: job.name, data: payload },
      );
      await this.queue.add(job.name, payload, {
        jobId: `bootstrap-${job.name}-${process.pid}-${Date.now()}`,
      });
    }
    logger.info("scheduled_worker_started", {
      ownerId: scheduledJobCoordinator.ownerId,
      jobCount: selectedJobs.length,
      groups: [...new Set(selectedJobs.map((job) => job.group))],
    });
  }

  async stop(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
    this.worker = undefined;
    this.queue = undefined;
    await Promise.allSettled(
      [this.workerConnection, this.queueConnection]
        .filter((connection): connection is Redis => Boolean(connection))
        .map(async (connection) => {
          if (connection.status !== "end") {
            await connection.quit().catch(() => connection.disconnect());
          }
        }),
    );
    this.workerConnection = undefined;
    this.queueConnection = undefined;
    await this.heartbeat.stop();
    logger.info("scheduled_worker_stopped", {
      ownerId: scheduledJobCoordinator.ownerId,
    });
  }

  private async execute(
    job: ScheduledJob,
    queueJob: Job<ScheduledJobPayload, void, string>,
  ): Promise<void> {
    const startedAt = performance.now();
    try {
      const leaseSeconds = Math.max(120, Math.min(job.intervalSeconds, 900));
      const claimed = await scheduledJobCoordinator.claim(
        job.name,
        job.intervalSeconds,
        leaseSeconds,
      );
      await this.heartbeat.touch();
      if (!claimed) {
        // Another replica owns this tick. Recorded so a job that never runs
        // anywhere is distinguishable from one that is merely busy elsewhere.
        metrics.recordScheduledJob({
          job: job.name,
          outcome: "skipped",
          durationMs: performance.now() - startedAt,
        });
        return;
      }
      let leaseLost = false;
      const renewal = setInterval(
        () => {
          void scheduledJobCoordinator
            .renew(job.name, leaseSeconds)
            .then(async (renewed) => {
              if (!renewed) leaseLost = true;
              else await this.heartbeat.touch();
            })
            .catch((error) => {
              leaseLost = true;
              logger.error("scheduled_job_lease_renewal_failed", {
                jobName: job.name,
                error: error instanceof Error ? error.message : String(error),
              });
            });
        },
        Math.max(5_000, Math.floor((leaseSeconds * 1_000) / 3)),
      );
      renewal.unref();
      try {
        await job.run();
        if (leaseLost) {
          throw new Error(
            "Scheduled job lease ownership was lost during execution",
          );
        }
        await scheduledJobCoordinator.complete(job.name, job.intervalSeconds);
        metrics.recordScheduledJob({
          job: job.name,
          outcome: "succeeded",
          durationMs: performance.now() - startedAt,
        });
        logger.info("scheduled_job_completed", { jobName: job.name });
      } catch (error: any) {
        metrics.recordScheduledJob({
          job: job.name,
          outcome: "failed",
          durationMs: performance.now() - startedAt,
        });
        const message = String(error?.message || error).slice(0, 1_000);
        // A different replica owns recovery after a lost lease. Completing the
        // old lease here would either overwrite that replica's state or create
        // a noisy ownership error that obscures the original failure.
        const maximumAttempts = Number(queueJob.opts.attempts || 1);
        const finalAttempt = queueJob.attemptsMade + 1 >= maximumAttempts;
        if (!leaseLost && finalAttempt) {
          await scheduledJobCoordinator.complete(
            job.name,
            job.intervalSeconds,
            message,
          );
        } else if (!leaseLost) {
          await scheduledJobCoordinator.releaseForRetry(job.name);
        }
        logger.error("scheduled_job_failed", {
          jobName: job.name,
          error: message,
        });
        captureServerException(error, { operation: job.name });
        throw error;
      } finally {
        clearInterval(renewal);
      }
    } catch (error: any) {
      logger.error("scheduled_job_coordination_failed", {
        jobName: job.name,
        error: String(error?.message || error),
      });
      captureServerException(error, { operation: job.name });
      throw error;
    }
  }
}

export const scheduledWorkerRuntime = new ScheduledWorkerRuntime();
