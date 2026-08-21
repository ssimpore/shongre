import React from "react";
import { LayoutGrid, List, Map as MapIcon } from "lucide-react";
import { cn } from "../utils/variants";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
  CONTROL_RADIUS_CLASS,
} from "../utils/controlMetrics";

export type ListingViewMode = "grid" | "list" | "map";

export interface ViewModeToggleProps {
  viewMode: ListingViewMode;
  onChange: (mode: ListingViewMode) => void;
  showMap?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  showMap = false,
  className = "",
  size = "md",
}) => {
  const isSm = size === "sm";

  return (
    <div
      role="group"
      aria-label="Mode d'affichage des annonces"
      /* Pinned to the shared control heights rather than sized by its own
         padding. It rendered 28px while the filter button and the sort control
         beside it were 32px, so the toolbar had one item sitting 2px inset from
         its neighbours — visible as a stagger on every listing surface. */
      className={`inline-flex items-center ${
        isSm ? "h-control-sm" : "h-control-md"
      } bg-bg-muted/90 border border-border-base ${CONTROL_RADIUS_CLASS} p-0.5 shadow-2xs shrink-0 select-none ${className}`}
    >
      <ViewModeButton
        label="Affichage grille"
        active={viewMode === "grid"}
        onClick={() => onChange("grid")}
        size={size}
      >
        <LayoutGrid className="w-icon-sm h-icon-sm" />
        <span className="hidden sm:inline">Grille</span>
      </ViewModeButton>

      <ViewModeButton
        label="Affichage liste"
        active={viewMode === "list"}
        onClick={() => onChange("list")}
        size={size}
      >
        <List className="w-icon-sm h-icon-sm" />
        <span className="hidden sm:inline">Liste</span>
      </ViewModeButton>

      {showMap && (
        <ViewModeButton
          label="Affichage carte"
          active={viewMode === "map"}
          onClick={() => onChange("map")}
          size={size}
        >
          <MapIcon className="w-icon-sm h-icon-sm" />
          <span className="hidden sm:inline">Carte</span>
        </ViewModeButton>
      )}
    </div>
  );
};

interface ViewModeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  size: "sm" | "md";
  children: React.ReactNode;
}

const ViewModeButton: React.FC<ViewModeButtonProps> = ({
  label,
  active,
  onClick,
  size,
  children,
}) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={active}
    onClick={onClick}
    className={cn(
      "h-full flex items-center gap-1.5 font-bold cursor-pointer",
      "rounded-sm px-1.5 sm:px-2 text-micro sm:text-xs",
      CONTROL_MOTION_CLASS,
      CONTROL_FOCUS_CLASS,
      active
        ? "bg-primary text-white shadow-xs"
        : "bg-transparent text-stone-600 hover:text-stone-900 hover:bg-bg-surface/70",
      size === "md" && "sm:px-2.5",
    )}
  >
    {children}
  </button>
);
