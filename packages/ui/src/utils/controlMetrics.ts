export type ControlSize = "sm" | "compact" | "md" | "lg";

export const CONTROL_RADIUS_CLASS = "rounded-control";
export const CONTROL_MOTION_CLASS = "motion-interactive";
export const CONTROL_PRESS_CLASS =
  "active:scale-press-control active:shadow-inner motion-reduce:active:scale-100 disabled:active:scale-100 disabled:active:shadow-none aria-disabled:active:scale-100 aria-disabled:active:shadow-none";
export const CONTROL_FOCUS_CLASS =
  "focus:outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
export const RAIL_CONTROL_CLASS = "h-control-sm w-control-sm";
export const RAIL_CONTROL_ICON_CLASS = "h-icon-sm w-icon-sm";

export const controlHeightClasses: Record<ControlSize, string> = {
  sm: "h-control-sm",
  compact: "h-control-md",
  md: "h-control-touch",
  lg: "h-control-lg",
};

export const controlMinHeightClasses: Record<ControlSize, string> = {
  sm: "min-h-control-sm",
  compact: "min-h-control-md",
  md: "min-h-control-touch",
  lg: "min-h-control-lg",
};
