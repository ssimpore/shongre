import React from "react";
import { ProBadge } from "@shongre/ui/web";
import {
  User,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Store,
} from "lucide-react";
import { AccountType } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface AccountTypeSelectorProps {
  selectedType: Exclude<AccountType, "staff">;
  onChange: (type: Exclude<AccountType, "staff">) => void;
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedType,
  onChange,
}) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Individual Option */}
      <button
        type="button"
        onClick={() => onChange("individual")}
        className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
          selectedType === "individual"
            ? "border-primary bg-primary-surface-faint shadow-md ring-2 ring-primary-ring"
            : "border-border-disabled bg-bg-surface hover:border-border-prominent hover:bg-surface-soft/50"
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
              selectedType === "individual"
                ? "bg-primary text-text-inverse"
                : "bg-surface-muted text-text-emphasis"
            }`}
          >
            <User className="w-icon-lg h-icon-lg" />
          </div>

          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
              selectedType === "individual"
                ? "border-primary bg-primary text-text-inverse"
                : "border-border-prominent bg-bg-surface"
            }`}
          >
            {selectedType === "individual" && (
              <CheckCircle2 className="w-icon-md h-icon-md" />
            )}
          </div>
        </div>

        <span className="font-bold text-base text-text-deep mb-1">
          Particulier
        </span>
        <p className="text-xs text-text-supporting leading-relaxed mb-3">
          {t("auth.accountTypeSelector.pourAcheterEnTouteSecurite")}
        </p>

        <div className="mt-auto pt-3 border-t border-border-soft space-y-1.5 text-micro font-medium text-text-supporting">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-icon-sm h-icon-sm text-success shrink-0" />
            <span>{t("auth.accountTypeSelector.depotDAnnoncesGratuitEt")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-icon-sm h-icon-sm text-success shrink-0" />
            <span>
              {t("auth.accountTypeSelector.paiementSecuriseAvecSequestre")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-icon-sm h-icon-sm text-success shrink-0" />
            <span>
              {t("auth.accountTypeSelector.messagerieInstantaneeDirecte")}
            </span>
          </div>
        </div>
      </button>

      {/* Pro Option */}
      <button
        type="button"
        onClick={() => onChange("professional")}
        className={`relative flex flex-col p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
          selectedType === "professional"
            ? "border-primary bg-primary-surface-faint shadow-md ring-2 ring-primary-ring"
            : "border-border-disabled bg-bg-surface hover:border-border-prominent hover:bg-surface-soft/50"
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${
              selectedType === "professional"
                ? "bg-primary text-text-inverse"
                : "bg-surface-muted text-text-emphasis"
            }`}
          >
            <Briefcase className="w-icon-lg h-icon-lg" />
          </div>

          <div className="flex items-center gap-2">
            <ProBadge
              label={t("ui.identityStatus.pro.short")}
              accessibilityLabel={t("ui.identityStatus.pro.siret")}
            />
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                selectedType === "professional"
                  ? "border-primary bg-primary text-text-inverse"
                  : "border-border-prominent bg-bg-surface"
              }`}
            >
              {selectedType === "professional" && (
                <CheckCircle2 className="w-icon-md h-icon-md" />
              )}
            </div>
          </div>
        </div>

        <span className="font-bold text-base text-text-deep mb-1 flex items-center gap-1.5">
          Professionnel
        </span>
        <p className="text-xs text-text-supporting leading-relaxed mb-3">
          {t("auth.accountTypeSelector.pourLesEntreprisesArtisansBoutiques")}
        </p>

        <div className="mt-auto pt-3 border-t border-border-soft space-y-1.5 text-micro font-medium text-text-supporting">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-icon-sm h-icon-sm text-primary shrink-0" />
            <span>
              {t("auth.accountTypeSelector.badgeOfficielVendeurProVerifie")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Store className="w-icon-sm h-icon-sm text-primary shrink-0" />
            <span>
              {t("auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-icon-sm h-icon-sm text-primary shrink-0" />
            <span>
              {t("auth.accountTypeSelector.facturationAutomatiqueAvecTva")}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
};
