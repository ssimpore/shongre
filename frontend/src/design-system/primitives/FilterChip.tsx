import React from "react";
import { X } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export interface FilterChipProps {
  /** Human-readable filter value, e.g. `Véhicules` or `"vélo gravel"`. */
  children: React.ReactNode;
  /**
   * What kind of filter this represents. Only used to tint the chip so a user
   * can tell apart a query, a category and a transactional facet at a glance —
   * it carries no business meaning.
   */
  tone?: "query" | "neutral" | "strong" | "success" | "warning";
  /**
   * Called when the user removes the filter. Omit for read-only chips.
   * The remove control is always given an accessible name derived from `label`.
   */
  onRemove?: () => void;
  /**
   * Short description of what is being removed, used to build the accessible
   * name of the remove button ("Retirer le filtre Véhicules").
   */
  label?: string;
  className?: string;
}

const TONE_STYLES: Record<NonNullable<FilterChipProps["tone"]>, string> = {
  query: "bg-primary-light text-primary border-primary-border",
  neutral: "bg-stone-100 text-stone-800 border-stone-200",
  strong: "bg-stone-900 text-white border-stone-900",
  success: "bg-success-surface text-success border-success-border",
  warning: "bg-warning-surface text-warning border-warning-border",
};

/**
 * Compact, removable representation of one active filter.
 *
 * Replaces the hand-rolled `<span class="rounded-full">…<button><X/></button>`
 * blocks that were repeated across search, workspace and admin filter bars —
 * those all shipped remove buttons with no accessible name.
 */
export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  tone = "neutral",
  onRemove,
  label,
  className = "",
}) => {
  const { t } = useTranslation();

  return (
    <span
      className={`inline-flex items-center gap-1 max-w-full text-xs font-semibold pl-2.5 ${
        onRemove ? "pr-1" : "pr-2.5"
      } py-1 rounded-full border ${TONE_STYLES[tone]} ${className}`}
    >
      <span className="truncate">{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t("common.removeFilter", {
            name: label ?? (typeof children === "string" ? children : ""),
          }).trim()}
          /* The glyph stays 12px so the chip keeps its size, but the control
             itself must clear the 24px WCAG 2.5.8 floor — it was 16x16. The
             negative margin lets the larger box overlap the chip's padding
             instead of widening every chip on the page, and coarse pointers get
             the full 44px target. */
          className={`shrink-0 w-6 h-6 -my-1 -mr-1 pointer-coarse:w-control-touch pointer-coarse:h-control-touch inline-flex items-center justify-center rounded-full ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:bg-black/10 cursor-pointer`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
