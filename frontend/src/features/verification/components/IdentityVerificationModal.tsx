import React, { useState } from "react";
import { ExternalLink, LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import { services } from "../../../api/client/service-registry";
import { useVerification } from "../../../domains/verification/useVerification";
import { useToast } from "../../../app/providers/ToastProvider";

export interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  returnTo?: string;
}

export const IdentityVerificationModal: React.FC<
  IdentityVerificationModalProps
> = ({ isOpen, onClose, onSuccess, returnTo = "/compte/verification" }) => {
  const { currentUser, refreshUser } = useVerification();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const begin = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const session = await services.verification.startIdentitySession({
        userId: currentUser.id,
        dimension: "identity",
        jurisdiction: currentUser.country || "FR",
        returnTo,
      });
      refreshUser?.();
      onSuccess?.();
      toast.success("Vérification lancée", "Votre progression est enregistrée.");
      onClose();
      if (session.redirectUrl && session.redirectUrl !== returnTo) {
        window.location.assign(session.redirectUrl);
      }
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de lancer la vérification pour le moment.",
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
      title="Vérifier votre identité"
      description="Cette étape apparaît uniquement lorsqu’une action exige une preuve d’identité."
      headerIcon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-surface text-success">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-bold text-stone-900">Pourquoi</dt>
              <dd className="mt-1 text-stone-600">
                Débloquer l’action demandée, sans vérifier le reste du compte.
              </dd>
            </div>
            <div>
              <dt className="font-bold text-stone-900">Traitement</dt>
              <dd className="mt-1 text-stone-600">
                Un prestataire spécialisé contrôle le document dans un espace sécurisé.
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex gap-3 text-sm text-stone-600">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          <p>
            Shongre conserve le résultat et une référence technique, pas les images
            de votre pièce dans votre profil.
          </p>
        </div>

        {error ? (
          <p role="alert" className="rounded-xl bg-danger-surface p-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Plus tard
          </Button>
          <Button onClick={begin} isLoading={isLoading}>
            Continuer chez le prestataire
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};
