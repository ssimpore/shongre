import React, { useId } from "react";
import {
  ArrowRight,
  User,
  Briefcase,
  CreditCard,
  Crown,
  MessageCircle,
  ShieldCheck,
  Store,
  FileText,
  Tags,
} from "lucide-react";
import { ProBadge } from "@shongre/ui/web";
import { Button } from "../../../design-system/primitives/Button";
import { AccountType } from "../../../types";
import { useTranslation } from "../../../i18n/I18nProvider";

export interface AccountTypeSelectorProps {
  selectedType: Exclude<AccountType, "staff">;
  onChange: (type: Exclude<AccountType, "staff">) => void;
  onContinue?: (type: Exclude<AccountType, "staff">) => void;
  layout?: "stacked" | "columns";
}

export const AccountTypeSelector: React.FC<AccountTypeSelectorProps> = ({
  selectedType,
  onChange,
  onContinue,
  layout = "stacked",
}) => {
  const { t } = useTranslation();
  const groupId = useId();
  const options = [
    {
      type: "professional",
      title: t("auth.frame.professional"),
      Icon: Briefcase,
      description: t(
        "auth.accountTypeSelector.pourLesEntreprisesArtisansBoutiques",
      ),
      benefits: [
        {
          Icon: ShieldCheck,
          label: t("auth.accountTypeSelector.badgeOfficielVendeurProVerifie"),
        },
        {
          Icon: Store,
          label: t("auth.accountTypeSelector.vitrineDeBoutiquePersonnalisable"),
        },
        {
          Icon: FileText,
          label: t("auth.accountTypeSelector.facturationAutomatiqueAvecTva"),
        },
      ],
      recommended: true,
    },
    {
      type: "individual",
      title: t("auth.frame.individual"),
      Icon: User,
      description: t("auth.accountTypeSelector.pourAcheterEnTouteSecurite"),
      benefits: [
        {
          Icon: Tags,
          label: t("auth.accountTypeSelector.depotDAnnoncesGratuitEt"),
        },
        {
          Icon: CreditCard,
          label: t("auth.accountTypeSelector.paiementSecuriseAvecSequestre"),
        },
        {
          Icon: MessageCircle,
          label: t("auth.accountTypeSelector.messagerieInstantaneeDirecte"),
        },
      ],
      recommended: false,
    },
  ] as const;
  return (
    <div
      className={`grid grid-cols-1 items-stretch gap-4 ${layout === "columns" ? "mx-auto w-full max-w-xl md:grid-cols-2" : ""}`}
    >
      {options.map(
        ({ type, title, Icon, description, benefits, recommended }) => (
          <div
            key={type}
            data-account-type={type}
            className={`relative flex h-full flex-col rounded-2xl border p-5 ${selectedType === type ? "motion-interactive border-primary bg-primary-surface-faint shadow-md shadow-primary-shadow" : "surface-interactive border-border-base bg-bg-surface shadow-sm"}`}
          >
            <input
              id={`${groupId}-${type}-input`}
              type="radio"
              name={groupId}
              value={type}
              checked={selectedType === type}
              onChange={() => onChange(type)}
              aria-labelledby={`${groupId}-${type}`}
              className="peer absolute right-5 top-5 z-raised h-6 w-6 cursor-pointer opacity-0"
            />
            <label
              htmlFor={`${groupId}-${type}-input`}
              className="flex flex-1 cursor-pointer flex-col peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-60"
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-bg-surface ${selectedType === type ? "border-primary" : "border-text-muted"}`}
              >
                {selectedType === type && (
                  <span className="h-3.5 w-3.5 rounded-full bg-primary" />
                )}
              </span>
              <span className="mb-3 flex min-h-12 items-start gap-3 pr-8">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${selectedType === type ? "bg-primary text-on-primary shadow-sm" : "bg-surface-muted text-text-main"}`}
                >
                  <Icon className="h-icon-xl w-icon-xl" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
                  {recommended && (
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-pill border border-primary-border bg-primary-surface-soft px-2.5 py-1 text-xs font-extrabold text-text-main">
                        <Crown
                          className="h-icon-sm w-icon-sm text-primary"
                          aria-hidden="true"
                        />
                        {t("auth.accountTypeSelector.recommended")}
                      </span>
                      <ProBadge
                        label={t("ui.identityStatus.pro.short")}
                        accessibilityLabel={title}
                        size="md"
                      />
                    </span>
                  )}
                  <span
                    id={`${groupId}-${type}`}
                    className="text-xl font-extrabold text-text-main sm:text-2xl"
                  >
                    {title}
                  </span>
                </span>
              </span>
              <span className="mb-3 text-sm leading-relaxed text-text-muted">
                {description}
              </span>
              <span className="grid gap-2 border-t border-border-soft pt-3 text-sm leading-snug text-text-emphasis">
                {benefits.map(({ Icon: BenefitIcon, label }) => (
                  <span key={label} className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${type === "professional" ? "bg-primary-surface-soft text-primary" : "bg-surface-muted text-text-main"}`}
                      aria-hidden="true"
                    >
                      <BenefitIcon
                        className="h-icon-md w-icon-md"
                        strokeWidth={2}
                      />
                    </span>
                    <span>{label}</span>
                  </span>
                ))}
              </span>
            </label>
            {onContinue ? (
              <Button
                type="button"
                variant={selectedType === type ? "primary" : "outline"}
                size="md"
                className="mt-4 w-full"
                aria-label={`${t("auth.accountTypeSelector.selectProfile")} : ${title}`}
                onClick={() => {
                  onChange(type);
                  onContinue(type);
                }}
                rightIcon={
                  <ArrowRight
                    className="h-icon-lg w-icon-lg shrink-0"
                    aria-hidden="true"
                  />
                }
              >
                {t("auth.accountTypeSelector.selectProfile")}
              </Button>
            ) : null}
          </div>
        ),
      )}
    </div>
  );
};
