import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
import { Button } from "./Button";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export type FilterPanelPresentation = "surface" | "drawer";

export type FilterPanelTogglePresentation = "desktop" | "drawer";

export interface FilterPanelToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  controls: string;
  presentation?: FilterPanelTogglePresentation;
  activeCount?: number;
  className?: string;
}

export interface FilterPanelProps {
  id?: string;
  children: React.ReactNode;
  title?: string;
  onReset?: () => void;
  resetLabel?: string;
  presentation?: FilterPanelPresentation;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/**
 * Shared visibility control for filter sidebars and their mobile drawers.
 *
 * Search features own their filter state and domain fields; this primitive
 * keeps the disclosure language, accessible state, iconography, and responsive
 * styling consistent across every results page.
 */
export const FilterPanelToggle: React.FC<FilterPanelToggleProps> = ({
  isExpanded,
  onToggle,
  controls,
  presentation = "desktop",
  activeCount = 0,
  className,
}) => {
  const { t } = useTranslation();
  const isDrawer = presentation === "drawer";
  const accessibleLabel = isDrawer
    ? t("ui.filterPanel.open")
    : isExpanded
      ? t("ui.filterPanel.hide")
      : t("ui.filterPanel.show");

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      onClick={onToggle}
      aria-controls={controls}
      aria-expanded={isExpanded}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        "shrink-0 gap-2 shadow-sm",
        isDrawer ? "inline-flex lg:hidden" : "hidden lg:inline-flex",
        (isExpanded || activeCount > 0) &&
          "border-primary-border bg-primary-surface-soft hover:bg-primary-light",
        className,
      )}
    >
      {/* Keep the visible label stable; aria-expanded announces disclosure. */}
      <SlidersHorizontal className="h-icon-md w-icon-md" aria-hidden="true" />
      <span className={isDrawer ? "sr-only sm:not-sr-only" : undefined}>
        {t("ui.filterPanel.filters")}
      </span>
      {activeCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-surface px-1 text-micro font-bold text-text-main">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
};

/**
 * Canonical shell for marketplace filters.
 *
 * Domain pages own their category-specific fields and URL state; this
 * primitive owns the repeated panel surface, heading, reset action, spacing,
 * and drawer adaptation.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  id,
  children,
  title = "Filtres",
  onReset,
  resetLabel = "Réinitialiser",
  presentation = "surface",
  footer,
  className,
  contentClassName,
}) => {
  const isDrawer = presentation === "drawer";
  const resetAction = onReset ? (
    <button
      type="button"
      onClick={onReset}
      className={cn(
        "min-h-6 rounded-control text-xs font-semibold text-primary hover:underline",
        CONTROL_MOTION_CLASS,
        CONTROL_FOCUS_CLASS,
      )}
    >
      {resetLabel}
    </button>
  ) : null;

  return (
    <div
      id={id}
      data-filter-panel={presentation}
      className={cn(
        isDrawer
          ? "min-w-0"
          : "min-w-0 rounded-listing-card border border-border-base bg-bg-surface p-6 shadow-sm",
        className,
      )}
    >
      {isDrawer ? (
        resetAction ? (
          <div className="mb-5 flex justify-end">{resetAction}</div>
        ) : null
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
          <h2 className="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-main">
            <SlidersHorizontal
              className="h-icon-sm w-icon-sm shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate">{title}</span>
          </h2>
          {resetAction}
        </div>
      )}

      <div
        className={cn(
          "space-y-0 divide-y divide-border-subtle [&>*]:w-full [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0",
          !isDrawer && title && "mt-5",
          contentClassName,
        )}
      >
        {children}
      </div>

      {footer ? (
        <div className="sticky bottom-0 mt-6 border-t border-border-subtle bg-bg-surface pt-4 pb-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
};
