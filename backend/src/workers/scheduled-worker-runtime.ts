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
import { providerWebhookWorker } from "./payments/provider-webhook-worker.js";
import { multilingualSearchReindexWorker } from "./search/multilingual-search-reindex-worker.js";
import { digitalFulfillmentWorker } from "./digital-products/digital-fulfillment-worker.js";

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
    | "lifecycle";
  intervalSeconds: number;
  run: () => Promise<unknown>;
}

const jobs: ScheduledJob[] = [
  {
    name: "analytics_provider_delivery",
    group: "analytics",
    intervalSeconds: 15,
    run: () => analyticsService.retryProviderDeliveries(),
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
    name: "digital_fulfillment_outbox",
    group: "communications",
    intervalSeconds: 10,
    run: () => digitalFulfillmentWorker.run(),
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
    name: "provider_webhook_retention",
    group: "lifecycle",
    intervalSeconds: 86_400,
    run: () => providerWebhookWorker.purge(),
  },
  {
    name: "listing_lifecycle",
    group: "lifecycle",
    intervalSeconds: 3_600,
    run: async () => {
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

export class ScheduledWorkerRuntime {
  private stopped = false;
  private readonly timers = new Set<NodeJS.Timeout>();
  private readonly inFlight = new Set<Promise<void>>();

  private selectedJobs(): ScheduledJob[] {
    const configured = (process.env.WORKER_GROUPS || "all")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (configured.includes("all")) return jobs;
    const allowed = new Set(configured);
    const selected = jobs.filter((job) => allowed.has(job.group));
    if (!selected.length) {
      throw new Error(
        `WORKER_GROUPS selected no jobs: ${configured.join(",") || "empty"}`,
      );
    }
    return selected;
  }

  start(): void {
    this.stopped = false;
    const selectedJobs = this.selectedJobs();
    for (const job of selectedJobs) this.schedule(job, 0);
    logger.info("scheduled_worker_started", {
      ownerId: scheduledJobCoordinator.ownerId,
      jobCount: selectedJobs.length,
      groups: [...new Set(selectedJobs.map((job) => job.group))],
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
      const leaseSeconds = Math.max(120, Math.min(job.intervalSeconds, 900));
      const claimed = await scheduledJobCoordinator.claim(
        job.name,
        job.intervalSeconds,
        leaseSeconds,
      );
      if (!claimed) return;
      let leaseLost = false;
      const renewal = setInterval(
        () => {
          void scheduledJobCoordinator
            .renew(job.name, leaseSeconds)
            .then((renewed) => {
              if (!renewed) leaseLost = true;
            })
            .catch((error) => {
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
        logger.info("scheduled_job_completed", { jobName: job.name });
      } catch (error: any) {
        const message = String(error?.message || error).slice(0, 1_000);
        // A different replica owns recovery after a lost lease. Completing the
        // old lease here would either overwrite that replica's state or create
        // a noisy ownership error that obscures the original failure.
        if (!leaseLost) {
          await scheduledJobCoordinator.complete(
            job.name,
            job.intervalSeconds,
            message,
          );
        }
        logger.error("scheduled_job_failed", {
          jobName: job.name,
          error: message,
        });
        captureServerException(error, { operation: job.name });
      } finally {
        clearInterval(renewal);
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
