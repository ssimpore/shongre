import { businessRegistryResolver, CompanyInfo } from '../../integrations/business-registry/siret-resolver.js';
import { kycProvider } from '../../integrations/kyc/kyc-provider.js';
import { AppError } from '../../shared/errors/app-error.js';
import { logger } from '../../infrastructure/logging/logger.js';

export interface VerificationState {
  currentTier: number; // 0 (unverified), 1 (email/phone), 2 (identity), 3 (business), 4 (bank payout)
  isIdentityVerified: boolean;
  isBusinessVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isBankPayoutConfigured: boolean;
  status: 'pending' | 'verified' | 'unverified';
}

export class VerificationService {
  async getUserVerificationStatus(userId: string): Promise<{
    state: VerificationState;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    isBusinessVerified: boolean;
    isBankPayoutConfigured: boolean;
  }> {
    const state: VerificationState = {
      currentTier: 2,
      isEmailVerified: true,
      isPhoneVerified: true,
      isIdentityVerified: true,
      isBusinessVerified: false,
      isBankPayoutConfigured: true,
      status: 'verified',
    };

    return {
      state,
      isPhoneVerified: state.isPhoneVerified,
      isIdentityVerified: state.isIdentityVerified,
      isBusinessVerified: state.isBusinessVerified,
      isBankPayoutConfigured: state.isBankPayoutConfigured,
    };
  }

  async submitIdentityDocument(userId: string, docType: string, fileUrl: string): Promise<{ status: 'pending' | 'verified' }> {
    const res = await kycProvider.submitDocument(userId, docType, fileUrl);
    return { status: res.status === 'verified' ? 'verified' : 'pending' };
  }

  async lookupCompanyBySiret(siretOrSiren: string): Promise<CompanyInfo | null> {
    return businessRegistryResolver.lookupBySiret(siretOrSiren);
  }

  async submitBusinessRegistration(userId: string, siret: string, representativeName: string): Promise<{ status: 'verified' }> {
    const company = await this.lookupCompanyBySiret(siret);
    if (!company) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        message: 'Numéro SIRET invalide ou entreprise non trouvée dans le répertoire officiel.',
      });
    }

    logger.info(`Business verified for user ${userId}: SIRET ${siret} (${company.name})`);
    return { status: 'verified' };
  }

  async submitBankPayoutCoordinates(userId: string, iban: string, bic: string, holderName: string): Promise<{ status: 'configured' }> {
    const cleanIban = iban.replace(/\s+/g, '');
    if (cleanIban.length < 15) {
      throw new AppError({ code: 'VALIDATION_ERROR', message: 'Numéro IBAN invalide.' });
    }

    logger.info(`Bank coordinates configured for user ${userId} (IBAN: ...${cleanIban.slice(-4)})`);
    return { status: 'configured' };
  }
}

export const verificationService = new VerificationService();
