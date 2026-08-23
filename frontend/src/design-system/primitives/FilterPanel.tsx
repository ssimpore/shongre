import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "../utils/variants";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export type FilterPanelPresentation = "surface" | "drawer";

export interface FilterPanelProps {
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
 * Canonical shell for marketplace filters.
 *
 * Domain pages own their category-specific fields and URL state; this
 * primitive owns the repeated panel surface, heading, reset action, spacing,
 * and drawer adaptation.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
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
        "min-h-6 rounded-control text-xs font-bold text-primary hover:underline",
        CONTROL_MOTION_CLASS,
        CONTROL_FOCUS_CLASS,
      )}
    >
      {resetLabel}
    </button>
  ) : null;

  return (
    <div
      data-filter-panel={presentation}
      className={cn(
        isDrawer
          ? "min-w-0"
          : "min-w-0 rounded-card border border-border-base bg-bg-surface p-6 shadow-sm",
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
          isDrawer || !title ? "space-y-5" : "mt-5 space-y-5",
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
