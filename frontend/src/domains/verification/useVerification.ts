import { useMemo, useCallback } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { verificationService } from "./verification.service";
import {
  KycSubmissionData,
  KybSubmissionData,
  UserVerificationSummary,
} from "./verification.types";

export function useVerification() {
  const { currentUser, refreshUser } = useAuth();

  const summary: UserVerificationSummary = useMemo(() => {
    return verificationService.getUserVerificationSummary(currentUser);
  }, [currentUser]);

  const submitKyc = useCallback(
    async (data: KycSubmissionData, instantApprove = false) => {
      if (!currentUser) throw new Error("Utilisateur non connecté");
      const res = verificationService.submitIdentityVerification(
        currentUser.id,
        data,
        instantApprove,
      );
      if (res.success) {
        refreshUser?.();
      }
      return res;
    },
    [currentUser, refreshUser],
  );

  const submitKyb = useCallback(
    async (data: KybSubmissionData, instantApprove = false) => {
      if (!currentUser) throw new Error("Utilisateur non connecté");
      const res = verificationService.submitBusinessVerification(
        currentUser.id,
        data,
        instantApprove,
      );
      if (res.success) {
        refreshUser?.();
      }
      return res;
    },
    [currentUser, refreshUser],
  );

  const setPreset = useCallback(
    (
      preset:
        | "tier_0_unverified"
        | "tier_1_email_only"
        | "tier_2_phone_verified"
        | "kyc_pending"
        | "tier_3_kyc_verified"
        | "kyc_rejected"
        | "kyb_pending"
        | "tier_4_kyb_verified"
        | "kyb_rejected"
        | "full_trust_pro",
    ) => {
      if (!currentUser) return;
      const res = verificationService.setDemoVerificationState(
        currentUser.id,
        preset,
      );
      refreshUser?.();
      return res;
    },
    [currentUser, refreshUser],
  );

  return {
    currentUser,
    summary,
    dimensions: summary.dimensions,
    submitKyc,
    submitKyb,
    setPreset,
    refreshUser,
  };
}
