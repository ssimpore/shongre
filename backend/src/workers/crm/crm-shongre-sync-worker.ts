import { randomUUID } from "node:crypto";
import { logger } from "../../infrastructure/logging/logger.js";
import {
  type ICrmRepository,
  type ICrmShongreIntegrationRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";
import {
  ownerUserIdForCrmShongreEvent,
  PermanentCrmShongreEventError,
} from "../../integrations/shongre/index.js";

export class CrmShongreSyncWorker {
  private readonly workerId: string;

  constructor(
    private readonly integrationRepository: ICrmShongreIntegrationRepository = repositories.crmShongre,
    private readonly crmRepository: ICrmRepository = repositories.crm,
    workerId = `crm-shongre-worker-${process.pid}-${randomUUID()}`,
  ) {
    this.workerId = workerId;
  }

  async run(limit = 50): Promise<{
    claimed: number;
    succeeded: number;
    retried: number;
    deadLettered: number;
  }> {
    const events = await this.integrationRepository.claim(
      this.workerId,
      Math.max(1, Math.min(200, Math.trunc(limit))),
      120,
    );
    const result = {
      claimed: events.length,
      succeeded: 0,
      retried: 0,
      deadLettered: 0,
    };
    for (const event of events) {
      try {
        const ownerUserId = ownerUserIdForCrmShongreEvent(event);
        const context =
          (await this.crmRepository.getTenantContext(event.tenantId)) ??
          (await this.crmRepository.provisionTenant(
            event.tenantId,
            ownerUserId,
          ));
        await this.integrationRepository.apply(event, context.workspaceId);
        await this.integrationRepository.complete({
          eventId: event.id,
          workerId: this.workerId,
          success: true,
        });
        result.succeeded += 1;
      } catch (error) {
        const permanent = error instanceof PermanentCrmShongreEventError;
        const retryAt = new Date(
          Date.now() +
            Math.min(6 * 60 * 60 * 1_000, 30_000 * 2 ** event.attemptNumber),
        ).toISOString();
        await this.integrationRepository.complete({
          eventId: event.id,
          workerId: this.workerId,
          success: false,
          permanentFailure: permanent,
          errorCode: permanent ? error.code : "CRM_SHONGRE_SYNC_FAILED",
          errorMessage: String((error as Error)?.message || error).slice(
            0,
            1_000,
          ),
          retryAt,
        });
        if (permanent) result.deadLettered += 1;
        else result.retried += 1;
      }
    }
    if (events.length) logger.info("crm_shongre_sync_batch_completed", result);
    return result;
  }
}

export const crmShongreSyncWorker = new CrmShongreSyncWorker();
