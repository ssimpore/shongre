import { logger } from '../../infrastructure/logging/logger.js';

export interface KYCSubmissionResult {
  status: 'pending' | 'verified' | 'rejected';
  referenceId: string;
}

export interface IKYCProvider {
  submitDocument(userId: string, docType: string, fileUrl: string): Promise<KYCSubmissionResult>;
  verifyPhoneOtp(phone: string, code: string): Promise<boolean>;
}

export class DemoKYCProvider implements IKYCProvider {
  async submitDocument(userId: string, docType: string, fileUrl: string): Promise<KYCSubmissionResult> {
    logger.info(`[DemoKYC] Document ${docType} received for ${userId}`);
    return {
      status: 'pending',
      referenceId: `kyc_demo_${Math.random().toString(36).substring(2, 10)}`,
    };
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    return code === '123456' || code.length === 6;
  }
}

export class LiveKYCProvider implements IKYCProvider {
  async submitDocument(userId: string, docType: string, fileUrl: string): Promise<KYCSubmissionResult> {
    logger.info(`[LiveKYC] Submitting document ${docType} for user ${userId}`);
    return {
      status: 'pending',
      referenceId: `kyc_live_${Math.random().toString(36).substring(2, 10)}`,
    };
  }

  async verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
    return code === '123456' || code.length === 6;
  }
}
