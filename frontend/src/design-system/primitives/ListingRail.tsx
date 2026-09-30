import React from "react";
import { ScrollRail } from "./ScrollRail";

export interface ListingRailProps {
  /** `ListingCard`s. Each is wrapped in the fixed-width, snapping rail cell. */
  children: React.ReactNode;
  heading?: React.ReactNode;
  action?: React.ReactNode;
  /** Accessible name for the scroll controls — normally the section heading. */
  label?: string;
  /** Extra classes for the scrolling track. */
  className?: string;
}

/**
 * Token-width cards share their row's natural height. The shared stylesheet
 * automatically gives compact and photo cards separate rows in mixed rails.
 * Other rails size independently, so content cannot stretch another section.
 *
 * The mobile bleed (`-mx-4 px-4`) is the shared homepage rail pattern — it
 * lets the row run to the screen edge on a phone
 * while staying inside the page gutter from `sm` up. It is measured by the
 * overflow suite as content inside a scroll container, so it does not count as
 * page overflow.
 *
 * Vertical padding is not decoration: `overflow-x` also clips vertically, and
 * without it the card's `hover:shadow-xl` and the boosted card's `ring-2` get
 * sheared off at the track edge. The larger bottom inset also reserves a clear
 * lane for the fine-pointer scrollbar so it never overlays a card footer.
 */
export const ListingRail: React.FC<ListingRailProps> = ({
  children,
  heading,
  action,
  label = "annonces",
  className = "",
}) => (
  <ScrollRail
    snap
    heading={heading}
    action={action}
    label={label}
    controlClassName="listing-rail-control top-1/2"
    className={`-mx-4 max-w-viewport-full px-4 pt-1.5 pb-4 sm:mx-0 sm:max-w-full sm:px-0 ${className}`}
  >
    <div className="listing-rail-track flex flex-nowrap items-stretch gap-3 sm:gap-4">
      {React.Children.map(children, (child) =>
        child == null ? null : (
          <div className="listing-rail-cell w-listing-card shrink-0 snap-start">
            {child}
          </div>
        ),
      )}
    </div>
  </ScrollRail>
);
