import React, { useState } from "react";
import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import { services } from "../../../api/client/service-registry";
import { useVerification } from "../../../domains/verification/useVerification";
import { useToast } from "../../../app/providers/ToastProvider";
import { useMarketLocation } from "../../../app/providers/MarketLocationProvider";

export interface BankPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  returnTo?: string;
}

export const BankPayoutModal: React.FC<BankPayoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  returnTo = "/compte/verification",
}) => {
  const { currentUser, refreshUser } = useVerification();
  const toast = useToast();
  const { activeMarket } = useMarketLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const begin = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const onboarding = await services.verification.startPaymentOnboarding({
        userId: currentUser.id,
        jurisdiction: currentUser.country || activeMarket.countryCode,
        returnTo,
        contactEmail: currentUser.email,
        displayName: currentUser.name,
        sellerType:
          currentUser.accountType === "professional" ||
          currentUser.sellerType === "pro"
            ? "professional"
            : "individual",
      });
      refreshUser?.();
      onSuccess?.();
      toast.success(
        "Compte de versement mis à jour",
        "Le prestataire de paiement a enregistré le résultat.",
      );
      onClose();
      if (onboarding.onboardingUrl && onboarding.onboardingUrl !== returnTo) {
        window.location.assign(onboarding.onboardingUrl);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de lancer la vérification de versement.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Activer les versements"
      description="La vérification du compte bancaire est nécessaire uniquement avant de recevoir des fonds."
      headerIcon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-surface text-info">
          <CreditCard className="h-icon-lg w-icon-lg" aria-hidden="true" />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
          <p className="font-bold text-stone-900">Ce qui se passe ensuite</p>
          <ol className="mt-3 space-y-2">
            <li>
              1. Le prestataire de paiement collecte les informations
              nécessaires.
            </li>
            <li>2. Il contrôle le titulaire et les exigences applicables.</li>
            <li>3. Shongre reçoit uniquement le statut d’activation.</li>
          </ol>
        </div>

        <div className="flex gap-3 text-sm text-stone-600">
          <ShieldCheck
            className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-success"
            aria-hidden="true"
          />
          <p>
            Publier et échanger restent disponibles pendant l’examen. Seul le
            versement demeure en attente.
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl bg-danger-surface p-3 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Plus tard
          </Button>
          <Button onClick={begin} isLoading={isLoading}>
            Continuer chez le prestataire
            <ExternalLink className="h-icon-md w-icon-md" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
