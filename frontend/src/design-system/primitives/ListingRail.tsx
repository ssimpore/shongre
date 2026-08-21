import React from "react";
import { ScrollRail } from "./ScrollRail";

export interface ListingRailProps {
  /** `ListingCard`s. Each is wrapped in the fixed-width, snapping rail cell. */
  children: React.ReactNode;
  /** Accessible name for the scroll controls — normally the section heading. */
  label?: string;
  /** Extra classes for the scrolling track. */
  className?: string;
}

/**
 * The one way listings are laid out: a single row that scrolls sideways.
 *
 * Every listing surface used to size its cards from a grid column, so the same
 * card was 286px on the home, 189px in "Reprendre ou vous en etiez", 276px in
 * "Meilleures offres" and something else again in search — a different object
 * on every screen. The width now comes from `--spacing-listing-card` instead of
 * from whatever column the card happens to land in, which is what makes one row
 * possible: a rail has no columns to inherit from.
 *
 * The mobile bleed (`-mx-4 px-4`) is the house pattern from
 * `HomeCategoryExplorer` — it lets the row run to the screen edge on a phone
 * while staying inside the page gutter from `sm` up. It is measured by the
 * overflow suite as content inside a scroll container, so it does not count as
 * page overflow.
 *
 * Vertical padding is not decoration: `overflow-x` also clips vertically, and
 * without it the card's `hover:shadow-xl` and the boosted card's `ring-2` get
 * sheared off at the track edge.
 */
export const ListingRail: React.FC<ListingRailProps> = ({
  children,
  label = "annonces",
  className = "",
}) => (
  <ScrollRail
    snap
    label={label}
    className={`-mx-4 px-4 sm:mx-0 sm:px-0 py-1.5 ${className}`}
  >
    <div className="flex flex-nowrap items-stretch gap-3 sm:gap-4">
      {React.Children.map(children, (child) =>
        child == null ? null : (
          <div className="w-listing-card shrink-0 snap-start">{child}</div>
        ),
      )}
    </div>
  </ScrollRail>
);
