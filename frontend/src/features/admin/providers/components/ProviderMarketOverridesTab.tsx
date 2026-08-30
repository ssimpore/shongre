import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  Provider,
  ProviderConfiguration,
  ProviderMarketOverride,
  PROVIDER_CONFIGURATION_CONSTRAINTS,
} from "../../../../domains/providers/provider.types";
import { providerService } from "../../../../domains/providers/provider.service";
import { Button } from "../../../../design-system/primitives/Button";
import { useToast } from "../../../../app/providers/ToastProvider";
import { useTranslation } from "../../../../i18n/I18nProvider";
import { labelIdentifier } from "../../../../utilities/identifier-label";
import { useMarketLocation } from "../../../../app/providers/MarketLocationProvider";

interface ProviderMarketOverridesTabProps {
  provider: Provider;
  configuration: ProviderConfiguration;
  onUpdated: () => void;
}

export const ProviderMarketOverridesTab: React.FC<
  ProviderMarketOverridesTabProps
> = ({ provider, configuration, onUpdated }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { activeMarket, availableMarkets } = useMarketLocation();
  const defaultMarket =
    availableMarkets.find((market) => market.isDefault) || activeMarket;
  const nonDefaultMarkets = availableMarkets.filter(
    (market) => market.code !== defaultMarket.code,
  );
  const [selectedMarket, setSelectedMarket] = useState<string>(
    nonDefaultMarkets[0]?.code || activeMarket.code,
  );

  const currentOverride: ProviderMarketOverride | undefined =
    configuration.marketOverrides?.[selectedMarket];
  const isOverridden = Boolean(currentOverride);

  // Local form state for the selected market
  const [overrideEnabled, setOverrideEnabled] = useState<boolean>(
    currentOverride?.enabled ?? configuration.enabled,
  );
  const [overridePriority, setOverridePriority] = useState<number>(
    currentOverride?.priority ?? configuration.priority,
  );
  const [customNotes, setCustomNotes] = useState<string>(
    currentOverride?.customNotes || "",
  );

  const handleSelectMarket = (code: string) => {
    setSelectedMarket(code);
    const ov = configuration.marketOverrides?.[code];
    setOverrideEnabled(ov?.enabled ?? configuration.enabled);
    setOverridePriority(ov?.priority ?? configuration.priority);
    setCustomNotes(ov?.customNotes || "");
  };

  const handleSaveOverride = async () => {
    try {
      await providerService.setMarketOverride(provider.id, selectedMarket, {
        enabled: overrideEnabled,
        priority: Number(overridePriority),
        customNotes,
      });
      toast.success(`Affectation enregistrée pour ${selectedMarket}.`);
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement.");
    }
  };

  const handleResetOverride = async () => {
    try {
      await providerService.resetMarketOverride(provider.id, selectedMarket);
      toast.success(
        `Affectation supprimée. ${provider.name} est désormais indisponible sur ${selectedMarket} tant qu'aucune nouvelle affectation n'est enregistrée.`,
      );
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réinitialisation.");
    }
  };

  const isMarketSupported =
    provider.supportedMarkets.includes("*") ||
    provider.supportedMarkets.includes(selectedMarket);

  return (
    <div className="space-y-6">
      {/* 1. Country Selection Bar */}
      <div className="bg-bg-surface p-4 rounded-control border border-stone-200 shadow-xs">
        <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
          {t("admin.providerMarketOverridesTab.selectionnezLeMarcheAInspecter")}
        </label>
        <div className="flex flex-wrap gap-2">
          {nonDefaultMarkets.map((m) => {
            const hasOverride = Boolean(
              configuration.marketOverrides?.[m.code],
            );
            const isSelected = selectedMarket === m.code;

            return (
              <button
                type="button"
                key={m.code}
                onClick={() => handleSelectMarket(m.code)}
                className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all ${
                  isSelected
                    ? "bg-primary text-text-inverse border-primary shadow-xs"
                    : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                }`}
              >
                <span>{m.flag}</span>
                <span>{m.name}</span>
                {hasOverride && (
                  <span
                    className={`text-micro px-1 rounded ${
                      isSelected
                        ? "bg-bg-surface/20 text-text-inverse"
                        : "bg-info-surface text-info"
                    }`}
                  >
                    {t("admin.providerMarketOverridesTab.affecte")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Side-by-side default-market comparison vs target assignment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Default-market comparison card */}
        <div className="bg-stone-50/80 p-5 rounded-control border border-stone-200 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <span>{defaultMarket.flag}</span> {defaultMarket.name} {t("admin.providerMarketOverridesTab.marcheParDefaut")}
            </span>
            <span className="text-micro font-bold bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
              {t("admin.providerMarketOverridesTab.baseDHeritage")}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-stone-200/50">
              <span className="text-stone-500">Statut d'activation :</span>
              <span className="font-bold text-text-main">
                {configuration.enabled ? "Activé (En ligne)" : "Désactivé"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200/50">
              <span className="text-stone-500">
                {t("admin.providerMarketOverridesTab.prioriteDeRoutage")}
              </span>
              <span className="font-bold text-text-main font-mono">
                P{configuration.priority}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Environnement :</span>
              <span className="font-bold text-text-main uppercase font-mono">
                {labelIdentifier(configuration.environment)}
              </span>
            </div>
          </div>
          <p className="text-micro text-stone-500 italic pt-2">
            {t("admin.providerMarketOverridesTab.valeursAfficheesUniquementATitreDeComparaisonEllesNeSe")}
          </p>
        </div>

        {/* Target Market Assignment Card */}
        <div
          className={`p-5 rounded-control border shadow-xs space-y-4 ${
            isOverridden
              ? "bg-info-surface/30 border-info-border"
              : "bg-bg-surface border-stone-200"
          }`}
        >
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <span className="text-xs font-black text-text-main flex items-center gap-1.5">
              <span>
                {nonDefaultMarkets.find((m) => m.code === selectedMarket)?.flag}
              </span>
              {nonDefaultMarkets.find((m) => m.code === selectedMarket)?.name} (
              {selectedMarket})
            </span>

            {isOverridden ? (
              <span className="text-micro font-bold bg-info-surface text-info border border-info-border px-2 py-0.5 rounded">
                {t(
                  "admin.providerMarketOverridesTab.configurationPersonnalisee",
                )}
              </span>
            ) : (
              <span className="text-micro font-semibold bg-stone-100 text-text-secondary px-2 py-0.5 rounded">
                {t("admin.providerMarketOverridesTab.aucuneAffectation")}
              </span>
            )}
          </div>

          {!isMarketSupported && (
            <div className="p-3 bg-warning-surface border border-warning-border rounded-lg text-xs text-warning">
              {t("admin.providerMarketOverridesTab.attentionLePrestataire")} {provider.name} {t("admin.providerMarketOverridesTab.neSupportePasOfficiellementLePays")} {selectedMarket}.
            </div>
          )}

          <div className="space-y-3">
            {/* Custom Enable Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-bg-surface">
              <span className="text-xs font-bold text-stone-800">
                {t("admin.providerMarketOverridesTab.activeDansCePays")}
              </span>
              <input
                type="checkbox"
                checked={overrideEnabled}
                onChange={(e) => setOverrideEnabled(e.target.checked)}
                className="rounded border-stone-300 text-primary focus:ring-primary h-4 w-4"
              />
            </div>

            {/* Custom Priority */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-stone-200 bg-bg-surface">
              <span className="text-xs font-bold text-stone-800">
                {t("admin.providerMarketOverridesTab.prioriteLocale")}
              </span>
              <input
                type="number"
                min={PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min}
                max={PROVIDER_CONFIGURATION_CONSTRAINTS.priority.max}
                step={PROVIDER_CONFIGURATION_CONSTRAINTS.priority.step}
                value={overridePriority}
                onChange={(e) =>
                  setOverridePriority(
                    Number.parseInt(e.target.value, 10) ||
                      PROVIDER_CONFIGURATION_CONSTRAINTS.priority.min,
                  )
                }
                className="w-20 py-1 px-2 text-xs rounded border border-stone-200 font-bold text-stone-800 text-center h-control-touch"
              />
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {t("admin.providerMarketOverridesTab.noteDeConformiteOuMotif")}
              </label>
              <input
                type="text"
                value={customNotes}
                placeholder={t(
                  "admin.providerMarketOverridesTab.exTransporteurDedieZoneFrontaliere",
                )}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full py-1.5 px-2.5 text-xs rounded border border-stone-200 bg-bg-surface h-control-touch"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-stone-200">
            {isOverridden ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetOverride}
                leftIcon={<RotateCcw className="w-icon-sm h-icon-sm" />}
                className="text-xs text-danger hover:bg-danger-surface"
              >
                Supprimer l'affectation
              </Button>
            ) : (
              <span className="text-xs text-stone-500 italic">
                {t("admin.providerMarketOverridesTab.aucuneSurchargeDefinie")}
              </span>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveOverride}
              className="text-xs font-bold"
            >
              {t("admin.providerMarketOverridesTab.appliquerLaSurcharge")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
