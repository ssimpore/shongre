import { logger } from "../infrastructure/logging/logger.js";
import { scheduledJobCoordinator } from "../infrastructure/queue/scheduled-job-coordinator.js";
import { storageService } from "../infrastructure/storage/storage-service.js";
import { providerDataDeletionWorker } from "./auth/provider-data-deletion-worker.js";
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

interface ScheduledJob {
  name: string;
  intervalSeconds: number;
  run: () => Promise<unknown>;
}

const jobs: ScheduledJob[] = [
  {
    name: "analytics_provider_delivery",
    intervalSeconds: 15,
    run: () => analyticsService.retryProviderDeliveries(),
  },
  {
    name: "analytics_aggregate_refresh",
    intervalSeconds: 3_600,
    run: () => analyticsService.refreshAggregates(),
  },
  {
    name: "analytics_retention",
    intervalSeconds: 86_400,
    run: () => analyticsService.applyRetention(),
  },
  {
    name: "search_console_ingestion",
    intervalSeconds: 86_400,
    run: () => searchConsoleWorker.run(),
  },
  {
    name: "marketing_outgoing_webhook",
    intervalSeconds: 10,
    run: () => marketingWebhookWorker.run(),
  },
  {
    name: "marketing_journey_execution",
    intervalSeconds: 10,
    run: () => marketingJourneyWorker.run(),
  },
  {
    name: "marketing_campaign_send",
    intervalSeconds: 10,
    run: () => marketingCampaignWorker.run(),
  },
  {
    name: "crm_shongre_sync",
    intervalSeconds: 15,
    run: () => crmShongreSyncWorker.run(),
  },
  {
    name: "notification_delivery",
    intervalSeconds: 15,
    run: () => notificationsWorker.run(),
  },
  {
    name: "commercial_configuration",
    intervalSeconds: 60,
    run: () => commercialConfigurationWorker.run(),
  },
  {
    name: "monetization_lifecycle",
    intervalSeconds: 300,
    run: () => monetizationLifecycleWorker.run(),
  },
  {
    name: "order_checkout_reconciliation",
    intervalSeconds: 300,
    run: () => ordersService.reconcileStaleCheckouts(),
  },
  {
    name: "revenue_recognition",
    intervalSeconds: 3_600,
    run: () => revenueRecognitionWorker.run(),
  },
  {
    name: "listing_lifecycle",
    intervalSeconds: 3_600,
    run: async () => {
      await lifecycleWorker.runExpiredListingsCleanup();
      await lifecycleWorker.runBoostsExpiration();
    },
  },
  {
    name: "provider_data_deletion",
    intervalSeconds: 3_600,
    run: () => providerDataDeletionWorker.run(),
  },
  {
    name: "listing_media_cleanup",
    intervalSeconds: 3_600,
    run: () => storageService.cleanupExpiredListingMedia(),
  },
];

export class ScheduledWorkerRuntime {
  private stopped = false;
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly inFlight = new Set<Promise<void>>();

  start(): void {
    this.stopped = false;
    for (const job of jobs) this.schedule(job, 0);
    logger.info("scheduled_worker_started", {
      ownerId: scheduledJobCoordinator.ownerId,
      jobCount: jobs.length,
    });
  }

  async stop(): Promise<void> {
    this.stopped = true;
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    await Promise.allSettled(this.inFlight);
    logger.info("scheduled_worker_stopped", {
      ownerId: scheduledJobCoordinator.ownerId,
    });
  }

  private schedule(job: ScheduledJob, delayMs: number): void {
    if (this.stopped) return;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      const execution = this.execute(job).finally(() => {
        this.inFlight.delete(execution);
        this.schedule(job, Math.min(job.intervalSeconds * 1_000, 60_000));
      });
      this.inFlight.add(execution);
    }, delayMs);
    this.timers.add(timer);
  }

  private async execute(job: ScheduledJob): Promise<void> {
    try {
      const claimed = await scheduledJobCoordinator.claim(
        job.name,
        job.intervalSeconds,
        Math.max(120, Math.min(job.intervalSeconds, 900)),
      );
      if (!claimed) return;
      try {
        await job.run();
        await scheduledJobCoordinator.complete(job.name, job.intervalSeconds);
        logger.info("scheduled_job_completed", { jobName: job.name });
      } catch (error: any) {
        const message = String(error?.message || error).slice(0, 1_000);
        await scheduledJobCoordinator.complete(
          job.name,
          job.intervalSeconds,
          message,
        );
        logger.error("scheduled_job_failed", {
          jobName: job.name,
          error: message,
        });
        captureServerException(error, { operation: job.name });
      }
    } catch (error: any) {
      logger.error("scheduled_job_coordination_failed", {
        jobName: job.name,
        error: String(error?.message || error),
      });
      captureServerException(error, { operation: job.name });
    }
  }
}

export const scheduledWorkerRuntime = new ScheduledWorkerRuntime();
