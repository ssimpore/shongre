import { activeDataLocale } from "../../i18n/localized";
import { TaxonomyLabelMode, TaxonomyLabelOptions } from "./taxonomy.types";

/**
 * Label resolution for taxonomy nodes.
 *
 * Lives apart from the service because both the service *and* the canonical data
 * module need it: the data module projects the legacy `Category[]` shape and has
 * to localise while doing so, and the service imports that data. Keeping the
 * resolver in the service made those two import each other, and at module-init
 * one of them was still undefined — four suites failed with `Cannot read
 * properties of undefined`. A pure function with no state belongs in neither.
 */
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

  /* Falls back to the visitor's locale, not to French.
     The node data already carries `labels['en-US']`, and this resolver already
     knew how to read it — but the default was hard-coded to `fr-FR`, so every
     caller that did not pass a locale explicitly (which is nearly all of them)
     rendered the French label regardless of the interface language. The
     translations were present and unreachable. */
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

  // 3. Legacy flat projections do not always carry localized maps.
  if (isCompact && node.shortLabel && typeof node.shortLabel === "string") {
    const directShort = node.shortLabel.trim();
    if (directShort.length > 0) return directShort;
  }

  // 4. Final canonical compatibility fallback.
  const canonical = (node.label ?? node.name ?? "").trim();
  return canonical;
}
