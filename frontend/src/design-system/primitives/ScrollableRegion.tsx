import React from "react";
import { cn } from "../utils/variants";

export interface ScrollableRegionProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "aria-label"
> {
  "aria-label": string;
}

/**
 * Keyboard-reachable horizontal overflow boundary for dense tables and rails.
 *
 * `contain: layout paint` keeps a wide child from contributing its intrinsic
 * width to the document while preserving scrolling inside this region. This is
 * especially important for nested workspace layouts in Chromium, where an
 * 800px table can otherwise widen a 320px document despite `overflow-x:auto`.
 */
export const ScrollableRegion = React.forwardRef<
  HTMLDivElement,
  ScrollableRegionProps
>(({ className, style, children, ...props }, ref) => (
  <div
    ref={ref}
    role="region"
    tabIndex={0}
    className={cn(
      "scrollable-region max-w-full overflow-x-auto overscroll-contain",
      className,
    )}
    style={style}
    {...props}
  >
    {children}
  </div>
));
ScrollableRegion.displayName = "ScrollableRegion";
