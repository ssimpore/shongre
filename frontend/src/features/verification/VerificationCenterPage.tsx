import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  CreditCard,
  FileKey2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  ComplianceAction,
  ComplianceRequirementDecision,
  VerificationDimension,
} from "@shongre/contracts/compliance";
import { Button } from "../../design-system/primitives/Button";
import { services } from "../../api/client/service-registry";
import { useVerification } from "../../domains/verification/useVerification";
import type {
  VerificationDimensionId,
  VerificationRequirement,
} from "../../domains/verification/verification.types";
import { IdentityVerificationModal } from "./components/IdentityVerificationModal";
import { BusinessVerificationModal } from "./components/BusinessVerificationModal";
import { BankPayoutModal } from "./components/BankPayoutModal";
import { PhoneVerificationModal } from "../auth/components/PhoneVerificationModal";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useToast } from "../../app/providers/ToastProvider";
import { useMarketLocation } from "../../app/providers/MarketLocationProvider";

const ACTION_LABELS: Record<ComplianceAction, string> = {
  browse: "Parcourir Shongre",
  create_account: "Créer votre compte",
  save_favorite: "Enregistrer un favori",
  message_seller: "Contacter un vendeur",
  publish_listing: "Publier votre annonce",
  publish_professional_listing: "Publier en tant que professionnel",
  promote_listing: "Promouvoir votre annonce",
  create_organization: "Créer votre organisation",
  accept_online_payment: "Accepter les paiements en ligne",
  receive_payout: "Recevoir un versement",
  complete_tax_due_diligence: "Compléter les informations fiscales applicables",
};

const DIMENSION_LABELS: Record<VerificationDimension, string> = {
  email: "Adresse email",
  phone: "Téléphone",
  identity: "Identité",
  age: "Âge",
  address: "Adresse",
  business: "Entreprise",
  business_representative: "Représentant de l’entreprise",
  beneficial_owner: "Bénéficiaire effectif",
  tax: "Informations fiscales",
  vat: "Numéro de TVA",
  bank_account: "Compte de versement",
  payout: "Versements",
  payment: "Paiements",
  professional_status: "Statut vendeur",
  document: "Document justificatif",
  risk: "Contrôle de sécurité",
  enhanced_review: "Examen complémentaire",
  mfa: "Double authentification",
};

const ACTIONS = new Set<ComplianceAction>(
  Object.keys(ACTION_LABELS) as ComplianceAction[],
);

function dimensionIcon(id: VerificationDimensionId) {
  const className = "h-5 w-5";
  switch (id) {
    case "email":
      return <Mail className={className} aria-hidden="true" />;
    case "phone":
      return <Smartphone className={className} aria-hidden="true" />;
    case "identity":
      return <FileKey2 className={className} aria-hidden="true" />;
    case "business":
      return <Building2 className={className} aria-hidden="true" />;
    case "bank_payout":
      return <CreditCard className={className} aria-hidden="true" />;
    case "mfa":
      return <LockKeyhole className={className} aria-hidden="true" />;
  }
}

function statePresentation(state: VerificationRequirement["state"]) {
  if (state === "verified")
    return {
      label: "Vérifié",
      className: "bg-success-surface text-success border-success-border",
      icon: <CheckCircle2 className="h-4 w-4" aria-hidden="true" />,
    };
  if (state === "pending")
    return {
      label: "En cours",
      className: "bg-warning-surface text-warning border-warning-border",
      icon: <Clock3 className="h-4 w-4" aria-hidden="true" />,
    };
  if (state === "rejected" || state === "requires_action")
    return {
      label: "Action requise",
      className: "bg-danger-surface text-danger border-danger-border",
      icon: <CircleAlert className="h-4 w-4" aria-hidden="true" />,
    };
  return {
    label: "Non nécessaire pour le moment",
    className: "bg-stone-100 text-stone-600 border-stone-200",
    icon: null,
  };
}

