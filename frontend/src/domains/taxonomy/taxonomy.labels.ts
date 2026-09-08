import { activeDataLocale } from "../../i18n/localized";
import { TaxonomyLabelMode, TaxonomyLabelOptions } from "./taxonomy.types";

/** Localizes API projections without importing taxonomy content. */
export function getTaxonomyLabel(
  node?: {
    label?: string;
    name?: string;
    shortLabel?: string;
    labels?: Record<string, string>;
    shortLabels?: Record<string, string>;
  } | null,
  modeOrOptions: TaxonomyLabelMode | TaxonomyLabelOptions = "full",
): string {
  if (!node) return "";

  const isCompact =
    typeof modeOrOptions === "string"
      ? modeOrOptions === "compact"
      : Boolean(modeOrOptions.compact);

  const locale =
    typeof modeOrOptions === "object" && modeOrOptions.locale
      ? modeOrOptions.locale
      : activeDataLocale();

  if (isCompact) {
    // 1. Localized shortLabel if available.
    if (node.shortLabels && node.shortLabels[locale]) {
      const locShort = node.shortLabels[locale].trim();
      if (locShort.length > 0) return locShort;
    }
  }

  // 2. Fall back to the canonical label in the requested locale. A French
  // compatibility mirror must never leak into another locale simply because
  // that locale does not yet define a compact form.
  if (node.labels && node.labels[locale]) {
    const locFull = node.labels[locale].trim();
    if (locFull.length > 0) return locFull;
  }

  // 3. Compact projections do not always carry localized maps.
  if (isCompact && node.shortLabel && typeof node.shortLabel === "string") {
    const directShort = node.shortLabel.trim();
    if (directShort.length > 0) return directShort;
  }

  // 4. Final display label.
  const canonical = (node.label ?? node.name ?? "").trim();
  return canonical;
}
