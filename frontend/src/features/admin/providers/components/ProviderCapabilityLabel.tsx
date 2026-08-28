import React from "react";
import type { ProviderCapability } from "../../../../domains/providers/provider.types";
import {
  getCapabilityMetadata,
  getCategoryMetadata,
} from "../../../../domains/providers/provider-capabilities";
import { useTranslation } from "../../../../i18n/I18nProvider";

interface ProviderCapabilityLabelProps {
  capability: ProviderCapability;
  showCategory?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Canonical presentation for a provider capability.
 *
 * Provider keys such as `payment.card` remain useful to administrators, but a
 * raw key must never be mistaken for the user-facing name. This component keeps
 * the registry label, explicitly captioned technical code and optional domain
 * badge together across every provider administration surface.
 */
export const ProviderCapabilityLabel: React.FC<
  ProviderCapabilityLabelProps
> = ({ capability, showCategory = false, compact = false, className = "" }) => {
  const { t } = useTranslation();
  const metadata = getCapabilityMetadata(capability);
  const category = getCategoryMetadata(metadata.category);

  return (
    <div className={`min-w-0 ${className}`}>
      <span
        className={`block font-bold leading-tight text-current ${
          compact ? "text-micro" : "text-xs"
        }`}
      >
        {metadata.name}
      </span>
      {/* Hierarchy here comes from size and weight, not opacity. `text-current/70`
          alpha-blended the inherited colour into its own surface — on the green
          "implémentée" chip that put the technical code at 2.84:1, a serious
          WCAG failure on the one line an administrator has to read character by
          character. */}
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-micro text-current">
        <span className="font-semibold">
          {t("admin.providerCapabilityLabel.codeCapacite")}
        </span>
        <code className="font-mono">{capability}</code>
        {showCategory && (
          <span
            className={`inline-flex rounded border px-1.5 py-0.5 font-bold ${category.badgeClass}`}
          >
            {category.shortLabel}
          </span>
        )}
      </div>
    </div>
  );
};
