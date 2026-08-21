/**
 * Shared geometry for every ordinary interactive control.
 *
 * Components choose a semantic density; they never recreate 32/40/44/48px or
 * the control radius locally. Card-like selectors, tabs and circular icon
 * affordances remain separate patterns because their geometry has a different
 * purpose.
 */
export type ControlSize = 'sm' | 'compact' | 'md' | 'lg';

export const CONTROL_RADIUS_CLASS = 'rounded-control';

/** Shared interaction recipes for ordinary controls. */
export const CONTROL_MOTION_CLASS = 'motion-interactive';
export const CONTROL_FOCUS_CLASS =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** Shared compact geometry for horizontal rail navigation controls. */
export const RAIL_CONTROL_CLASS = 'h-control-sm w-control-sm';
export const RAIL_CONTROL_ICON_CLASS = 'h-icon-sm w-icon-sm';

export const controlHeightClasses: Record<ControlSize, string> = {
  sm: 'h-control-sm',
  compact: 'h-control-md',
  md: 'h-control-touch',
  lg: 'h-control-lg',
};

export const controlMinHeightClasses: Record<ControlSize, string> = {
  sm: 'min-h-control-sm',
  compact: 'min-h-control-md',
  md: 'min-h-control-touch',
  lg: 'min-h-control-lg',
};
