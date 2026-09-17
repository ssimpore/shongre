import { apiOperation } from "@/api/generated-api-operation";

/** The account's trust facts, as the Web verification page lists them. */
export interface MobileVerificationStatus {
  state: string;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  isBusinessVerified: boolean;
  isBankPayoutConfigured: boolean;
}

export interface MobileIdentitySession {
  sessionId: string;
  /** The provider's hosted flow; the phone opens it in the system browser. */
  redirectUrl: string;
  expiresAt: string;
}

export interface VerificationService {
  status(userId: string): Promise<MobileVerificationStatus>;
  startIdentitySession(jurisdiction: string): Promise<MobileIdentitySession>;
}

export class HttpVerificationService implements VerificationService {
  async status(userId: string): Promise<MobileVerificationStatus> {
    const status = (await apiOperation("getVerificationStatusByUserId", {
      path: { userId },
    })) as Partial<MobileVerificationStatus> | null;
    return {
      state: status?.state ?? "unverified",
      isPhoneVerified: Boolean(status?.isPhoneVerified),
      isIdentityVerified: Boolean(status?.isIdentityVerified),
      isBusinessVerified: Boolean(status?.isBusinessVerified),
      isBankPayoutConfigured: Boolean(status?.isBankPayoutConfigured),
    };
  }

  async startIdentitySession(
    jurisdiction: string,
  ): Promise<MobileIdentitySession> {
    // The provider returns to the Web verification page: the outcome is a
    // status change the phone reads back on focus.
    const session = (await apiOperation("postComplianceIdentitySession", {
      body: {
        dimension: "identity",
        jurisdiction,
        returnTo: "/compte/verification",
      },
    })) as Partial<MobileIdentitySession> | null;
    if (!session?.redirectUrl) {
      throw new Error("La vérification n’a pas pu être lancée.");
    }
    return {
      sessionId: session.sessionId ?? "",
      redirectUrl: session.redirectUrl,
      expiresAt: session.expiresAt ?? "",
    };
  }
}

export const verificationService: VerificationService =
  new HttpVerificationService();
