import React, { useEffect, useRef } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslation } from "../../i18n/I18nProvider";
import { cn } from "../utils/variants";
import { Button } from "./Button";
import { Drawer } from "./Modal";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export type FilterPanelTogglePresentation = "desktop" | "drawer";

export interface FilterPanelToggleProps {
  isExpanded: boolean;
  onToggle: () => void;
  controls: string;
  presentation?: FilterPanelTogglePresentation;
  activeCount?: number;
  label?: string;
  className?: string;
}

export interface FilterPanelProps {
  id?: string;
  children: React.ReactNode;
  onReset?: () => void;
  resetLabel?: string;
  footer?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  activeSectionId?: string;
}

export interface SearchFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Shared visibility control for the desktop quick-filter rail and compact
 * mobile filter action.
 *
 * Search features own their filter state and domain fields; this primitive
 * keeps disclosure language, accessible state, iconography, and responsive
 * visibility consistent across every results page.
 */
export const FilterPanelToggle: React.FC<FilterPanelToggleProps> = ({
  isExpanded,
  onToggle,
  controls,
  presentation = "desktop",
  activeCount = 0,
  label,
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
        {label || t("ui.filterPanel.filters")}
      </span>
      {activeCount > 0 ? (
        <span
          data-active-filter-count={activeCount}
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-micro font-bold text-on-primary shadow-xs"
        >
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
};

/**
 * Canonical content shell for the shared marketplace filter drawer.
 *
 * Domain pages own their category-specific fields and URL state; this
 * primitive owns the reset action, card spacing, targeted-section scrolling,
 * and apply footer.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  id,
  children,
  onReset,
  resetLabel = "Réinitialiser",
  footer,
  className,
  contentClassName,
  activeSectionId,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeSectionId) return;
    const content = contentRef.current;
    const target = content?.querySelector<HTMLElement>(
      `[data-filter-section="${activeSectionId}"]`,
    );
    const scrollContainer = content?.parentElement?.parentElement;
    if (!content || !target || !scrollContainer) return;
    scrollContainer.scrollTop = Math.max(
      0,
      target.offsetTop - content.offsetTop,
    );
  }, [activeSectionId]);
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
      data-filter-panel="drawer"
      className={cn("min-w-0", className)}
    >
      {resetAction ? (
        <div className="mb-5 flex justify-end">{resetAction}</div>
      ) : null}

      <div
        ref={contentRef}
        className={cn(
          "space-y-3 [&>*]:w-full [&>*]:scroll-mt-3 [&>*]:rounded-card [&>*]:border [&>*]:border-border-base [&>*]:bg-bg-surface [&>*]:p-4",
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

/**
 * One responsive search-filter surface for desktop, tablet, and mobile.
 *
 * Domain pages supply their own fields and URL state. This shell owns the
 * right-side sheet, reset/apply placement, and optional section targeting used
 * by the desktop quick-filter rail.
 */
export const SearchFilterDrawer: React.FC<SearchFilterDrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => (
  <Drawer
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    position="right"
    className={cn(
      "[&>div:first-child]:border-b-2 [&>div:first-child]:border-primary",
      className,
    )}
  >
    {children}
  </Drawer>
);
