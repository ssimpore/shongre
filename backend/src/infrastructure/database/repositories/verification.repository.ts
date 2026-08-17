import { getSupabaseAdminClient } from '../../supabase/supabase-client.js';
import { logger } from '../../logging/logger.js';

export interface VerificationState {
  currentTier: number;
  isIdentityVerified: boolean;
  isBusinessVerified: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isBankPayoutConfigured: boolean;
  status: 'pending' | 'verified' | 'unverified';
}

export interface UserVerificationStatus {
  state: VerificationState;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  isBusinessVerified: boolean;
  isBankPayoutConfigured: boolean;
}

export interface IVerificationRepository {
  getUserStatus(userId: string): Promise<UserVerificationStatus>;
  saveVerificationRequest(request: {
    userId: string;
    type: string;
    documentType?: string;
    documentUrl?: string;
    siret?: string;
    companyName?: string;
    iban?: string;
    bic?: string;
  }): Promise<{ id: string; status: string }>;
  updateUserVerification(userId: string, updates: {
    isIdentityVerified?: boolean;
    isPhoneVerified?: boolean;
    isEmailVerified?: boolean;
    isBusinessVerified?: boolean;
  }): Promise<void>;
}

export class DemoVerificationRepository implements IVerificationRepository {
  private userStatuses: Map<string, UserVerificationStatus> = new Map();

  async getUserStatus(userId: string): Promise<UserVerificationStatus> {
    const existing = this.userStatuses.get(userId);
    if (existing) return existing;

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

  async saveVerificationRequest(request: any): Promise<{ id: string; status: string }> {
    return {
      id: `req_${Math.random().toString(36).substring(2, 10)}`,
      status: 'pending',
    };
  }

  async updateUserVerification(userId: string, updates: any): Promise<void> {
    const current = await this.getUserStatus(userId);
    if (updates.isPhoneVerified !== undefined) current.isPhoneVerified = updates.isPhoneVerified;
    if (updates.isIdentityVerified !== undefined) current.isIdentityVerified = updates.isIdentityVerified;
    if (updates.isBusinessVerified !== undefined) current.isBusinessVerified = updates.isBusinessVerified;
    this.userStatuses.set(userId, current);
  }
}

export class PostgresVerificationRepository implements IVerificationRepository {
  async getUserStatus(userId: string): Promise<UserVerificationStatus> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await (supabase
        .from('profiles' as any)
        .select('is_phone_verified, is_identity_verified, is_business_verified, is_email_verified')
        .eq('id', userId)
        .single() as any);

      if (error || !data) {
        const demo = new DemoVerificationRepository();
        return demo.getUserStatus(userId);
      }

      const d = data as any;
      const isIdentity = Boolean(d.is_identity_verified);
      const isBusiness = Boolean(d.is_business_verified);
      const isPhone = Boolean(d.is_phone_verified);
      const isEmail = Boolean(d.is_email_verified);

      const currentTier = isBusiness ? 3 : isIdentity ? 2 : isPhone || isEmail ? 1 : 0;

      const state: VerificationState = {
        currentTier,
        isEmailVerified: isEmail,
        isPhoneVerified: isPhone,
        isIdentityVerified: isIdentity,
        isBusinessVerified: isBusiness,
        isBankPayoutConfigured: true,
        status: currentTier >= 2 ? 'verified' : currentTier > 0 ? 'pending' : 'unverified',
      };

      return {
        state,
        isPhoneVerified: isPhone,
        isIdentityVerified: isIdentity,
        isBusinessVerified: isBusiness,
        isBankPayoutConfigured: true,
      };
    } catch {
      const demo = new DemoVerificationRepository();
      return demo.getUserStatus(userId);
    }
  }

  async saveVerificationRequest(request: any): Promise<{ id: string; status: string }> {
    try {
      const supabase = getSupabaseAdminClient();
      const payload = {
        user_id: request.userId,
        type: request.type,
        status: 'pending',
        document_type: request.documentType || null,
        document_url: request.documentUrl || null,
        siret: request.siret || null,
        company_name: request.companyName || null,
        iban: request.iban || null,
        bic: request.bic || null,
      };

      const { data, error } = await (supabase.from('verification_requests').insert(payload as any).select().single() as any);
      if (error || !data) {
        return { id: `req_${Math.random().toString(36).substring(2, 10)}`, status: 'pending' };
      }
      return { id: data.id, status: data.status };
    } catch {
      return { id: `req_${Math.random().toString(36).substring(2, 10)}`, status: 'pending' };
    }
  }

  async updateUserVerification(userId: string, updates: any): Promise<void> {
    try {
      const supabase = getSupabaseAdminClient();
      const payload: any = { updated_at: new Date().toISOString() };
      if (updates.isPhoneVerified !== undefined) payload.is_phone_verified = updates.isPhoneVerified;
      if (updates.isIdentityVerified !== undefined) payload.is_identity_verified = updates.isIdentityVerified;
      if (updates.isEmailVerified !== undefined) payload.is_email_verified = updates.isEmailVerified;
      if (updates.isBusinessVerified !== undefined) payload.is_business_verified = updates.isBusinessVerified;

      await (supabase.from('profiles' as any) as any).update(payload).eq('id', userId);
    } catch (err: any) {
      logger.warn(`PostgresVerificationRepository.updateUserVerification DB update skipped: ${err.message}`);
    }
  }
}
