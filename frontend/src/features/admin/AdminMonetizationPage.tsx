import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { LISTING_BOOSTS } from "../../configuration/plans.config";
import { Button } from "../../design-system/primitives/Button";
import { useTranslation } from "../../i18n/I18nProvider";
import { usePageMeta } from "../../hooks/usePageMeta";

interface AdminPlanConfig {
  id: string;
  name: string;
  popular?: boolean;
  priceMonthly: number;
  maxActiveListings: number;
  commissionRate: number;
  features: {
    storefrontCustomization: boolean;
    prioritySupport: boolean;
    bulkImportExport: boolean;
  };
}

const INITIAL_PLANS: AdminPlanConfig[] = [
  {
    id: "pro_starter",
    name: "Pro Découverte",
    popular: false,
    priceMonthly: 29,
    maxActiveListings: 50,
    commissionRate: 3.5,
    features: {
      storefrontCustomization: true,
      prioritySupport: false,
      bulkImportExport: false,
    },
  },
  {
    id: "pro_business",
    name: "Pro Performance",
    popular: true,
    priceMonthly: 79,
    maxActiveListings: 250,
    commissionRate: 2.5,
    features: {
      storefrontCustomization: true,
      prioritySupport: true,
      bulkImportExport: true,
    },
  },
  {
    id: "pro_enterprise",
    name: "Pro Envergure",
    popular: false,
    priceMonthly: 199,
    maxActiveListings: 2000,
    commissionRate: 1.5,
    features: {
      storefrontCustomization: true,
      prioritySupport: true,
      bulkImportExport: true,
    },
  },
];

export const AdminMonetizationPage: React.FC = () => {
  const { t } = useTranslation();
  usePageMeta({
    title: t("meta.adminMonetization.title"),
    description: t("meta.adminMonetization.description"),
    canonicalPath: "/admin/monetisation",
    noIndex: true,
  });

  const [plans, setPlans] = useState<AdminPlanConfig[]>(INITIAL_PLANS);
  const [] = useState(LISTING_BOOSTS);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const handleSave = () => {
    setSaveSuccess("Paramètres tarifaires et forfaits Pro enregistrés.");
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("admin.adminMonetizationPage.revenusMonetisation")}
          </span>
          <span className="text-stone-300">•</span>
          <span className="text-xs text-stone-500 font-medium">
            {t("admin.adminMonetizationPage.gestionDesFormulesDAbonnement")}
          </span>
        </div>
        <h1 className="text-2xl font-black text-stone-900 tracking-tight">
          {t("admin.adminMonetizationPage.formulesProQuotasOptionsDe")}
        </h1>
        <p className="text-xs text-stone-600 mt-1">
          {t("admin.adminMonetizationPage.configurezLesQuotasDAnnonces")}
        </p>

        {saveSuccess && (
          <div className="mt-4 p-3 bg-success-surface border border-success-border text-success text-xs font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, idx) => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between ${
              plan.popular
                ? "border-primary ring-1 ring-primary"
                : "border-stone-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-stone-900">
                  {plan.name}
                </span>
                {plan.popular && (
                  <span className="text-micro bg-primary text-white font-bold px-2 py-1 rounded-full">
                    POPULAIRE
                  </span>
                )}
              </div>

              <div className="text-2xl font-black text-stone-900 mb-4">
                {plan.priceMonthly} €{" "}
                <span className="text-xs font-normal text-stone-500">
                  /mois
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label
                    htmlFor={`plan-${plan.id}-quota`}
                    className="block text-xs font-bold text-stone-600 mb-1"
                  >
                    {t("admin.adminMonetizationPage.quotaMaxDAnnoncesActives")}
                  </label>
                  <input
                    id={`plan-${plan.id}-quota`}
                    type="number"
                    value={plan.maxActiveListings}
                    onChange={(e) => {
                      const updated = [...plans];
                      updated[idx].maxActiveListings =
                        parseInt(e.target.value) || 0;
                      setPlans(updated);
                    }}
                    className="w-full text-xs p-2 border border-stone-200 rounded-control font-mono focus:ring-1 focus:ring-primary h-control-touch"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`plan-${plan.id}-commission`}
                    className="block text-xs font-bold text-stone-600 mb-1"
                  >
                    {t("admin.adminMonetizationPage.commissionSurVente")}
                  </label>
                  <input
                    id={`plan-${plan.id}-commission`}
                    type="number"
                    step="0.5"
                    value={plan.commissionRate}
                    onChange={(e) => {
                      const updated = [...plans];
                      updated[idx].commissionRate =
                        parseFloat(e.target.value) || 0;
                      setPlans(updated);
                    }}
                    className="w-full text-xs p-2 border border-stone-200 rounded-control font-mono focus:ring-1 focus:ring-primary h-control-touch"
                  />
                </div>

                {/* Features toggles */}
                <div className="pt-2 border-t border-stone-100 space-y-2 text-xs text-stone-700">
                  <label className="flex items-center gap-2 min-h-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.features.storefrontCustomization}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].features.storefrontCustomization =
                          e.target.checked;
                        setPlans(updated);
                      }}
                      className="w-4 h-4 shrink-0 rounded text-primary focus:ring-primary"
                    />
                    <span>
                      {t(
                        "admin.adminMonetizationPage.personnalisationVitrineBanniereStory",
                      )}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 min-h-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.features.prioritySupport}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].features.prioritySupport =
                          e.target.checked;
                        setPlans(updated);
                      }}
                      className="w-4 h-4 shrink-0 rounded text-primary focus:ring-primary"
                    />
                    <span>Support prioritaire sous 2h</span>
                  </label>

                  <label className="flex items-center gap-2 min-h-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.features.bulkImportExport}
                      onChange={(e) => {
                        const updated = [...plans];
                        updated[idx].features.bulkImportExport =
                          e.target.checked;
                        setPlans(updated);
                      }}
                      className="w-4 h-4 shrink-0 rounded text-primary focus:ring-primary"
                    />
                    <span>Import / Export CSV & API</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-stone-100">
              <Button
                size="sm"
                onClick={handleSave}
                className="w-full text-xs bg-stone-900 hover:bg-stone-800 text-white"
              >
                {t("admin.adminMonetizationPage.mettreAJour")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
