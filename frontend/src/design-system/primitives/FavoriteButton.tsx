import React from "react";
import { Heart } from "lucide-react";
import {
  CONTROL_FOCUS_CLASS,
  CONTROL_MOTION_CLASS,
} from "../utils/controlMetrics";

export type FavoriteButtonSize = "sm" | "md" | "lg";
export type FavoriteButtonVariant = "bare" | "floating";

export interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: (e: React.MouseEvent) => void;
  /** Visual size. The hit area stays at 44px regardless — see below. */
  size?: FavoriteButtonSize;
  /** `floating` sits on top of media and carries its own surface. */
  variant?: FavoriteButtonVariant;
  className?: string;
}

const ICON: Record<FavoriteButtonSize, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

/** The painted size of the control. Never grows — see `TOUCH_EXPANSION`. */
const BOX: Record<FavoriteButtonSize, string> = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-9 h-9",
};

/**
 * The 44px touch target, as a centred pseudo-element rather than a bigger box.
 *
 * Growing `BOX` itself on coarse pointers was tried first and it painted as
 * well as it measured: `variant="floating"` fills the box, so on a phone the
 * home rail's 24px heart became a 44px opaque disc anchored to the card's
 * top-right corner — sitting on top of the listing title, intercepting taps
 * meant for it, and reading as a design error rather than a control.
 *
 * Expanding a centred, transparent `::after` keeps the visual weight the design
 * asks for while the finger still gets 44px, and it grows in all four
 * directions instead of two. Where an ancestor clips it the target degrades to
 * the painted size, which is still at or above the 24px WCAG 2.2 AA floor.
 */
const TOUCH_EXPANSION =
  "pointer-coarse:after:content-[''] pointer-coarse:after:absolute " +
  "pointer-coarse:after:left-1/2 pointer-coarse:after:top-1/2 " +
  "pointer-coarse:after:-translate-x-1/2 pointer-coarse:after:-translate-y-1/2 " +
  "pointer-coarse:after:w-control-touch pointer-coarse:after:h-control-touch";

/**
 * `relative` establishes the containing block for the touch expansion above —
 * but it must not be emitted when the caller positions the control itself.
 *
 * Tailwind resolves conflicting utilities by stylesheet order, not by the order
 * they appear in the attribute, and `.relative` is emitted after `.absolute`.
 * So a hard-coded `relative` in the base string silently beat the
 * `absolute top-2.5 right-2.5` every overlay call site passes: all 28 hearts on
 * the homepage, and every one on a search-results grid card, computed to
 * `relative` and laid out in normal flow. Inside the card's `overflow-hidden`
 * media well that put the control fully outside the clip — 0px of it visible,
 * and nothing to tap — so listing cards shipped with no working favourite
 * control at all.
 */
const POSITIONED_BY_CALLER = /(?:^|\s)(?:absolute|fixed|sticky|static)(?:\s|$)/;

/**
 * The single favourite control.
 *
 * There were three hand-rolled versions of this: 32px and 36px in ListingCard,
 * and a 22px one in the homepage hero rail that filled the heart `rose-500`
 * while every other surface filled it `primary` — the same state in two colours,
 * on the same page.
 *
 * Two things are deliberate here:
 *
 * 1. **`primary` is the favourited colour**, everywhere. A saved item is a brand
 *    state, not a danger state, and it should not drift back to a red ramp.
 * 2. **The hit area is decoupled from the painted size.** Touch devices get a
 *    44px target (WCAG 2.5.5) from a centred pseudo-element, so a visually
 *    small heart in a dense rail is comfortably tappable without the control
 *    growing over its neighbours or shifting the layout.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  size = "md",
  variant = "bare",
  className = "",
}) => {
  const position = POSITIONED_BY_CALLER.test(className) ? "" : "relative";
  const surface =
    variant === "floating"
      ? "rounded-full bg-bg-surface/90 backdrop-blur-xs shadow-xs text-stone-600 hover:bg-bg-surface"
      : "rounded-full text-stone-500 hover:bg-stone-100";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`${position} flex items-center justify-center shrink-0 ${CONTROL_MOTION_CLASS} ${CONTROL_FOCUS_CLASS} hover:text-primary active:scale-90 cursor-pointer ${BOX[size]} ${TOUCH_EXPANSION} ${surface} ${className}`}
    >
      <Heart
        className={`${ICON[size]} ${isFavorite ? "fill-primary text-primary" : ""}`}
      />
    </button>
  );
};
