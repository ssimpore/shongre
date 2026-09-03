import React, { useEffect, useState } from "react";
import { Building2, CheckCircle2, Search, ShieldCheck } from "lucide-react";
import { services } from "../../../api/client/service-registry";
import type { KYBCompanyLookupResult } from "../../../api/contracts/verification.contract";
import { useToast } from "../../../app/providers/ToastProvider";
import { Button } from "../../../design-system/primitives/Button";
import { Modal } from "../../../design-system/primitives/Modal";
import { useVerification } from "../../../domains/verification/useVerification";

export interface BusinessVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BusinessVerificationModal: React.FC<
  BusinessVerificationModalProps
> = ({ isOpen, onClose, onSuccess }) => {
  const { currentUser, refreshUser } = useVerification();
  const toast = useToast();
  const [identifier, setIdentifier] = useState("");
  const [company, setCompany] = useState<KYBCompanyLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIdentifier(currentUser?.siret || currentUser?.sirenSiret || "");
    setCompany(null);
    setError(null);
  }, [currentUser?.siret, currentUser?.sirenSiret, isOpen]);

  if (!isOpen) return null;

  const lookup = async () => {
    const normalized = identifier.replace(/\s+/g, "");
    if (!normalized) {
      setError("Saisissez l’identifiant légal de votre entreprise.");
      return;
    }

    setIsLookingUp(true);
    setError(null);
    setCompany(null);
    try {
      const result =
        await services.verification.lookupCompanyBySiret(normalized);
      if (!result?.isActive) {
        setError(
          "Aucune entreprise active n’a été trouvée pour cet identifiant.",
        );
        return;
      }
      setCompany(result);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Le registre officiel est momentanément indisponible.",
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  const confirm = async () => {
    if (!currentUser || !company) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await services.verification.submitBusinessRegistration(
        currentUser.id,
        identifier.replace(/\s+/g, ""),
      );
      refreshUser?.();
      onSuccess?.();
      toast.success(
        "Entreprise identifiée",
        "La qualité du représentant sera contrôlée séparément si l’action le requiert.",
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’enregistrer cette vérification.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Vérifier l’entreprise"
      description="Shongre consulte le registre officiel et ne demande ici aucun document bancaire ou d’identité."
      headerIcon={
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning-surface text-warning">
          <Building2 className="h-icon-lg w-icon-lg" aria-hidden="true" />
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="business-registration-id"
            className="mb-1.5 block text-sm font-semibold text-stone-800"
          >
            SIRET ou SIREN
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="business-registration-id"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
                setCompany(null);
              }}
              inputMode="numeric"
              autoComplete="off"
              placeholder="732 829 320 00074"
              className="h-control-touch flex-1 rounded-control border border-stone-200 bg-white px-3.5 text-sm text-stone-900 focus:border-warning focus:outline-none"
            />
            <Button
              type="button"
              variant="outline"
              onClick={lookup}
              isLoading={isLookingUp}
              leftIcon={
                <Search className="h-icon-md w-icon-md" aria-hidden="true" />
              }
            >
              Consulter le registre
            </Button>
          </div>
        </div>

        {company ? (
          <div className="rounded-xl border border-success-border bg-success-surface p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-success"
                aria-hidden="true"
              />
              <div>
                <p className="font-bold text-stone-900">{company.name}</p>
                <p className="mt-1 text-sm text-stone-700">
                  {company.legalForm} · {company.postalCode} {company.city}
                </p>
                <p className="mt-1 text-xs text-stone-600">
                  Entreprise active dans le registre officiel.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-650">
          <ShieldCheck
            className="mt-0.5 h-icon-lg w-icon-lg shrink-0 text-success"
            aria-hidden="true"
          />
          <p>
            L’immatriculation, le représentant, les bénéficiaires effectifs et
            le compte de versement restent des contrôles distincts. Seuls ceux
            nécessaires à l’action demandée seront présentés.
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
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Plus tard
          </Button>
          <Button
            onClick={confirm}
            disabled={!company}
            isLoading={isSubmitting}
          >
            Confirmer cette entreprise
          </Button>
        </div>
      </div>
    </Modal>
  );
};
