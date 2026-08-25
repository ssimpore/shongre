import type { MarketingJourneyEvent } from "@shongre/contracts/marketing";
import { config } from "../../app/config/index.js";
import { PostgresMarketingOperationsRepository } from "../../infrastructure/database/repositories/marketing-operations.repository.js";

const repository = new PostgresMarketingOperationsRepository();

/** Internal domain-event bridge for sources that do not have a user principal. */
export async function emitMarketingJourneyEvent(
  tenantId: string,
  event: MarketingJourneyEvent,
) {
  if (config.dataMode !== "database") return [];
  return repository.enqueueJourneyEvent(tenantId, event);
}
