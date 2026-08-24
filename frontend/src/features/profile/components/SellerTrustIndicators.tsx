import React from "react";
import { CheckCircle2, Clock, Info, ShieldCheck, Truck } from "lucide-react";
import { isProSeller } from "../../../domains/user/user.domain";
import type { UserProfile } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface SellerTrustIndicatorsProps {
  seller: UserProfile;
}

/** Public, narrowly scoped signals. This component never produces a trust score. */
export const SellerTrustIndicators: React.FC<SellerTrustIndicatorsProps> = ({
  seller,
}) => {
  const { t } = useTranslation();
  const isPro = isProSeller(seller);
  const isIdentityVerified = seller.identityVerification?.status === "verified";
  const isBusinessVerified =
    seller.professionalVerification?.status === "verified";
  const hasConfirmedContact = seller.isEmailVerified || seller.isPhoneVerified;
  const primarySignal =
    isPro && isBusinessVerified
      ? {
          title: "Entreprise vérifiée",
          description: "L’immatriculation professionnelle a été contrôlée.",
        }
      : isIdentityVerified
        ? {
            title: "Identité vérifiée",
            description: "L’identité du titulaire du compte a été contrôlée.",
          }
        : hasConfirmedContact
          ? {
              title: "Coordonnée confirmée",
              description:
                "Au moins un moyen de contact du compte a été confirmé.",
            }
          : {
              title: "Aucun signal supplémentaire",
              description:
                "Aucune vérification publique supplémentaire n’est affichée.",
            };

  return (
    <section className="rounded-3xl border border-stone-200/60 bg-stone-50 p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
        <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">
          Informations et signaux vérifiés
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <article className="flex items-start gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-2xs">
          <div className="shrink-0 rounded-xl bg-success-surface p-2 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="mb-0.5 font-bold text-stone-900">
              {primarySignal.title}
            </h3>
            <p className="text-xs leading-relaxed text-stone-500">
              {primarySignal.description}
            </p>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-2xs">
          <div className="shrink-0 rounded-xl bg-info-surface p-2 text-info">
            <Info className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="mb-0.5 font-bold text-stone-900">
              Options par annonce
            </h3>
            <p className="text-xs leading-relaxed text-stone-500">
              Paiement, livraison et retrait dépendent de chaque annonce.
            </p>
          </div>
        </article>

        <article className="flex items-start gap-3 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-2xs">
          <div className="shrink-0 rounded-xl bg-warning-surface p-2 text-warning">
            <Truck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="mb-0.5 font-bold text-stone-900">
              {t("profile.sellerTrustIndicators.livraisonRetrait")}
            </h3>
            <p className="text-xs leading-relaxed text-stone-500">
              {t("profile.sellerTrustIndicators.remiseEnMainPropreOu")}
            </p>
          </div>
        </article>
      </div>

      <div className="mt-4 flex gap-2 rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
        <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          Taux de réponse : {seller.responseRatePercent ?? 0}%{" "}
          {seller.responseTimeText || ""}. Ces signaux décrivent des contrôles
          précis ; ils ne garantissent ni le vendeur ni le produit.
        </p>
      </div>
    </section>
  );
};
