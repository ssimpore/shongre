import React from "react";
import { PanelLeftClose, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
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
    <button
      type="button"
      onClick={onToggle}
      aria-controls={controls}
      aria-expanded={isExpanded}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className={cn(
        "shrink-0 cursor-pointer items-center gap-1.5 rounded-control text-xs font-semibold uppercase tracking-wider",
        CONTROL_MOTION_CLASS,
        CONTROL_FOCUS_CLASS,
        isDrawer
          ? "inline-flex h-control-sm px-2.5 sm:px-3 lg:hidden"
          : "hidden px-2 py-1 lg:inline-flex",
        activeCount > 0 && isDrawer
          ? "bg-primary text-text-inverse shadow-xs"
          : isDrawer
            ? "border border-border-base bg-bg-surface text-text-main hover:bg-bg-subtle"
            : isExpanded
              ? "border border-border-base bg-bg-base text-text-emphasis hover:bg-bg-subtle"
              : "border border-transparent text-text-main hover:text-primary",
        className,
      )}
    >
      {isExpanded && !isDrawer ? (
        <PanelLeftClose
          className="h-icon-sm w-icon-sm text-text-tertiary"
          aria-hidden="true"
        />
      ) : (
        <SlidersHorizontal
          className={cn(
            "h-icon-sm w-icon-sm",
            activeCount > 0 && isDrawer ? "text-text-inverse" : "text-primary",
          )}
          aria-hidden="true"
        />
      )}
      <span>
        {isExpanded && !isDrawer
          ? t("ui.filterPanel.hideShort")
          : t("ui.filterPanel.filters")}
      </span>
      {activeCount > 0 && isDrawer ? (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-bg-surface px-1 text-micro font-bold text-primary">
          {activeCount}
        </span>
      ) : null}
    </button>
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
