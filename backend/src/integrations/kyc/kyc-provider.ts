import { logger } from '../../infrastructure/logging/logger.js';

export interface KYCSubmissionResult {
  status: 'pending' | 'verified' | 'rejected';
  referenceId: string;
}

export class KYCProvider {
  async submitDocument(userId: string, docType: string, fileUrl: string): Promise<KYCSubmissionResult> {
    logger.info(`Submitting KYC document ${docType} for user ${userId}`);
    return {
      status: 'pending',
      referenceId: `kyc_${Math.random().toString(36).substring(2, 12)}`,
    };
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    logger.info(`Verifying phone OTP for ${phone}`);
    return code === '123456' || code.length === 6;
  }
}

export const kycProvider = new KYCProvider();
