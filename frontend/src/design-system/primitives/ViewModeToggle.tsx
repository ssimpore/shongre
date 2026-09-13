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
  /** Explicit capability list for verticals that do not support every mode. */
  modes?: readonly ListingViewMode[];
  className?: string;
  size?: "sm" | "md";
}

export const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  viewMode,
  onChange,
  showMap = false,
  modes,
  className = "",
  size = "md",
}) => {
  const isSm = size === "sm";
  const iconClassName = isSm ? "h-icon-sm w-icon-sm" : "h-icon-md w-icon-md";
  const supportedModes =
    modes ?? (showMap ? ["grid", "list", "map"] : ["grid", "list"]);

  return (
    <div
      role="group"
      aria-label="Mode d'affichage des annonces"
      className={`inline-flex items-center ${
        isSm ? "h-control-sm" : "h-control-md"
      } bg-bg-muted/90 border border-border-base ${CONTROL_RADIUS_CLASS} p-0.5 shadow-2xs shrink-0 select-none ${className}`}
    >
      {supportedModes.includes("grid") ? (
        <ViewModeButton
          label="Affichage grille"
          active={viewMode === "grid"}
          onClick={() => onChange("grid")}
          size={size}
        >
          <LayoutGrid className={iconClassName} />
          <span className="hidden sm:inline">Grille</span>
        </ViewModeButton>
      ) : null}

      {supportedModes.includes("list") ? (
        <ViewModeButton
          label="Affichage liste"
          active={viewMode === "list"}
          onClick={() => onChange("list")}
          size={size}
        >
          <List className={iconClassName} />
          <span className="hidden sm:inline">Liste</span>
        </ViewModeButton>
      ) : null}

      {supportedModes.includes("map") ? (
        <ViewModeButton
          label="Affichage carte"
          active={viewMode === "map"}
          onClick={() => onChange("map")}
          size={size}
        >
          <MapIcon className={iconClassName} />
          <span className="hidden sm:inline">Carte</span>
        </ViewModeButton>
      ) : null}
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
      "h-full flex items-center gap-1.5 font-semibold cursor-pointer",
      size === "md"
        ? "px-2 text-xs sm:px-3 sm:text-sm"
        : "px-1.5 text-micro sm:px-2 sm:text-xs",
      CONTROL_MOTION_CLASS,
      CONTROL_FOCUS_CLASS,
      active
        ? "rounded-lg bg-primary text-on-primary shadow-xs"
        : "rounded-sm bg-transparent text-text-secondary hover:text-text-main hover:bg-bg-surface/70",
    )}
  >
    {children}
  </button>
);