export const VerificationCenterPage: React.FC = () => {
  usePageMeta({
    title: "Vérifications et confiance | Shongre",
    description: "Gérez uniquement les vérifications utiles à vos actions.",
    canonicalPath: "/compte/verification",
    noIndex: true,
  });
  const navigate = useNavigate();
  const toast = useToast();
  const { activeMarket } = useMarketLocation();
  const [searchParams] = useSearchParams();
  const { currentUser, dimensions, refreshUser } = useVerification();
  const [activeModal, setActiveModal] =
    useState<VerificationDimensionId | null>(null);
  const [decision, setDecision] =
    useState<ComplianceRequirementDecision | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const actionParam = searchParams.get("action") as ComplianceAction | null;
  const requestedAction =
    actionParam && ACTIONS.has(actionParam) ? actionParam : null;
  const returnTo = useMemo(() => {
    const candidate = searchParams.get("returnTo") || "/compte";
    return candidate.startsWith("/") && !candidate.startsWith("//")
      ? candidate
      : "/compte";
  }, [searchParams]);

  const evaluate = useCallback(async () => {
    if (!currentUser || !requestedAction) {
      setDecision(null);
      return;
    }
    setIsEvaluating(true);
    setEvaluationError(null);
    try {
      setDecision(
        await services.verification.getVerificationRequirements(
          currentUser.id,
          {
            requestedAction,
            jurisdiction: currentUser.country || activeMarket.countryCode,
            marketCode: activeMarket.code,
            transactionContext:
              requestedAction === "receive_payout" ||
              requestedAction === "accept_online_payment"
                ? {
                    transactionType: "direct_purchase",
                    contractConclusionMode: "platform",
                    paymentFlow: "psp_marketplace",
                    currency: activeMarket.currency,
                  }
                : undefined,
          },
        ),
      );
    } catch (cause) {
      setEvaluationError(
        cause instanceof Error
          ? cause.message
          : "Impossible d’évaluer les vérifications nécessaires.",
      );
    } finally {
      setIsEvaluating(false);
    }
  }, [activeMarket, currentUser, requestedAction]);

  useEffect(() => {
    void evaluate();
  }, [evaluate, dimensions]);

  const visibleDimensionIds = useMemo(() => {
    const ids = new Set<VerificationDimensionId>(["email"]);
    if (
      dimensions.phone.state !== "not_started" ||
      decision?.required.includes("phone") ||
      decision?.recommended.includes("phone")
    )
      ids.add("phone");
    if (
      dimensions.mfa.state !== "not_started" ||
      decision?.required.includes("mfa") ||
      decision?.recommended.includes("mfa")
    )
      ids.add("mfa");
    if (
      currentUser?.accountType === "professional" ||
      dimensions.business.state !== "not_started"
    )
      ids.add("business");
    if (
      dimensions.identity.state !== "not_started" ||
      decision?.required.includes("identity") ||
      decision?.recommended.includes("identity")
    )
      ids.add("identity");
    if (
      dimensions.bank_payout.state !== "not_started" ||
      decision?.required.some((id) => id === "bank_account" || id === "payout")
    )
      ids.add("bank_payout");
    return [...ids];
  }, [currentUser?.accountType, decision, dimensions]);

  const openRequirement = async (dimension: VerificationDimension) => {
    if (
      dimension === "identity" ||
      dimension === "age" ||
      dimension === "address"
    )
      setActiveModal("identity");
    else if (
      dimension === "business" ||
      dimension === "business_representative" ||
      dimension === "professional_status" ||
      dimension === "beneficial_owner" ||
      dimension === "vat" ||
      dimension === "document"
    )
      setActiveModal("business");
    else if (
      dimension === "bank_account" ||
      dimension === "payout" ||
      dimension === "payment"
    )
      setActiveModal("bank_payout");
    else if (dimension === "phone") setActiveModal("phone");
    else if (dimension === "mfa") navigate("/compte/securite-compte#mfa");
    else if (dimension === "email") navigate("/verification-email");
    else if (dimension === "risk" || dimension === "enhanced_review") {
      if (!currentUser) return;
      try {
        await services.verification.requestManualReview({
          userId: currentUser.id,
          dimension,
        });
        toast.success("Demande de revue enregistrée.");
        await evaluate();
      } catch (cause) {
        toast.error(
          cause instanceof Error
            ? cause.message
            : "Impossible de demander une revue pour le moment.",
        );
      }
    }
  };

  const completeAndRefresh = () => {
    refreshUser?.();
    void evaluate();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success-surface text-success">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-success">
              Vérifications et confiance
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-stone-950 sm:text-3xl">
              Juste ce qu’il faut, au bon moment
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Vous pouvez parcourir Shongre sans contrôle d’identité. Une étape
              supplémentaire apparaît seulement lorsqu’elle est nécessaire pour
              l’action que vous demandez.
            </p>
          </div>
        </div>
      </section>

      {requestedAction ? (
        <section
          aria-labelledby="requested-action-title"
          className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Action en cours
              </p>
              <h2
                id="requested-action-title"
                className="mt-1 text-xl font-black text-stone-950"
              >
                {ACTION_LABELS[requestedAction]}
              </h2>
            </div>
            {decision?.allowed ? (
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-success-border bg-success-surface px-3 py-1 text-xs font-bold text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Prêt à
                continuer
              </span>
            ) : null}
          </div>

          {isEvaluating ? (
            <p className="mt-4 text-sm text-stone-600" role="status">
              Vérification des exigences applicables…
            </p>
          ) : evaluationError ? (
            <p
              className="mt-4 rounded-xl bg-danger-surface p-3 text-sm text-danger"
              role="alert"
            >
              {evaluationError}
            </p>
          ) : decision ? (
            <div className="mt-5 space-y-4">
              {decision.allowed ? (
                <div className="rounded-xl border border-success-border bg-success-surface p-4 text-sm text-stone-700">
                  Votre compte dispose déjà du niveau suffisant. Aucune autre
                  donnée ne vous est demandée.
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-stone-600">
                    Il reste {decision.missing.length} étape
                    {decision.missing.length > 1 ? "s" : ""} pour cette action :
                  </p>
                  {decision.missing.map((dimension) => (
                    <button
                      type="button"
                      key={dimension}
                      onClick={() => void openRequirement(dimension)}
                      disabled={decision.pending.includes(dimension)}
                      className="flex w-full items-center justify-between rounded-xl border border-stone-200 p-3 text-left transition-colors hover:border-stone-300 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-success"
                    >
                      <span>
                        <span className="block text-sm font-bold text-stone-900">
                          {DIMENSION_LABELS[dimension]}
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500">
                          {decision.pending.includes(dimension)
                            ? "Vérification en cours — les autres fonctions restent disponibles."
                            : `Requise uniquement pour ${ACTION_LABELS[requestedAction].toLowerCase()}.`}
                        </span>
                      </span>
                      <ChevronRight
                        className="h-5 w-5 text-stone-400"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              )}

              {decision.legalReviewRequired ? (
                <div className="rounded-xl border border-warning-border bg-warning-surface p-4 text-sm text-stone-700">
                  <strong>LEGAL_REVIEW_REQUIRED :</strong> l’applicabilité
                  exacte de cette obligation doit être confirmée avant de la
                  rendre bloquante.
                </div>
              ) : null}

              {decision.allowed ? (
                <Button onClick={() => navigate(returnTo)}>
                  Reprendre mon action
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="account-checks-title" className="space-y-3">
        <div>
          <h2
            id="account-checks-title"
            className="text-lg font-black text-stone-950"
          >
            État de votre compte
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Seules les vérifications déjà utiles ou recommandées sont affichées.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {visibleDimensionIds.map((id) => {
            const requirement = dimensions[id];
            const presentation = statePresentation(requirement.state);
            const canOpen = requirement.state !== "verified" && id !== "email";
            return (
              <article
                key={id}
                className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                    {dimensionIcon(id)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-stone-950">
                      {requirement.shortLabel}
                    </h3>
                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${presentation.className}`}
                    >
                      {presentation.icon}
                      {presentation.label}
                    </span>
                    {requirement.rejectionReason ? (
                      <p className="mt-2 text-xs text-danger">
                        {requirement.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                </div>
                {canOpen ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => setActiveModal(id)}
                  >
                    {requirement.state === "rejected"
                      ? "Réessayer"
                      : requirement.actionLabel || "Configurer"}
                  </Button>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <p className="rounded-xl bg-stone-100 p-4 text-xs leading-relaxed text-stone-600">
        Les documents d’identité et informations bancaires sont traités dans les
        espaces sécurisés des prestataires concernés. Les badges publics
        n’affichent jamais vos documents, numéros fiscaux, données bancaires ou
        signaux de risque.
      </p>

      <IdentityVerificationModal
        isOpen={activeModal === "identity"}
        onClose={() => setActiveModal(null)}
        onSuccess={completeAndRefresh}
        returnTo={`/compte/verification?action=${requestedAction || "browse"}&returnTo=${encodeURIComponent(returnTo)}`}
      />
      <BusinessVerificationModal
        isOpen={activeModal === "business"}
        onClose={() => setActiveModal(null)}
        onSuccess={completeAndRefresh}
      />
      <BankPayoutModal
        isOpen={activeModal === "bank_payout"}
        onClose={() => setActiveModal(null)}
        onSuccess={completeAndRefresh}
        returnTo={`/compte/verification?action=${requestedAction || "receive_payout"}&returnTo=${encodeURIComponent(returnTo)}`}
      />
      {currentUser ? (
        <PhoneVerificationModal
          userId={currentUser.id}
          initialPhone={currentUser.phone}
          isOpen={activeModal === "phone"}
          onClose={() => setActiveModal(null)}
          onSuccess={completeAndRefresh}
        />
      ) : null}
    </div>
  );
};
