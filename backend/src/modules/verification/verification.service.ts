import {
  IVerificationRepository,
  repositories,
  VerificationState,
  UserVerificationStatus,
} from '../../infrastructure/database/repositories/index.js';
import {
  IBusinessRegistryProvider,
  IKYCProvider,
  providers,
} from '../../integrations/providers/index.js';
import { CompanyInfo } from '../../integrations/business-registry/siret-resolver.js';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../infrastructure/logging/logger.js';

export type { VerificationState, CompanyInfo };

export class VerificationService {
  constructor(
    private verificationRepo: IVerificationRepository = repositories.verification,
    private businessRegistry: IBusinessRegistryProvider = providers.businessRegistry,
    private kyc: IKYCProvider = providers.kyc
  ) {}

  async getUserVerificationStatus(userId: string): Promise<UserVerificationStatus> {
    return this.verificationRepo.getUserStatus(userId);
  }

  async submitIdentityDocument(userId: string, docType: string, fileUrl: string): Promise<{ status: 'pending' | 'verified' }> {
    const res = await this.kyc.submitDocument(userId, docType, fileUrl);
    await this.verificationRepo.saveVerificationRequest({
      userId,
      type: 'identity_document',
      documentType: docType,
      documentUrl: fileUrl,
    });
    return { status: res.status === 'verified' ? 'verified' : 'pending' };
  }

  async lookupCompanyBySiret(siretOrSiren: string): Promise<CompanyInfo | null> {
    return this.businessRegistry.lookupBySiret(siretOrSiren);
  }

  async submitBusinessRegistration(userId: string, siret: string, representativeName: string): Promise<{ status: 'verified' }> {
    const company = await this.lookupCompanyBySiret(siret);
    if (!company) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Numéro SIRET invalide ou entreprise non trouvée dans le répertoire officiel.',
      });
    }

    await this.verificationRepo.saveVerificationRequest({
      userId,
      type: 'siret_registry',
      siret,
      companyName: company.name,
    });
    await this.verificationRepo.updateUserVerification(userId, { isBusinessVerified: true });

    logger.info(`Business verified for user ${userId}: SIRET ${siret} (${company.name})`);
    return { status: 'verified' };
  }

  async submitBankPayoutCoordinates(userId: string, iban: string, bic: string, holderName: string): Promise<{ status: 'configured' }> {
    const cleanIban = iban.replace(/\s+/g, '');
    if (cleanIban.length < 15) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Numéro IBAN invalide.' });
    }

    await this.verificationRepo.saveVerificationRequest({
      userId,
      type: 'bank_iban',
      iban: cleanIban,
      bic,
      companyName: holderName,
    });

    logger.info(`Bank coordinates configured for user ${userId} (IBAN: ...${cleanIban.slice(-4)})`);
    return { status: 'configured' };
  }
}

export const verificationService = new VerificationService();
