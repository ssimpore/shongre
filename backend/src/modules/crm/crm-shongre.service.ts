import type { Principal } from "../../shared/auth/principal.js";
import { requireAuthenticated } from "../../shared/auth/principal.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
  type ICrmRepository,
  type ICrmShongreIntegrationRepository,
  repositories,
} from "../../infrastructure/database/repositories/index.js";

/**
 * Shongre-specific extension boundary. The generic CRM service never queries
 * marketplace, professional or Billing tables directly.
 */
export class CrmShongreService {
  constructor(
    private readonly crmRepository: ICrmRepository = repositories.crm,
    private readonly integrationRepository: ICrmShongreIntegrationRepository = repositories.crmShongre,
  ) {}

  async accountIntelligence(principal: Principal, accountId: string) {
    requireAuthenticated(principal);
    const tenantId = await this.crmRepository.resolveTenantId(principal.userId);
    if (!tenantId) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "Aucun espace professionnel actif n’est associé à ce compte.",
      });
    }
    const account = await this.crmRepository.getAccount(tenantId, accountId);
    if (!account) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "Compte CRM introuvable.",
      });
    }
    return this.integrationRepository.getAccountIntelligence(
      tenantId,
      accountId,
    );
  }
}

export const crmShongreService = new CrmShongreService();
