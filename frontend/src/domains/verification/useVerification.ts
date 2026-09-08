import { useMemo } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import type { UserProfile } from "../../types";
import type {
  UserVerificationSummary,
  VerificationDimensionId,
  VerificationRequirement,
  VerificationState,
} from "./verification.types";

const STATES = new Set<VerificationState>([
  "not_started",
  "pending",
  "verified",
  "requires_action",
  "rejected",
  "expired",
]);

function stateOf(value: string | undefined): VerificationState {
  return value && STATES.has(value as VerificationState)
    ? (value as VerificationState)
    : "not_started";
}

function requirement(
  id: VerificationDimensionId,
  label: string,
  shortLabel: string,
  description: string,
  state: VerificationState,
  options: Partial<VerificationRequirement> = {},
): VerificationRequirement {
  return { id, label, shortLabel, description, state, ...options };
}

function summarize(user: UserProfile | null): UserVerificationSummary {
  const identityState = user
    ? stateOf(
        user.identityVerification?.status ||
          (user.isIdentityVerified ? "verified" : undefined),
      )
    : "not_started";
  const businessState = user
    ? stateOf(
        user.professionalVerification?.status ||
          (user.accountType === "professional" && user.isVerified
            ? "verified"
            : undefined),
      )
    : "not_started";
  const bankState = user
    ? stateOf(user.bankPayoutVerification?.status)
    : "not_started";
  const dimensions: Record<VerificationDimensionId, VerificationRequirement> = {
    email: requirement(
      "email",
      "Adresse email",
      "Email",
      "Confirmation de l’adresse utilisée pour les notifications du compte.",
      user?.isEmailVerified ? "verified" : "not_started",
      { completedAt: user?.isEmailVerified ? user.createdAt : undefined },
    ),
    phone: requirement(
      "phone",
      "Numéro de téléphone",
      "Téléphone",
      "Confirmation du numéro lorsqu’une action le demande.",
      user?.isPhoneVerified ? "verified" : "not_started",
    ),
    identity: requirement(
      "identity",
      "Identité personnelle",
      "Identité",
      "Résultat du contrôle d’identité réalisé par le prestataire.",
      identityState,
      {
        completedAt: user?.identityVerification?.verifiedAt,
        rejectionReason: user?.identityVerification?.rejectionReason,
      },
    ),
    business: requirement(
      "business",
      "Entreprise et immatriculation",
      "Entreprise",
      "Vérification de l’immatriculation de l’entreprise.",
      businessState,
      {
        completedAt: user?.professionalVerification?.reviewedAt,
        rejectionReason: user?.professionalVerification?.rejectionReason,
      },
    ),
    bank_payout: requirement(
      "bank_payout",
      "Compte de versement",
      "Versements",
      "Statut d’activation du compte de versement chez le prestataire.",
      bankState,
      {
        completedAt: user?.bankPayoutVerification?.verifiedAt,
        rejectionReason: user?.bankPayoutVerification?.rejectionReason,
      },
    ),
    mfa: requirement(
      "mfa",
      "Double authentification",
      "2FA",
      "Protection renforcée du compte.",
      user?.mfaEnabled || user?.mfa?.isEnabled ? "verified" : "not_started",
    ),
  };
  return {
    dimensions,
    pendingReviewsCount: [identityState, businessState, bankState].filter(
      (state) => state === "pending",
    ).length,
  };
}

export function useVerification() {
  const { currentUser, refreshUser } = useAuth();
  const summary = useMemo(() => summarize(currentUser), [currentUser]);
  return {
    currentUser,
    summary,
    dimensions: summary.dimensions,
    refreshUser,
  };
}
