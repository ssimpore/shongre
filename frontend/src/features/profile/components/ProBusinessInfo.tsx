import React from "react";
import {
  Building2,
  Clock,
  MapPin,
  Truck,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { UserProfile } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface ProBusinessInfoProps {
  seller: UserProfile;
}

export const ProBusinessInfo: React.FC<ProBusinessInfoProps> = ({ seller }) => {
  const { t } = useTranslation();
  if (seller.sellerType !== "pro") return null;

  return (
    <div className="space-y-6">
      {/* Legal & Company Identity Card */}
      <div className="bg-white rounded-2xl border border-border-base p-5 sm:p-7 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-border-subtle">
          <Building2 className="w-5 h-5 text-primary" />
          <h3 className="text-base font-black text-stone-900">
            {t("profile.proBusinessInfo.mentionsLegalesInformationsEntreprise")}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-bg-base p-3 rounded-xl border border-border-base">
            <span className="text-stone-500 font-medium block text-xs">
              Raison sociale
            </span>
            <span className="font-bold text-stone-900 text-xs sm:text-sm">
              {seller.companyName || seller.name}
            </span>
          </div>

          <div className="bg-bg-base p-3 rounded-xl border border-border-base">
            <span className="text-stone-500 font-medium block text-xs">
              Forme juridique
            </span>
            <span className="font-bold text-stone-900 text-xs sm:text-sm">
              {seller.legalForm || "Entreprise commerciale"}
            </span>
          </div>

          <div className="bg-bg-base p-3 rounded-xl border border-border-base">
            <span className="text-stone-500 font-medium block text-xs">
              {t("profile.proBusinessInfo.numeroSiret")}
            </span>
            <span className="font-bold font-mono text-stone-900 text-xs sm:text-sm">
              {seller.siret || seller.sirenSiret || "Non renseigné"}
            </span>
          </div>

          {seller.vatNumber && (
            <div className="bg-bg-base p-3 rounded-xl border border-border-base">
              <span className="text-stone-500 font-medium block text-xs">
                N° TVA Intracommunautaire
              </span>
              <span className="font-bold font-mono text-stone-900 text-xs sm:text-sm">
                {seller.vatNumber}
              </span>
            </div>
          )}

          {seller.businessAddress && (
            <div className="bg-bg-base p-3 rounded-xl border border-border-base sm:col-span-2">
              <span className="text-stone-500 font-medium block text-xs">
                {t("profile.proBusinessInfo.adresseDuSiegeBoutique")}
              </span>
              <span className="font-bold text-stone-900 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                {seller.businessAddress}
              </span>
            </div>
          )}

          {seller.websiteUrl && (
            <div className="bg-bg-base p-3 rounded-xl border border-border-base">
              <span className="text-stone-500 font-medium block text-xs">
                Site internet officiel
              </span>
              <a
                href={seller.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-primary hover:underline flex items-center gap-1 mt-0.5"
              >
                <span>{seller.websiteUrl.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Opening Hours & Services Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours & Physical Shop */}
        <div className="bg-white rounded-2xl border border-border-base p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
            <Clock className="w-4 h-4 text-stone-700" />
            <h4 className="text-sm font-black text-stone-900">
              Horaires & Accueil en boutique
            </h4>
          </div>

          {seller.storeOpeningHours ? (
            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-success" />
                <span className="font-bold text-stone-900">
                  Boutique physique ouverte
                </span>
              </div>
              <p className="p-3 bg-bg-base rounded-xl border border-border-base font-medium leading-relaxed">
                {seller.storeOpeningHours}
              </p>
            </div>
          ) : (
            <p className="text-xs text-stone-500">
              {t("profile.proBusinessInfo.venteExclusiveEnLigneAvec")}
            </p>
          )}

          {/* Delivery zones */}
          <div className="mt-4 pt-3 border-t border-border-subtle">
            <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5 mb-2">
              <Truck className="w-3.5 h-3.5 text-stone-500" />
              {t("profile.proBusinessInfo.zonesDeLivraisonCouvertes")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(seller.deliveryZones && seller.deliveryZones.length > 0
                ? seller.deliveryZones
                : ["France métropolitaine"]
              ).map((zone) => (
                <span
                  key={zone}
                  className="text-xs font-semibold text-stone-700 bg-bg-base px-2.5 py-1 rounded-lg border border-border-base"
                >
                  {zone}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Guarantees & Commitments */}
        <div className="bg-white rounded-2xl border border-border-base p-5 sm:p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border-subtle">
            <ShieldCheck className="w-4 h-4 text-success" />
            <h4 className="text-sm font-black text-stone-900">
              Engagements & Services professionnels
            </h4>
          </div>

          <div className="space-y-2.5 text-xs text-stone-700">
            {/* Return Policy */}
            <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-success-surface/50 border border-success-border">
              <RotateCcw className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-success block">
                  {t("profile.proBusinessInfo.droitDeRetractation")}
                </span>
                <span className="text-success text-xs">
                  {seller.returnPolicy ||
                    "14 jours francs pour retourner l'article conformément au Code de la consommation."}
                </span>
              </div>
            </div>

            {/* Custom Services */}
            {seller.services && seller.services.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-stone-500 font-semibold block text-xs">
                  {t("profile.proBusinessInfo.servicesInclusParCeVendeur")}
                </span>
                {seller.services.map((srv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-stone-800"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{srv}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2 text-stone-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {t("profile.proBusinessInfo.factureAvecTvaSurDemande")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {t("profile.proBusinessInfo.garantieLegaleDeConformite2")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>
                    {t(
                      "profile.proBusinessInfo.emballageProfessionnelRenforce",
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
