import {
  IVerificationRepository,
  repositories,
  VerificationState,
  UserVerificationStatus,
} from "../../infrastructure/database/repositories/index.js";
import {
  IBusinessRegistryProvider,
  providers,
} from "../../integrations/providers/index.js";
import { CompanyInfo } from "../../integrations/business-registry/siret-resolver.js";
import { AppError } from "../../shared/errors/app-error.js";
import { logger } from "../../infrastructure/logging/logger.js";
import { complianceService } from "../compliance/compliance.service.js";

export type { VerificationState, CompanyInfo };

export class VerificationService {
  constructor(
    private verificationRepo: IVerificationRepository = repositories.verification,
    private businessRegistry: IBusinessRegistryProvider = providers.businessRegistry,
  ) {}

  async getUserVerificationStatus(
    userId: string,
  ): Promise<UserVerificationStatus> {
    return this.verificationRepo.getUserStatus(userId);
  }

  async lookupCompanyBySiret(
    siretOrSiren: string,
  ): Promise<CompanyInfo | null> {
    return this.businessRegistry.lookupBySiret(siretOrSiren);
  }

  async submitBusinessRegistration(
    userId: string,
    siret: string,
  ): Promise<{ status: "verified" }> {
    const company = await this.lookupCompanyBySiret(siret);
    if (!company) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message:
          "Numéro SIRET invalide ou entreprise non trouvée dans le répertoire officiel.",
      });
    }

    const providerReference = `rne:${company.siret}`;
    await complianceService.applyTrustedVerification({
      userId,
      record: {
        dimension: "business",
        state: "verified",
        provider: "official_business_registry",
        providerReference,
        method: "structured_registry_lookup",
        verifiedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        visibility: "COMPLIANCE_ONLY",
      },
      actorType: "SYSTEM",
      reasonCode: "BUSINESS_REGISTRY_MATCH",
    });
    await complianceService.openManualReview({
      userId,
      dimension: "business_representative",
      reasonCode: "REPRESENTATIVE_AUTHORITY_CONFIRMATION_REQUIRED",
    });
    await this.verificationRepo.updateUserVerification(userId, {
      isBusinessVerified: true,
    });

    logger.info("Business registry verification completed");
    return { status: "verified" };
  }
}

export const verificationService = new VerificationService();
